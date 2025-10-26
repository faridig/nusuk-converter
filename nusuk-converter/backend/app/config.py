# backend/app/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuration de base pour la production."""
    # Clé secrète pour sécuriser les sessions et cookies
    SECRET_KEY = os.environ.get('SECRET_KEY')
    
    # Configuration de la base de données (Supabase/PostgreSQL)
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
    }
    
    # --- SUPPRESSION : La configuration Celery n'est plus nécessaire ---
    # CELERY_BROKER_URL = ...
    # CELERY_RESULT_BACKEND = ...
    # CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = ...
    
    # Dossiers (utilisés localement ou pour des fichiers temporaires)
    # Le code dans routes/main.py utilise maintenant /tmp/ pour les fichiers temporaires,
    # ces variables sont donc moins critiques mais conservées par sécurité.
    UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads'))
    PROCESSED_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'processed'))

    # Clés Stripe
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
    STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')

    # --- AJOUT : Configuration pour Supabase Storage ---
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')