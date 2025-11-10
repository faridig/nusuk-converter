# backend/cleanup.py
import os
from datetime import datetime, timedelta, timezone
from app import create_app
from app.models import db, Session
from supabase import create_client, Client

def run_cleanup():
    """Fonction principale pour le nettoyage des sessions expirées."""
    app = create_app()
    with app.app_context():
        print("--- TÂCHE DE NETTOYAGE DÉMARRÉE (version Supabase) ---")
        
        try:
            supabase_url = app.config.get('SUPABASE_URL')
            supabase_key = app.config.get('SUPABASE_SERVICE_KEY')
            if not supabase_url or not supabase_key:
                print("Erreur: SUPABASE_URL ou SUPABASE_SERVICE_KEY manquant.")
                return
            supabase: Client = create_client(supabase_url, supabase_key)
        except Exception as e:
            print(f"Erreur d'initialisation Supabase: {e}")
            return

        # Nettoie les sessions non payées de plus de 24 heures
        expiration_time = datetime.now(timezone.utc) - timedelta(hours=24)
        print(f"Recherche des sessions non payées créées avant: {expiration_time}")

        sessions_to_delete = Session.query.filter(
            Session.created_at < expiration_time,
            Session.paid == False
        ).all()

        if not sessions_to_delete:
            print("Aucune session à nettoyer.")
        else:
            print(f"Nettoyage de {len(sessions_to_delete)} session(s).")
            for session in sessions_to_delete:
                files_to_remove = [f.path for f in session.files if f.path]
                if files_to_remove:
                    try:
                        supabase.storage.from_("processed-files").remove(files_to_remove)
                        print(f"  -> {len(files_to_remove)} fichier(s) supprimé(s) de Supabase pour la session {session.id}.")
                    except Exception as e:
                        print(f"  -> Erreur lors de la suppression sur Supabase pour la session {session.id}: {e}")
                
                db.session.delete(session)
            
            db.session.commit()
            print("SUCCÈS: Sessions nettoyées de la BDD.")

        print("--- TÂCHE DE NETTOYAGE TERMINÉE ---")

# Permet d'exécuter le fichier directement avec `python cleanup.py`
if __name__ == "__main__":
    run_cleanup()