# Intelligent Land Record Digitization and Validation System

> **Hackathon Note:** This system provides AI-assisted digitization and consistency checking. It does not replace official legal verification or government land-record authorities.

## 1. Project Overview & Problem Statement
Land records across regional jurisdictions suffer from manual data entry errors, illegible scannings, and missing data points, leading to boundary disputes and fraudulent double-allocations. This project automates document OCR digitization, extracts key fields (Dag/Patta numbers, Owner details), and runs an automated conflict validation engine against existing records.

## 2. Tech Stack
- **Backend:** Python 3, Flask, Flask-SQLAlchemy, SQLite
- **OCR Engine:** Tesseract OCR (`pytesseract`), Pillow, OpenCV (`opencv-python-headless`)
- **Frontend:** Jinja2 Templates, Vanilla HTML5/CSS3, JavaScript (Fetch API)

## 3. Installation & Setup

### Prerequisites
Install Tesseract OCR on your machine:
- **Ubuntu/Linux:** `sudo apt install tesseract-ocr`
- **macOS:** `brew install tesseract`
- **Windows:** Download installer from UB-Mannheim Tesseract Wiki and add to system PATH.

### Installation Steps
```bash
# 1. Clone repository & enter directory
cd intelligent-land-record

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate # On Windows: venv\Scripts\activate

# 3. Install requirements
pip install -r requirements.txt

# 4. Initialize & Seed Demo Database (loads all 60 sample records)
flask --app app seed-db

# 5. Run Application
python app.py