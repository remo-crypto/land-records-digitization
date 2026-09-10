import os
import cv2
import numpy as np
from PIL import Image
import pytesseract

# Safe Windows fallback: if the user installed Tesseract in the usual location,
# point pytesseract there explicitly. Otherwise, let the executable remain on PATH.
_tesseract_cmd = os.environ.get('TESSERACT_CMD')
if not _tesseract_cmd:
    _tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Only set the command if the file exists. This avoids breaking Linux/macOS users.
if _tesseract_cmd and os.path.exists(_tesseract_cmd):
    pytesseract.pytesseract.tesseract_cmd = _tesseract_cmd
elif _tesseract_cmd:
    # Respect the environment variable when it is configured, but do not force an invalid path.
    pytesseract.pytesseract.tesseract_cmd = _tesseract_cmd

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
    """Processes images or PDFs and extracts text using Tesseract."""
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == '.pdf':
        try:
            from pdf2image import convert_from_path
            pages = convert_from_path(file_path)
            extracted_text = ""
            for page in pages:
                text = pytesseract.image_to_string(page)
                extracted_text += text + "\n"
            return extracted_text.strip()
        except Exception as e:
            raise RuntimeError(f"PDF OCR failed. Ensure pdf2image and poppler are installed. Error: {str(e)}")
            
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