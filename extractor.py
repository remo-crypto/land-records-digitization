import re

def extract_fields_from_text(text):
    """
    Extracts structured fields from raw OCR text using regular expressions and rule matching.
    """
    fields = {
        "owner_name": None,
        "father_name": None,
        "village": None,
        "district": None,
        "circle": None,
        "dag_number": None,
        "patta_number": None,
        "area": None,
        "land_type": None
    }

    if not text:
        return fields

    lines = [line.strip() for line in text.split('\n') if line.strip()]

    # Patterns for extraction
    patterns = {
        "owner_name": r'(?:Owner\s*Name|Owner|Name)\s*[:\-]\s*(.*)',
        "father_name": r'(?:Father\'?s?\s*Name|Father)\s*[:\-]\s*(.*)',
        "village": r'(?:Village|Mauza)\s*[:\-]\s*(.*)',
        "district": r'(?:District|Dist)\s*[:\-]\s*(.*)',
        "circle": r'(?:Circle|Revenue\s*Circle|Sub\s*Division)\s*[:\-]\s*(.*)',
        "dag_number": r'(?:Dag\s*No\.?|Dag\s*Number|Dag)\s*[:\-]\s*([A-Za-z0-9/\-]+)',
        "patta_number": r'(?:Patta\s*No\.?|Patta\s*Number|Patta)\s*[:\-]\s*([A-Za-z0-9/\-]+)',
        "area": r'(?:Area|Land\s*Area)\s*[:\-]\s*(.*)',
        "land_type": r'(?:Land\s*Type|Type\s*of\s*Land|Classification)\s*[:\-]\s*(.*)'
    }

    for key, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields[key] = match.group(1).strip()

    # Fallback heuristic parsing line-by-line if regex missed
    for line in lines:
        for key in fields:
            if not fields[key]:
                label = key.replace('_', ' ')
                if label.lower() in line.lower() and ':' in line:
                    parts = line.split(':', 1)
                    if len(parts) > 1:
                        fields[key] = parts[1].strip()

    return fields