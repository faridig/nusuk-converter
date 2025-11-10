# backend/app/__init__.py
import os
import logging
from flask import Flask
from .config import Config
from .extensions import db, cors

def create_app(config_class=Config):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_class)
    
    # S'assurer que les dossiers existent
    os.makedirs(app.config.get('UPLOAD_FOLDER', 'uploads'), exist_ok=True)
    os.makedirs(app.config.get('PROCESSED_FOLDER', 'processed'), exist_ok=True)
    os.makedirs(app.instance_path, exist_ok=True)

    # Configuration du logging
    gunicorn_logger = logging.getLogger('gunicorn.error')
    if gunicorn_logger.handlers:
        app.logger.handlers = gunicorn_logger.handlers
        app.logger.setLevel(gunicorn_logger.level)
    else:
        if not app.debug:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            app.logger.addHandler(handler)
            app.logger.setLevel(logging.INFO)

    # Initialisation des extensions
    db.init_app(app)
    # AJOUT: Gestion plus flexible des origines pour CORS
    allowed_origins = [
        "http://localhost:3000", 
        "https://nusuk-converter-frontend.vercel.app"
    ]
    # Possibilité d'ajouter une origine depuis les variables d'environnement
    if os.environ.get('VERCEL_URL'):
        allowed_origins.append(f"https://{os.environ.get('VERCEL_URL')}")
        
    cors.init_app(app, origins=allowed_origins, supports_credentials=True)

    # Enregistrement des blueprints
    from .routes.main import bp as main_bp
    app.register_blueprint(main_bp, url_prefix='/api')
    
    # MODIFICATION: Mettre en commentaire l'enregistrement du blueprint webhook
    # from .routes.webhooks import bp as webhooks_bp
    # app.register_blueprint(webhooks_bp, url_prefix='/api/webhooks')

    with app.app_context():
        db.create_all()

    return app