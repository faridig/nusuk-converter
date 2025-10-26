# backend/app/routes/main.py
import os
import uuid
import stripe
import io
from flask import Blueprint, request, jsonify, current_app, send_file, session as flask_session
from werkzeug.utils import secure_filename
from supabase import create_client, Client
# --- AJOUT : Import spécifique pour gérer les erreurs Supabase ---
from storage3.exceptions import StorageApiError
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
    # ... (fonction inchangée)
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
    """Traite une image, l'optimise, l'upload sur Supabase et la stocke en BDD."""
    session_id = request.form.get('session_id')
    
    # ... (vérifications de session et de fichier inchangées) ...
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
        supabase_url = current_app.config.get('SUPABASE_URL')
        supabase_key = current_app.config.get('SUPABASE_SERVICE_KEY')
        if not supabase_url or not supabase_key:
            # Cette erreur est maintenant plus spécifique
            current_app.logger.critical("Les variables d'environnement SUPABASE_URL ou SUPABASE_SERVICE_KEY ne sont pas configurées sur le serveur.")
            raise Exception("Configuration serveur incomplète.")
        supabase: Client = create_client(supabase_url, supabase_key)
        
        input_bytes = file.read()
        params = {'max_largeur': 200, 'max_hauteur': 200, 'max_taille_mo': 1} if doc_type == 'photo' else {'max_largeur': 400, 'max_hauteur': 800, 'max_taille_mo': 1}
        
        temp_output_path = f"/tmp/{uuid.uuid4()}.jpg"
        processed_path = optimiser_image(io.BytesIO(input_bytes), temp_output_path, **params)
        if not processed_path:
            raise Exception("L'optimisation de l'image a échoué.")

        with open(processed_path, 'rb') as f:
            processed_data = f.read()
        os.remove(temp_output_path)

        new_file_name = f"{doc_type}_optimise.jpg"
        supabase_path = f"{session.id}/{new_file_name}"
        
        # --- MODIFICATION FINALE POUR LA GESTION DE L'UPLOAD ---
        try:
            # On essaie d'uploader normalement
            supabase.storage.from_("processed-files").upload(
                path=supabase_path,
                file=processed_data,
                file_options={"content-type": "image/jpeg"}
            )
        except StorageApiError as e:
            # Si l'erreur est "Duplicate" (le fichier existe déjà), on le met à jour.
            # C'est la méthode robuste qui fonctionne avec toutes les versions de la librairie.
            if e.args and isinstance(e.args[0], dict) and e.args[0].get('error') == 'Duplicate':
                current_app.logger.info(f"Le fichier {supabase_path} existe déjà. Mise à jour.")
                supabase.storage.from_("processed-files").update(
                    path=supabase_path,
                    file=processed_data,
                    file_options={"content-type": "image/jpeg"}
                )
            else:
                # Si c'est une autre erreur de stockage, on la relève pour qu'elle soit loggée
                raise e

        # On vérifie si un fichier pour ce doc_type existe déjà pour cette session
        existing_file = ProcessedFile.query.filter_by(session_id=session.id, doc_type=doc_type).first()
        if existing_file:
            # Si oui, on met à jour son chemin (au cas où, bien que ça ne devrait pas changer)
            existing_file.path = supabase_path
            current_app.logger.info(f"Enregistrement du fichier mis à jour en BDD pour la session {session_id}")
        else:
            # Sinon, on crée un nouvel enregistrement
            new_file = ProcessedFile(
                id=str(uuid.uuid4()),
                doc_type=doc_type,
                path=supabase_path,
                name=new_file_name,
                session_id=session.id
            )
            db.session.add(new_file)
            current_app.logger.info(f"Nouveau fichier enregistré en BDD pour la session {session_id}")
        
        db.session.commit()
        
        current_app.logger.info(f"Upload/Update réussi sur Supabase ({supabase_path}) pour session {session_id}")
        return jsonify({"message": "Le fichier a été traité avec succès."}), 201

    except Exception as e:
        current_app.logger.error(f"Erreur finale lors du traitement de l'image pour session {session_id}: {e}", exc_info=True)
        return jsonify({"code": "image_processing_failed", "message": "Le traitement de l'image a échoué."}), 500

# ... (les autres routes restent inchangées comme dans ta version) ...
# --- MODIFICATION MINEURE : Améliorer la lisibilité et la robustesse ---
@bp.route('/download/<session_id>/<file_id>', methods=['GET'])
def download_file(session_id, file_id):
    """Permet le téléchargement d'un fichier depuis Supabase Storage."""
    session = Session.query.get(session_id)
    if not session or not session.paid:
        return jsonify({"code": "session_invalid_or_unpaid", "message": "Session invalide ou paiement non effectué."}), 403

    file_to_download = ProcessedFile.query.filter_by(id=file_id, session_id=session.id).first()
    
    if not file_to_download:
        current_app.logger.warning(f"Tentative de téléchargement d'un enregistrement de fichier non trouvé: {file_id} pour session {session_id}")
        return jsonify({"code": "file_record_not_found", "message": "Enregistrement du fichier non trouvé."}), 404

    try:
        supabase_url = current_app.config.get('SUPABASE_URL')
        supabase_key = current_app.config.get('SUPABASE_SERVICE_KEY')
        if not supabase_url or not supabase_key:
            current_app.logger.critical("Les variables d'environnement SUPABASE ne sont pas configurées pour le téléchargement.")
            raise Exception("Configuration serveur incomplète.")
        supabase: Client = create_client(supabase_url, supabase_key)

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