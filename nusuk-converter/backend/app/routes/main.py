# backend/app/routes/main.py
import os
import uuid
import stripe
import io
import shutil
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_file, session as flask_session
from werkzeug.utils import secure_filename
# Les imports Supabase ont été retirés
from ..models import db, Session, ProcessedFile
from scripts.optimiseur_image import optimiser_image

bp = Blueprint('main', __name__)

AMOUNTS_IN_CENTS = {
    'eur': 120,
    'usd': 130
}

@bp.route('/create-session', methods=['POST'])
def create_session():
    try:
        new_session = Session()
        db.session.add(new_session)
        db.session.commit()
        flask_session['user_session_id'] = new_session.id
        current_app.logger.info(f"Nouvelle session créée ({new_session.id}) et liée au cookie utilisateur.")
        return jsonify({"session_id": new_session.id}), 201
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la création de la session: {e}", exc_info=True)
        return jsonify({"code": "session_creation_failed", "message": "Impossible de créer une session."}), 500


@bp.route('/process-image', methods=['POST'])
def process_image():
    """Traite une image, l'optimise, et la stocke LOCALEMENT sur le serveur."""
    session_id = request.form.get('session_id')
    
    secure_session_id = flask_session.get('user_session_id')
    if not session_id or (secure_session_id and secure_session_id != session_id):
        current_app.logger.warning(f"Tentative d'accès non autorisé à la session {session_id} (cookie: {secure_session_id})")
        return jsonify({"code": "unauthorized_session_access", "message": "Accès à la session non autorisé."}), 403

    session = Session.query.get(session_id)
    if not session:
        return jsonify({"code": "invalid_session", "message": "Session invalide ou expirée."}), 404
    
    if 'file' not in request.files:
        return jsonify({"code": "no_file_provided", "message": "Aucun fichier n'a été fourni."}), 400
    file = request.files['file']
    doc_type = request.form.get('doc_type')
    if file.filename == '' or not doc_type:
        return jsonify({"code": "missing_parameters", "message": "Fichier ou doc_type manquant."}), 400
    
    try:
        # Lecture du fichier entrant
        input_bytes = file.read()
        if doc_type in ['photo', 'residence']:
            params = {'max_largeur': 200, 'max_hauteur': 200, 'max_taille_mo': 1}
        else:
            # Sinon (c'est un passeport) -> 400x800
            params = {'max_largeur': 400, 'max_hauteur': 800, 'max_taille_mo': 1}        
        # Optimisation via fichier temporaire dans /tmp
        temp_output_path = f"/tmp/{uuid.uuid4()}.jpg"
        processed_path = optimiser_image(io.BytesIO(input_bytes), temp_output_path, **params)
        if not processed_path:
            raise Exception("L'optimisation de l'image a échoué.")

        with open(processed_path, 'rb') as f:
            processed_data = f.read()
        os.remove(temp_output_path) # Nettoyage du fichier temporaire

        # --- LOGIQUE DE STOCKAGE LOCAL ---
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
        new_file_name = f"{doc_type}_{timestamp}_optimise.jpg"
        
        # Création du chemin relatif pour la BDD (ex: "uuid-session/photo_timestamp.jpg")
        # On garde la même structure que Supabase pour faciliter une migration future si besoin
        relative_path = f"{session.id}/{new_file_name}"
        
        # Définition du dossier physique sur le disque
        processed_root = current_app.config.get('PROCESSED_FOLDER')
        if not processed_root:
            raise Exception("La configuration PROCESSED_FOLDER est manquante.")
            
        local_session_dir = os.path.join(processed_root, session.id)
        os.makedirs(local_session_dir, exist_ok=True) # Crée le dossier s'il n'existe pas
        
        full_local_path = os.path.join(local_session_dir, new_file_name)
        
        # Écriture du fichier sur le disque (écrase si existe, ce qui simplifie la logique d'update)
        with open(full_local_path, 'wb') as f:
            f.write(processed_data)
            
        current_app.logger.info(f"Fichier sauvegardé localement : {full_local_path}")

        # --- MISE À JOUR BDD ---
        existing_file = ProcessedFile.query.filter_by(session_id=session.id, doc_type=doc_type).first()
        
        if existing_file:
            # Optionnel : Supprimer l'ancien fichier physique pour ne pas encombrer le disque
            old_full_path = os.path.join(processed_root, existing_file.path)
            if os.path.exists(old_full_path) and existing_file.path != relative_path:
                try:
                    os.remove(old_full_path)
                except OSError:
                    pass # On ignore si l'ancien fichier n'existe pas
            
            existing_file.path = relative_path
            existing_file.name = new_file_name
            current_app.logger.info(f"Enregistrement du fichier mis à jour en BDD pour la session {session_id}")
        else:
            new_file = ProcessedFile(
                id=str(uuid.uuid4()),
                doc_type=doc_type,
                path=relative_path,
                name=new_file_name,
                session_id=session.id
            )
            db.session.add(new_file)
            current_app.logger.info(f"Nouveau fichier enregistré en BDD pour la session {session_id}")
        
        db.session.commit()
        
        return jsonify({"message": "Le fichier a été traité avec succès."}), 201

    except Exception as e:
        current_app.logger.error(f"Erreur finale lors du traitement de l'image pour session {session_id}: {e}", exc_info=True)
        return jsonify({"code": "image_processing_failed", "message": "Le traitement de l'image a échoué."}), 500
    
    
@bp.route('/session-status/<session_id>', methods=['GET'])
def get_session_status(session_id):
    """Vérifie le statut d'une session, notamment le nombre de fichiers traités."""
    session = Session.query.get(session_id)
    
    if not session:
        current_app.logger.warning(f"Tentative de vérification de statut pour une session inexistante: {session_id}")
        return jsonify({"code": "session_not_found", "message": "La session n'a pas été trouvée."}), 404
    
    processed_files = ProcessedFile.query.filter_by(session_id=session.id).all()
    processed_count = len(processed_files)
    doc_types = [f.doc_type for f in processed_files]
    
    current_app.logger.info(f"Statut demandé pour la session {session_id}: {processed_count} fichier(s) traité(s). Types: {doc_types}")
    
    return jsonify({
        "processed_count": processed_count, 
        "paid": session.paid,
        "doc_types": doc_types
    }), 200

@bp.route('/download/<session_id>/<file_id>', methods=['GET'])
def download_file(session_id, file_id):
    """Permet le téléchargement d'un fichier depuis le stockage LOCAL."""
    secure_session_id = flask_session.get('user_session_id')
    if not secure_session_id or secure_session_id != session_id:
        current_app.logger.warning(f"Tentative de téléchargement non autorisé pour la session {session_id} (cookie: {secure_session_id})")
        return jsonify({"code": "unauthorized_session_access", "message": "Accès à la session non autorisé."}), 403

    session = Session.query.get(session_id)
    if not session or not session.paid:
        return jsonify({"code": "session_invalid_or_unpaid", "message": "Session invalide ou paiement non effectué."}), 403

    file_to_download = ProcessedFile.query.filter_by(id=file_id, session_id=session.id).first()
    
    if not file_to_download:
        current_app.logger.warning(f"Tentative de téléchargement d'un enregistrement de fichier non trouvé: {file_id} pour session {session_id}")
        return jsonify({"code": "file_record_not_found", "message": "Enregistrement du fichier non trouvé."}), 404

    try:
        processed_root = current_app.config.get('PROCESSED_FOLDER')
        if not processed_root:
            raise Exception("Configuration PROCESSED_FOLDER manquante.")

        # Reconstruction du chemin complet
        full_path = os.path.join(processed_root, file_to_download.path)
        
        if not os.path.exists(full_path):
            current_app.logger.error(f"Fichier physique introuvable sur le disque : {full_path}")
            return jsonify({"code": "file_not_found_on_disk", "message": "Fichier introuvable sur le serveur."}), 404
        
        current_app.logger.info(f"Téléchargement local du fichier {full_path}")
        
        return send_file(
            full_path,
            mimetype='image/jpeg',
            as_attachment=True, 
            download_name=file_to_download.name
        )
    except Exception as e:
         current_app.logger.error(f"Erreur de téléchargement local pour {file_to_download.path}: {e}")
         return jsonify({"code": "download_failed", "message": "Erreur serveur lors du téléchargement."}), 500


# --- ROUTES DE PAIEMENT (INCHANGÉES) ---

@bp.route('/create-payment-intent', methods=['POST'])
def create_payment_intent():
    """Crée une intention de paiement Stripe pour une session donnée."""
    data = request.get_json()
    session_id = data.get('session_id')
    currency = data.get('currency', 'eur').lower()

    if currency not in AMOUNTS_IN_CENTS:
        return jsonify({"code": "invalid_currency", "message": "Devise non supportée."}), 400

    session = Session.query.get(session_id)
    if not session:
        return jsonify({"code": "invalid_session", "message": "Session invalide."}), 404
        
    try:
        amount = AMOUNTS_IN_CENTS[currency]
        
        stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
        
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            automatic_payment_methods={'enabled': True},
            metadata={
                'session_id': session_id # Très important pour le webhook
            }
        )
        
        current_app.logger.info(f"Intention de paiement créée pour la session {session_id}")
        return jsonify({
            'clientSecret': intent.client_secret,
            'amount': amount,
            'currency': currency
        })

    except Exception as e:
        current_app.logger.error(f"Erreur lors de la création de l'intention de paiement: {e}")
        return jsonify({"code": "payment_intent_failed", "message": str(e)}), 500

@bp.route('/payment-status/<session_id>', methods=['GET'])
def get_payment_status(session_id):
    """Vérifie si une session a été marquée comme payée."""
    session = Session.query.get(session_id)
    if not session:
        return jsonify({"code": "session_not_found", "message": "Session non trouvée."}), 404
    
    status = 'paid' if session.paid else 'unpaid'
    current_app.logger.info(f"Statut de paiement demandé pour la session {session_id}: {status}")
    return jsonify({'status': status})

@bp.route('/session-files/<session_id>', methods=['GET'])
def get_session_files(session_id):
    """Récupère la liste des fichiers traités pour une session payée."""
    secure_session_id = flask_session.get('user_session_id')
    if not secure_session_id or secure_session_id != session_id:
        current_app.logger.warning(f"Tentative d'accès non autorisé aux fichiers de la session {session_id} (cookie: {secure_session_id})")
        return jsonify({"code": "unauthorized_session_access", "message": "Accès à la session non autorisé."}), 403
    
    session = Session.query.get(session_id)
    
    if not session or not session.paid:
        return jsonify({"code": "session_invalid_or_unpaid", "message": "Session invalide ou non payée."}), 403

    files = ProcessedFile.query.filter_by(session_id=session_id).all()
    
    files_data = {
        file.doc_type: {
            'id': file.id,
            'name': file.name,
            'path': file.path
        } for file in files
    }
    
    current_app.logger.info(f"Liste des fichiers envoyée pour la session {session_id}")
    return jsonify({"files": files_data})

@bp.route('/verify-payment', methods=['POST'])
def verify_payment():
    data = request.get_json()
    payment_intent_id = data.get('payment_intent_id')

    if not payment_intent_id:
        return jsonify({"code": "missing_payment_intent_id", "message": "ID d'intention de paiement manquant."}), 400

    try:
        stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)

        if intent.status == 'succeeded':
            session_id = intent.metadata.get('session_id')
            if session_id:
                session = Session.query.get(session_id)
                if session:
                    if not session.paid:
                        session.paid = True
                        db.session.commit()
                        current_app.logger.info(f"Paiement vérifié et session {session_id} marquée comme payée.")
                    
                    # On rafraîchit le cookie pour les futurs appels (ex: téléchargement direct)
                    flask_session['user_session_id'] = session_id
                    
                    # On récupère les informations des fichiers et on les renvoie directement
                    files = ProcessedFile.query.filter_by(session_id=session_id).all()
                    files_data = {
                        file.doc_type: {
                            'id': file.id,
                            'name': file.name,
                            'path': file.path
                        } for file in files
                    }
                    current_app.logger.info(f"Données des fichiers envoyées directement après vérification pour la session {session_id}")
                    return jsonify({"status": "success", "files": files_data}), 200
            else:
                current_app.logger.error(f"Erreur de vérification: session_id manquant dans les métadonnées de PaymentIntent {payment_intent_id}.")
                return jsonify({"code": "missing_metadata", "message": "Métadonnées manquantes."}), 400
        
        return jsonify({"status": "not_succeeded", "message": f"Le statut du paiement est {intent.status}."}), 202

    except Exception as e:
        current_app.logger.error(f"Erreur lors de la vérification du PaymentIntent {payment_intent_id}: {e}")
        return jsonify({"code": "verification_failed", "message": str(e)}), 500

# --- WEBHOOK STRIPE (INCHANGÉ) ---
@bp.route('/webhooks/stripe', methods=['POST'])
def stripe_webhook():
    current_app.logger.info("--> [WEBHOOK DANS MAIN.PY] Appel reçu sur /api/webhooks/stripe")
    
    stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')
    endpoint_secret = current_app.config['STRIPE_WEBHOOK_SECRET']

    if not endpoint_secret:
        current_app.logger.error("--> [WEBHOOK] ERREUR CRITIQUE: STRIPE_WEBHOOK_SECRET n'est pas configuré.")
        return jsonify(error={"message": "Webhook secret not configured"}), 500

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
        current_app.logger.info(f"--> [WEBHOOK] Signature vérifiée. Type d'événement: {event['type']}")
    except ValueError as e:
        current_app.logger.error(f"--> [WEBHOOK] ERREUR: Payload invalide. {e}")
        return jsonify(error={"message": "Invalid payload"}), 400
    except stripe.error.SignatureVerificationError as e:
        current_app.logger.error(f"--> [WEBHOOK] ERREUR: Signature de webhook invalide. {e}")
        return jsonify(error={"message": "Invalid signature"}), 400

    if event['type'] == 'payment_intent.succeeded':
        current_app.logger.info("--> [WEBHOOK] Événement 'payment_intent.succeeded' détecté.")
        payment_intent = event['data']['object']
        session_id = payment_intent['metadata'].get('session_id')
        
        if session_id:
            current_app.logger.info(f"--> [WEBHOOK] session_id trouvé dans les métadonnées: {session_id}")
            session = Session.query.get(session_id)
            if session:
                current_app.logger.info(f"--> [WEBHOOK] Session {session_id} trouvée en base. Statut 'paid' actuel: {session.paid}")
                if not session.paid:
                    session.paid = True
                    db.session.commit()
                    current_app.logger.info(f"--> [WEBHOOK] SUCCÈS ! Session {session_id} marquée comme payée et commit en base de données.")
                else:
                    current_app.logger.info(f"--> [WEBHOOK] Session {session_id} était déjà marquée comme payée. Aucune action nécessaire.")
            else:
                current_app.logger.warning(f"--> [WEBHOOK] ATTENTION ! Session {session_id} non trouvée en base de données pour le paiement.")
        else:
            current_app.logger.error("--> [WEBHOOK] ERREUR ! session_id manquant dans les métadonnées de PaymentIntent.")
    else:
        current_app.logger.info(f"--> [WEBHOOK] Événement '{event['type']}' reçu mais ignoré.")

    return jsonify(status="success"), 200