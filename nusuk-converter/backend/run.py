# backend/run.py
from app import create_app

# Crée l'application Flask
app = create_app()

# Expose l'instance Celery configurée pour la ligne de commande
celery = app.celery