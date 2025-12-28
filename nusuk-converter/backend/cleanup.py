# backend/cleanup.py
import os
import shutil
from datetime import datetime, timedelta, timezone
from app import create_app
from app.models import db, Session

def run_cleanup():
    """Fonction principale pour le nettoyage des sessions expirées (Version Locale)."""
    app = create_app()
    with app.app_context():
        print("--- TÂCHE DE NETTOYAGE DÉMARRÉE (Stockage Local) ---")
        
        # Récupération du dossier de stockage depuis la config
        processed_folder = app.config.get('PROCESSED_FOLDER')
        
        # Sécurité : si la config n'est pas chargée, on définit le chemin par défaut
        if not processed_folder:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
            processed_folder = os.path.join(base_dir, 'processed')

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
                # 1. Suppression des fichiers physiques sur le disque
                # On cible le dossier spécifique à la session (ex: processed/uuid-session/)
                session_dir = os.path.join(processed_folder, session.id)
                
                if os.path.exists(session_dir):
                    try:
                        shutil.rmtree(session_dir) # Supprime le dossier et tout ce qu'il contient
                        print(f"  -> Dossier supprimé sur le disque : {session_dir}")
                    except Exception as e:
                        print(f"  -> Erreur lors de la suppression du dossier {session_dir}: {e}")
                else:
                    print(f"  -> Aucun dossier physique trouvé pour la session {session.id} (déjà supprimé ?)")
                
                # 2. Suppression de la session en BDD
                # Grâce à cascade="all, delete-orphan" dans models.py, 
                # les lignes dans ProcessedFile seront supprimées automatiquement.
                db.session.delete(session)
            
            db.session.commit()
            print("SUCCÈS: Sessions nettoyées de la BDD.")

        print("--- TÂCHE DE NETTOYAGE TERMINÉE ---")

# Permet d'exécuter le fichier directement avec `python cleanup.py`
if __name__ == "__main__":
    run_cleanup()