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
    # 
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///' + os.path.join(BASE_DIR, 'app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
    }
    
    # --- MODIFICATION : Définition claire du dossier de stockage local ---
    
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    # C'est ici que tes images finales seront stockées sur ton PC
    PROCESSED_FOLDER = os.path.join(BASE_DIR, 'processed') 

    # Clés Stripe
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
    STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')

    # Configuration pour Supabase Storage
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_SERVICE_KEY = os.environ.get('SUPABASE_SERVICE_KEY')