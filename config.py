import os
import secrets

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    # Use environment secret key if available, otherwise deterministic fallback for local dev
    SECRET_KEY = os.environ.get('SECRET_KEY', 'geoharmonize-land-records-secure-dev-key')
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'land_records.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Cookie and Session Security
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = os.environ.get('FLASK_ENV') == 'production'
    
    # Upload Configurations
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max limit
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
    
    # Tesseract OCR Path configuration (If on Windows, customize if necessary)
    # TESSERACT_CMD = r'C:\Program Files\Tesseract-OCR\tesseract.exe'