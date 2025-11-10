# backend/run.py
from app import create_app

# Crée l'application Flask pour Gunicorn
app = create_app()