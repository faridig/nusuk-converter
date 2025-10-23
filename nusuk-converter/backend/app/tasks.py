# backend/app/tasks.py
import os
from datetime import datetime, timedelta, timezone
from .extensions import celery
from scripts.optimiseur_image import optimiser_image
from .models import db, Session, ProcessedFile
from flask import current_app

@celery.task
def optimiser_image_task(input_path, output_path, doc_type, file_id, session_id):
    """Tâche Celery pour optimiser une image en arrière-plan."""
    try:
        app = current_app._get_current_object()
        
        # Définir les contraintes
        if doc_type == 'photo':
            params = {'max_largeur': 200, 'max_hauteur': 200, 'max_taille_mo': 1}
        else:
            params = {'max_largeur': 400, 'max_hauteur': 800, 'max_taille_mo': 1}
        
        processed_path = optimiser_image(input_path, output_path, **params)

        if processed_path:
            with app.app_context():
                session = Session.query.get(session_id)
                if session:
                    # Création d'un nom de fichier propre et simple
                    new_file_name = f"{doc_type}_optimise.jpg"

                    new_file = ProcessedFile(
                        id=file_id,
                        doc_type=doc_type,
                        path=output_path,
                        name=new_file_name,
                        session_id=session.id
                    )
                    db.session.add(new_file)
                    db.session.commit()
                    app.logger.info(f"Tâche Celery: Fichier {file_id} ({new_file_name}) traité et sauvegardé pour la session {session.id}")
        else:
            app.logger.error(f"L'optimisation via Celery a échoué pour le fichier {input_path}")
            
    finally:
        # Nettoyer le fichier d'upload initial
        if os.path.exists(input_path):
            os.remove(input_path)

@celery.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(3600.0, cleanup_old_files_and_sessions.s(), name='Nettoyage toutes les 1 heures')

# --- MODIFICATION APPLIQUÉE ICI ---
@celery.task
def cleanup_old_files_and_sessions():
    """Tâche Celery pour nettoyer les anciennes sessions, les enregistrements BDD et les fichiers physiques."""
    app = current_app._get_current_object()
    with app.app_context():
        app.logger.info("--- TÂCHE DE NETTOYAGE DÉMARRÉE ---")
        
        expiration_time = datetime.now(timezone.utc) - timedelta(hours=24)
        
        app.logger.info(f"Recherche des sessions non payées créées avant: {expiration_time}")

        # Boucle pour traiter les sessions par lots de 100 afin d'éviter une surconsommation de mémoire.
        while True:
            sessions_to_delete = Session.query.filter(
                Session.created_at < expiration_time, 
                Session.paid == False
            ).limit(100).all()

            if not sessions_to_delete:
                app.logger.info("Aucune autre session à nettoyer.")
                break  # Sortir de la boucle s'il n'y a plus de sessions à traiter

            app.logger.info(f"Traitement d'un lot de {len(sessions_to_delete)} session(s).")
            total_files_deleted_in_batch = 0
            
            for session in sessions_to_delete:
                app.logger.info(f"Nettoyage de la session : {session.id} (créée le {session.created_at})")
                
                for file_record in session.files:
                    try:
                        if file_record.path and os.path.exists(file_record.path):
                            os.remove(file_record.path)
                            app.logger.info(f"  -> Fichier physique supprimé : {file_record.path}")
                            total_files_deleted_in_batch += 1
                        else:
                            app.logger.warning(f"  -> Fichier physique non trouvé : {file_record.path}")
                    except OSError as e:
                        app.logger.error(f"  -> Erreur lors de la suppression du fichier {file_record.path}: {e}")

                db.session.delete(session)
            
            db.session.commit() 
            app.logger.info(f"SUCCÈS: Lot de {len(sessions_to_delete)} session(s) et {total_files_deleted_in_batch} fichier(s) nettoyé(s).")

        app.logger.info("--- TÂCHE DE NETTOYAGE TERMINÉE ---")