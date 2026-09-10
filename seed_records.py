import os
from app import create_app
from database import db
from models import LandRecord
from seed_data import seed_database

app = create_app()
with app.app_context():
    db.drop_all()
    db.create_all()
    csv_path = os.path.join(app.root_path, 'sample_records.csv')
    count = seed_database(db.session, LandRecord, csv_path)
    print('Seeded demo records:', count)
