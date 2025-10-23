# backend/app/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from celery import Celery

db = SQLAlchemy()
cors = CORS()
celery = Celery(__name__)