# backend/app/routes/main.py
import os
import uuid
import stripe
import io
from flask import Blueprint, request, jsonify, current_app, send_file, session as flask_session
from werkzeug.utils import secure_filename
from supabase import create_client, Client
from ..models import db, Session, ProcessedFile
from scripts.optimiseur_image import optimiser_image

bp = Blueprint('main', __name__)

AMOUNTS_IN_CENTS = {
    'eur': 120,
    'usd': 130
}

# --- Route inchangée ---
@bp.route('/create-session', methods=['POST'])
def create_session():
    """Initialise une nouvelle session et la lie au cookie de l'utilisateur."""
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

# --- MODIFICATION MAJEURE APPLIQUÉE ICI (Logique Supabase) ---
@bp.route('/process-image', methods=['POST'])
def process_image():
    """Traite une image, l'optimise, l'upload sur Supabase et la stocke en BDD."""
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
    
    # --- LOGIQUE D'OPTIMISATION DIRECTE ET UPLOAD SUPABASE ---
    try:
        # Création du client Supabase
        supabase_url = current_app.config.get('SUPABASE_URL')
        supabase_key = current_app.config.get('SUPABASE_SERVICE_KEY')
        if not supabase_url or not supabase_key:
            raise Exception("Les variables d'environnement SUPABASE ne sont pas configurées.")
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Lecture du fichier en mémoire
        input_bytes = file.read()

        # Définition des contraintes
        params = {'max_largeur': 200, 'max_hauteur': 200, 'max_taille_mo': 1} if doc_type == 'photo' else {'max_largeur': 400, 'max_hauteur': 800, 'max_taille_mo': 1}
        
        # Utilisation d'un chemin temporaire pour la sortie de l'optimiseur
        # /tmp est un dossier standard disponible sur les systèmes Linux comme Render
        temp_output_path = f"/tmp/{uuid.uuid4()}.jpg"
        
        processed_path = optimiser_image(io.BytesIO(input_bytes), temp_output_path, **params)
        if not processed_path:
            raise Exception("L'optimisation de l'image a échoué.")

        with open(processed_path, 'rb') as f:
            processed_data = f.read()
        os.remove(temp_output_path) # Nettoyage du fichier temporaire

        # Upload vers Supabase Storage
        file_id = str(uuid.uuid4())
        new_file_name = f"{doc_type}_optimise.jpg"
        supabase_path = f"{session.id}/{new_file_name}"
        
        supabase.storage.from_("processed-files").upload(
            file=processed_data,
            path=supabase_path,
            file_options={"content-type": "image/jpeg", "upsert": True}
        )
        
        # Sauvegarde du chemin Supabase dans notre BDD
        new_file = ProcessedFile(
            id=file_id,
            doc_type=doc_type,
            path=supabase_path,
            name=new_file_name,
            session_id=session.id
        )
        db.session.add(new_file)
        db.session.commit()
        
        current_app.logger.info(f"Fichier uploadé sur Supabase ({supabase_path}) pour session {session_id}")
        return jsonify({"message": "Le fichier a été traité avec succès."}), 201

    except Exception as e:
        current_app.logger.error(f"Erreur lors du traitement de l'image pour session {session_id}: {e}", exc_info=True)
        return jsonify({"code": "image_processing_failed", "message": "Le traitement de l'image a échoué."}), 500

# --- Route inchangée ---
@bp.route('/create-payment-intent', methods=['POST'])
def create_payment():
    """Crée une intention de paiement après avoir vérifié la propriété de la session."""
    stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
    data = request.get_json()
    session_id = data.get('session_id')
    currency = data.get('currency', 'eur').lower()
    
    secure_session_id = flask_session.get('user_session_id')
    if not session_id or (secure_session_id and secure_session_id != session_id):
        return jsonify({"code": "unauthorized_session_access", "message": "Accès à la session non autorisé."}), 403

    if currency not in AMOUNTS_IN_CENTS:
        return jsonify({"code": "invalid_currency", "message": "Devise non prise en charge."}), 400

    session = Session.query.get(session_id)
    if not session or not session.files:
        return jsonify({"code": "invalid_session_or_no_files", "message": "Session invalide ou aucun fichier à traiter."}), 400
    
    amount = AMOUNTS_IN_CENTS[currency]

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount, currency=currency,
            automatic_payment_methods={'enabled': True},
            metadata={'session_id': session_id}
        )
        return jsonify({'clientSecret': intent.client_secret, 'amount': amount, 'currency': currency})
    except Exception as e:
        return jsonify({"code": "payment_intent_failed", "message": str(e)}), 500
    
# --- Routes inchangées ---
@bp.route('/session-status/<session_id>', methods=['GET'])
def get_session_status(session_id):
    session = Session.query.get(session_id)
    processed_count = len(session.files) if session else 0
    return jsonify({"processed_count": processed_count}), 200

@bp.route('/payment-status/<session_id>', methods=['GET'])
def get_payment_status(session_id):
    session = Session.query.get(session_id)
    status = "paid" if session and session.paid else "pending"
    return jsonify({"status": status}), 200

@bp.route('/session-files/<session_id>', methods=['GET'])
def get_session_files(session_id):
    session = Session.query.get(session_id)
    if not session or not session.paid:
        return jsonify({"code": "session_invalid_or_unpaid", "message": "Session non trouvée ou non payée."}), 404
    
    files_to_download = { file.doc_type: {"id": file.id, "name": file.name} for file in session.files }
    return jsonify({"files": files_to_download})

# --- MODIFICATION MAJEURE APPLIQUÉE ICI (Logique Supabase) ---
@bp.route('/download/<session_id>/<file_id>', methods=['GET'])
def download_file(session_id, file_id):
    """Permet le téléchargement d'un fichier depuis Supabase Storage."""
    session = Session.query.get(session_id)
    if not session or not session.paid:
        return jsonify({"code": "session_invalid_or_unpaid", "message": "Session invalide ou paiement non effectué."}), 403

    file_to_download = ProcessedFile.query.filter_by(id=file_id, session_id=session.id).first()
    
    if file_to_download:
        try:
            # Création du client Supabase
            supabase_url = current_app.config.get('SUPABASE_URL')
            supabase_key = current_app.config.get('SUPABASE_SERVICE_KEY')
            if not supabase_url or not supabase_key:
                raise Exception("Les variables d'environnement SUPABASE ne sont pas configurées.")
            supabase: Client = create_client(supabase_url, supabase_key)

            # Téléchargement depuis Supabase
            file_data = supabase.storage.from_("processed-files").download(file_to_download.path)
            
            current_app.logger.info(f"Téléchargement depuis Supabase du fichier {file_to_download.path}")
            
            return send_file(
                io.BytesIO(file_data),
                mimetype='image/jpeg',
                as_attachment=True, 
                download_name=file_to_download.name
            )
        except Exception as e:
             current_app.logger.error(f"Erreur de téléchargement depuis Supabase pour {file_to_download.path}: {e}")
             return jsonify({"code": "file_not_found_in_storage", "message": "Fichier non trouvé dans le stockage."}), 404
    else:
        current_app.logger.warning(f"Tentative de téléchargement d'un enregistrement de fichier non trouvé: {file_id} pour session {session_id}")
        return jsonify({"code": "file_record_not_found", "message": "Enregistrement du fichier non trouvé."}), 404