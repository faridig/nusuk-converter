# backend/app/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuration de base pour la production."""
    SECRET_KEY = os.environ.get('SECRET_KEY')
    
    # --- MODIFICATION MINIMALE CI-DESSOUS ---
    # Permet aux cookies de fonctionner en développement cross-origin (localhost)
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = False
    # --- FIN DE LA MODIFICATION ---

    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
    }
    
    # Dossiers pour fichiers temporaires (moins critiques car /tmp est utilisé)
    UPLOAD_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'uploads'))
    PROCESSED_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'processed'))

    # Clés Stripe
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
    STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')

    # Configuration pour Supabase Storage
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')