import importlib
import os


def test_ocr_uses_tesseract_cmd_from_environment(monkeypatch):
    monkeypatch.setenv('TESSERACT_CMD', r'C:\Program Files\Tesseract-OCR\tesseract.exe')
    import ocr
    importlib.reload(ocr)
    assert ocr.pytesseract.pytesseract.tesseract_cmd == r'C:\Program Files\Tesseract-OCR\tesseract.exe'


def test_health_endpoint_returns_status_summary():
    from app import create_app
    app = create_app()
    client = app.test_client()

    with app.app_context():
        from database import db
        db.create_all()

    response = client.get('/health')

    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'ok'
    assert 'records' in data
    assert 'verified' in data
