# backend/app/models.py
from .extensions import db
from datetime import datetime
import uuid

class Session(db.Model):
    __tablename__ = 'sessions'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    paid = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    files = db.relationship('ProcessedFile', backref='session', lazy=True, cascade="all, delete-orphan")

class ProcessedFile(db.Model):
    __tablename__ = 'processed_files'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    doc_type = db.Column(db.String(50), nullable=False)
    path = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    session_id = db.Column(db.String(36), db.ForeignKey('sessions.id'), nullable=False)