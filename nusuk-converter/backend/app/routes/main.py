# backend/app/routes/main.py
import os
import uuid
import stripe
# --- MODIFICATION : Importer la session de Flask ---
from flask import Blueprint, request, jsonify, current_app, send_file, session as flask_session
from werkzeug.utils import secure_filename
from ..models import db, Session, ProcessedFile
from ..tasks import optimiser_image_task

bp = Blueprint('main', __name__)

AMOUNTS_IN_CENTS = {
    'eur': 120,
    'usd': 130
}

# --- MODIFICATION APPLIQUÉE ICI ---
@bp.route('/create-session', methods=['POST'])
def create_session():
    """Initialise une nouvelle session et la lie au cookie de l'utilisateur."""
    try:
        new_session = Session()
        db.session.add(new_session)
        db.session.commit()

        # Stocke l'ID de la session dans le cookie sécurisé de Flask
        # Cela permet de lier la session de travail à la session du navigateur.
        flask_session['user_session_id'] = new_session.id
        
        current_app.logger.info(f"Nouvelle session créée ({new_session.id}) et liée au cookie utilisateur.")
        return jsonify({"session_id": new_session.id}), 201
    except Exception as e:
        current_app.logger.error(f"Erreur lors de la création de la session: {e}", exc_info=True)
        return jsonify({"code": "session_creation_failed", "message": "Impossible de créer une session."}), 500

# --- MODIFICATION APPLIQUÉE ICI ---
@bp.route('/process-image', methods=['POST'])
def process_image():
    """Traite une image après avoir vérifié la propriété de la session."""
    session_id = request.form.get('session_id')
    
    # Vérification de sécurité : le session_id fourni doit correspondre à celui dans le cookie sécurisé.
    secure_session_id = flask_session.get('user_session_id')
    if not session_id or (secure_session_id and secure_session_id != session_id):
        current_app.logger.warning(f"Tentative d'accès non autorisé à la session {session_id} (cookie: {secure_session_id})")
        return jsonify({"code": "unauthorized_session_access", "message": "Accès à la session non autorisé."}), 403

    session = Session.query.get(session_id)
    if not session:
        return jsonify({"code": "invalid_session", "message": "Session invalide ou expirée."}), 404
    
    # ... (Le reste de la fonction est inchangé)
    if 'file' not in request.files:
        return jsonify({"code": "no_file_provided", "message": "Aucun fichier n'a été fourni."}), 400
    file = request.files['file']
    doc_type = request.form.get('doc_type')
    if file.filename == '' or not doc_type:
        return jsonify({"code": "missing_parameters", "message": "Fichier ou doc_type manquant."}), 400
    allowed_extensions = {'png', 'jpg', 'jpeg'}
    file_ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
    if not file_ext or file_ext not in allowed_extensions:
        return jsonify({"code": "unsupported_file_type", "message": "Format de fichier non autorisé."}), 415
    original_filename = secure_filename(file.filename)
    unique_input_filename = f"{uuid.uuid4()}-{original_filename}"
    input_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_input_filename)
    file.save(input_path)
    file_id = str(uuid.uuid4())
    output_filename = f"{file_id}.jpg"
    output_path = os.path.join(current_app.config['PROCESSED_FOLDER'], output_filename)
    if doc_type not in ['photo', 'passport', 'residence']:
        return jsonify({"code": "invalid_doc_type", "message": "Type de document non valide."}), 400
    optimiser_image_task.delay(input_path, output_path, doc_type, file_id, session_id)
    current_app.logger.info(f"Tâche d'optimisation lancée pour la session {session_id}")
    return jsonify({"message": "Le traitement du fichier a commencé."}), 202

# --- MODIFICATION APPLIQUÉE ICI ---
@bp.route('/create-payment-intent', methods=['POST'])
def create_payment():
    """Crée une intention de paiement après avoir vérifié la propriété de la session."""
    stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
    data = request.get_json()
    session_id = data.get('session_id')
    currency = data.get('currency', 'eur').lower()
    
    # Vérification de sécurité : le session_id fourni doit correspondre à celui dans le cookie sécurisé.
    secure_session_id = flask_session.get('user_session_id')
    if not session_id or (secure_session_id and secure_session_id != session_id):
        current_app.logger.warning(f"Tentative de paiement non autorisé pour la session {session_id} (cookie: {secure_session_id})")
        return jsonify({"code": "unauthorized_session_access", "message": "Accès à la session non autorisé."}), 403

    if currency not in AMOUNTS_IN_CENTS:
        return jsonify({"code": "invalid_currency", "message": "Devise non prise en charge."}), 400

    session = Session.query.get(session_id)
    if not session:
        return jsonify({"code": "invalid_session", "message": "Session invalide."}), 404
    if not session.files:
        return jsonify({"code": "no_files_in_session", "message": "Aucun fichier à traiter."}), 400
    
    amount = AMOUNTS_IN_CENTS[currency]

    try:
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency=currency,
            automatic_payment_methods={'enabled': True},
            metadata={'session_id': session_id}
        )
        current_app.logger.info(f"Intention de paiement créée pour la session {session_id} ({amount} {currency.upper()})")
        return jsonify({
            'clientSecret': intent.client_secret,
            'amount': amount,
            'currency': currency 
        })
    except Exception as e:
        current_app.logger.error(f"Erreur Stripe pour la session {session_id}: {e}", exc_info=True)
        return jsonify({"code": "payment_intent_failed", "message": str(e)}), 500
    
# --- AUCUN CHANGEMENT DANS LES ROUTES SUIVANTES ---
    
@bp.route('/session-status/<session_id>', methods=['GET'])
def get_session_status(session_id):
    """
    Vérifie le nombre de fichiers déjà traités et enregistrés en base
    pour une session donnée.
    """
    session = Session.query.get(session_id)
    if not session:
        return jsonify({"processed_count": 0}), 200

    processed_count = len(session.files)
    current_app.logger.info(f"Vérification statut session {session_id}: {processed_count} fichier(s) traité(s).")
    return jsonify({"processed_count": processed_count}), 200

@bp.route('/payment-status/<session_id>', methods=['GET'])
def get_payment_status(session_id):
    """Vérifie si une session a été marquée comme payée."""
    session = Session.query.get(session_id)
    if session and session.paid:
        return jsonify({"status": "paid"}), 200
    return jsonify({"status": "pending"}), 200


@bp.route('/session-files/<session_id>', methods=['GET'])
def get_session_files(session_id):
    """Renvoie la liste des fichiers téléchargeables pour une session payée."""
    session = Session.query.get(session_id)
    if not session or not session.paid:
        return jsonify({"code": "session_invalid_or_unpaid", "message": "Session non trouvée ou non payée."}), 404
    
    files_to_download = {
        file.doc_type: {"id": file.id, "name": file.name}
        for file in session.files
    }
    return jsonify({"files": files_to_download})

@bp.route('/download/<session_id>/<file_id>', methods=['GET'])
def download_file(session_id, file_id):
    """Permet le téléchargement d'un fichier si sa session a été payée."""
    session = Session.query.get(session_id)
    if not session or not session.paid:
        return jsonify({"code": "session_invalid_or_unpaid", "message": "Session invalide ou paiement non effectué."}), 403

    file_to_download = ProcessedFile.query.filter_by(id=file_id, session_id=session.id).first()
    
    if file_to_download and os.path.exists(file_to_download.path):
        current_app.logger.info(f"Téléchargement du fichier {file_id} pour la session {session_id}")
        return send_file(
            file_to_download.path, 
            as_attachment=True, 
            download_name=file_to_download.name
        )
    else:
        current_app.logger.warning(f"Tentative de téléchargement d'un fichier non trouvé: {file_id} pour session {session_id}")
        return jsonify({"code": "file_not_found", "message": "Fichier non trouvé ou lien expiré."}), 404