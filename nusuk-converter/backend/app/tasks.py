# backend/app/tasks.py
import os
from datetime import datetime, timedelta, timezone
# --- MODIFICATION : On importe plus que ce dont on a besoin ---
from .extensions import celery
from .models import db, Session
from flask import current_app
# --- AJOUT : Import pour Supabase ---
from supabase import create_client, Client

# --- SUPPRESSION : Cette tâche n'est plus utilisée, le traitement se fait dans routes/main.py ---
# @celery.task
# def optimiser_image_task(...):
#     ...

@celery.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # On garde cette planification, elle sera utilisée par le service "beat" si tu le réactives un jour
    # ou ignorée si tu utilises le Cron Job. C'est sans danger.
    sender.add_periodic_task(3600.0, cleanup_old_files_and_sessions.s(), name='Nettoyage toutes les 1 heures')

# --- MODIFICATION APPLIQUÉE ICI pour intégrer Supabase ---
@celery.task
def cleanup_old_files_and_sessions():
    """Tâche Celery pour nettoyer les anciennes sessions BDD et les fichiers sur Supabase Storage."""
    app = current_app._get_current_object()
    with app.app_context():
        app.logger.info("--- TÂCHE DE NETTOYAGE DÉMARRÉE (version Supabase) ---")
        
        # --- AJOUT : Initialiser le client Supabase ---
        try:
            supabase_url = app.config.get('SUPABASE_URL')
            supabase_key = app.config.get('SUPABASE_SERVICE_KEY')
            if not supabase_url or not supabase_key:
                app.logger.error("SUPABASE_URL ou SUPABASE_SERVICE_KEY manquant. Tâche annulée.")
                return
            supabase: Client = create_client(supabase_url, supabase_key)
        except Exception as e:
            app.logger.error(f"Impossible d'initialiser le client Supabase: {e}")
            return

        expiration_time = datetime.now(timezone.utc) - timedelta(hours=24)
        app.logger.info(f"Recherche des sessions non payées créées avant: {expiration_time}")

        while True:
            sessions_to_delete = Session.query.filter(
                Session.created_at < expiration_time, 
                Session.paid == False
            ).limit(100).all()

            if not sessions_to_delete:
                app.logger.info("Aucune autre session à nettoyer.")
                break

            app.logger.info(f"Traitement d'un lot de {len(sessions_to_delete)} session(s).")
            
            for session in sessions_to_delete:
                app.logger.info(f"Nettoyage de la session : {session.id} (créée le {session.created_at})")
                
                # --- MODIFICATION : Logique de suppression des fichiers sur Supabase ---
                files_to_remove_from_storage = [file_record.path for file_record in session.files if file_record.path]
                
                if files_to_remove_from_storage:
                    try:
                        supabase.storage.from_("processed-files").remove(files_to_remove_from_storage)
                        app.logger.info(f"  -> {len(files_to_remove_from_storage)} fichier(s) supprimé(s) de Supabase Storage.")
                    except Exception as e:
                        app.logger.error(f"  -> Erreur lors de la suppression de fichiers sur Supabase pour la session {session.id}: {e}")

                db.session.delete(session)
            
            db.session.commit() 
            app.logger.info(f"SUCCÈS: Lot de {len(sessions_to_delete)} session(s) nettoyé(s) de la BDD.")

        app.logger.info("--- TÂCHE DE NETTOYAGE TERMINÉE ---")