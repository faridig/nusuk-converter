# backend/app/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuration de base."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'une-cle-secrete-par-defaut')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') # On peut enlever la valeur par défaut si .env est toujours présent
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    SQLALCHEMY_ENGINE_OPTIONS = {
    "pool_pre_ping": True,
}
    
    # --- CONFIGURATION CELERY CORRIGÉE ---
    # On revient aux majuscules, comme Flask l'attend.
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
    
    # On ajoute cette ligne pour résoudre le deuxième warning, en majuscules.
    CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
    
    # Dossiers
    UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads'))
    PROCESSED_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'processed'))

    # Clés Stripe
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
    STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')