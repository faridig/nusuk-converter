# backend/app/__init__.py
import os
import logging
from flask import Flask
from .config import Config
from .extensions import db, cors, celery as celery_app

def create_app(config_class=Config):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(config_class)
    
    # ... (partie création de dossiers et logging inchangée) ...
    # S'assurer que les dossiers existent
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['PROCESSED_FOLDER'], exist_ok=True)
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
    cors.init_app(app, origins=["http://localhost:3000", "https://nusuk-converter-frontend.vercel.app"]) # Remplace par ton futur domaine Vercel

    
    celery_app.config_from_object(app.config, namespace='CELERY')

    # Lier le contexte de l'application Flask aux tâches Celery
    class ContextTask(celery_app.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery_app.Task = ContextTask

    app.celery = celery_app

    # Enregistrement des blueprints
    from .routes.main import bp as main_bp
    app.register_blueprint(main_bp, url_prefix='/api')
    
    from .routes.webhooks import bp as webhooks_bp
    app.register_blueprint(webhooks_bp, url_prefix='/api/webhooks')

    with app.app_context():
        db.create_all()

    return app