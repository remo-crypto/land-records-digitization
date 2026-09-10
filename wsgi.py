import os
from app import create_app
from database import db
from models import LandRecord
from seed_data import seed_database

application = create_app()

# Auto-seed demo data on first startup if DB is empty
with application.app_context():
    if LandRecord.query.count() == 0:
        csv_path = os.path.join(os.path.dirname(__file__), 'dummy_assam_land_records.csv')
        if os.path.exists(csv_path):
            count = seed_database(db.session, LandRecord, csv_path)
            print(f"[WSGI] Auto-seeded {count} demo records from dummy_assam_land_records.csv")
