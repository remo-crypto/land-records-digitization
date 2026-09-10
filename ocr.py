import os
import cv2
import numpy as np
from PIL import Image
import pytesseract

# Safe Windows fallback: if the user configured TESSERACT_CMD or installed in default Windows path,
# use it. Otherwise, let pytesseract look for 'tesseract' on the system PATH.
_env_tesseract = os.environ.get('TESSERACT_CMD')
if _env_tesseract:
    pytesseract.pytesseract.tesseract_cmd = _env_tesseract
elif os.name == 'nt':
    _default_win_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    if os.path.exists(_default_win_path):
        pytesseract.pytesseract.tesseract_cmd = _default_win_path

def preprocess_image(image_path):
    """Applies OpenCV grayscale and thresholding to improve OCR reading."""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Could not read image file.")
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply thresholding/denoising
    gray = cv2.medianBlur(gray, 3)
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    
    return thresh

def extract_text_from_file(file_path):
    """Processes images, PDFs or text documents and extracts text."""
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == '.txt':
        try:
            with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                return f.read().strip()
        except Exception as e:
            raise RuntimeError(f"Could not read text document: {str(e)}")

    elif ext == '.pdf':
        try:
            from pdf2image import convert_from_path
            pages = convert_from_path(file_path)
            extracted_text = ""
            for page in pages:
                text = pytesseract.image_to_string(page)
                extracted_text += text + "\n"
            return extracted_text.strip()
        except Exception as e:
            raise RuntimeError(f"PDF OCR failed. Ensure pdf2image, poppler, and tesseract are installed. Error: {str(e)}")
            
    elif ext in ['.jpg', '.jpeg', '.png']:
        try:
            processed_img = preprocess_image(file_path)
            text = pytesseract.image_to_string(processed_img)
            if not text.strip(): # Fallback to standard Pillow loading if OpenCV result is empty
                text = pytesseract.image_to_string(Image.open(file_path))
            return text.strip()
        except Exception as e:
            # Fallback direct image load
            try:
                return pytesseract.image_to_string(Image.open(file_path)).strip()
            except Exception as inner_e:
                raise RuntimeError(f"OCR execution failed: {str(inner_e)}")
    else:
        raise ValueError("Unsupported file format for OCR.")