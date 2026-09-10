import csv
import json
from pathlib import Path


CSV_FIELDS = [
    'id', 'owner_name', 'father_name', 'district', 'circle', 'village',
    'dag_number', 'patta_number', 'area', 'land_type',
    'validation_score', 'status'
]

ENRICHED_CSV_FIELDS = [
    'sl no', 'name', 'email', 'contact no', 'gmail', 'plot no or dag no',
    'unique id', 'father name', 'district', 'circle', 'village',
    'patta no', 'area', 'land type', 'status'
]


def seed_database(session, record_model, csv_path):
    """Replace database contents with the records from the supplied CSV file."""
    with Path(csv_path).open(newline='', encoding='utf-8') as csv_file:
        rows = csv.DictReader(csv_file)
        fieldnames = [f.strip() for f in (rows.fieldnames or [])]

        records = []
        if fieldnames == CSV_FIELDS:
            for row in rows:
                record_id = int(row['id'])
                values = {
                    key: row[key].strip() or None
                    for key in CSV_FIELDS
                    if key not in {'id', 'validation_score'}
                }
                values['id'] = record_id
                values['validation_score'] = int(row['validation_score'])
                values['document_path'] = f'uploads/seed-record-{record_id}.txt'
                values['ocr_text'] = json.dumps({key: row[key] for key in CSV_FIELDS})
                values['validation_notes'] = json.dumps([
                    'Imported from sample_records.csv'
                ])
                records.append(record_model(**values))
        elif 'sl no' in fieldnames and ('plot no or dag no' in fieldnames or 'dag no' in fieldnames):
            for row in rows:
                record_id = int(row.get('sl no') or row.get('id') or 0)
                status = row.get('status') or 'Verified'
                score = 95 if status == 'Verified' else (50 if status == 'Conflict' else 75)
                values = {
                    'id': record_id,
                    'owner_name': row.get('name') or row.get('owner_name'),
                    'father_name': row.get('father name') or row.get('father_name'),
                    'district': row.get('district'),
                    'circle': row.get('circle'),
                    'village': row.get('village'),
                    'dag_number': row.get('plot no or dag no') or row.get('dag_number'),
                    'patta_number': row.get('patta no') or row.get('patta_number'),
                    'area': row.get('area'),
                    'land_type': row.get('land type') or row.get('land_type'),
                    'unique_id': row.get('unique id') or row.get('unique_id'),
                    'email': row.get('email') or row.get('gmail'),
                    'contact_no': row.get('contact no') or row.get('contact_no'),
                    'validation_score': score,
                    'status': status,
                    'document_path': f'uploads/seed-record-{record_id}.txt',
                    'ocr_text': json.dumps(row),
                    'validation_notes': json.dumps(['Imported from Assam Land Records Registry CSV'])
                }
                records.append(record_model(**values))
        else:
            raise ValueError('Seed CSV headers do not match known LandRecord schemas')

    session.query(record_model).delete()
    session.add_all(records)
    session.commit()
    return len(records)
