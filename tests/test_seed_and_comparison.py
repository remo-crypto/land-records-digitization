from pathlib import Path

from app import create_app
from database import db
from models import LandRecord
from seed_data import seed_database
from validator import compare_land_record


def test_seed_imports_all_supplied_records(tmp_path):
    app = create_app({
        'SQLALCHEMY_DATABASE_URI': f"sqlite:///{tmp_path / 'records.db'}"
    })

    with app.app_context():
        db.drop_all()
        db.create_all()
        count = seed_database(
            db.session,
            LandRecord,
            Path(app.root_path) / 'sample_records.csv'
        )

        assert count == 60
        assert LandRecord.query.count() == 60
        conflict = LandRecord.query.filter_by(id=36).one()
        assert conflict.status == 'Conflict'
        assert conflict.dag_number == '101'


def test_comparison_reports_matching_fields(tmp_path):
    app = create_app({
        'SQLALCHEMY_DATABASE_URI': f"sqlite:///{tmp_path / 'records.db'}"
    })

    with app.app_context():
        db.drop_all()
        db.create_all()
        seed_database(
            db.session,
            LandRecord,
            Path(app.root_path) / 'sample_records.csv'
        )

        current_record = LandRecord.query.filter_by(id=36).one()
        result = compare_land_record(current_record)

        match = next(item for item in result['matches'] if item['id'] == 1)
        assert result['match_status'] == 'Match Found'
        assert 'dag_number+patta_number' in match['matching_fields']
        assert match['similarity'] >= 75
        assert match['exact_parcel_match'] is True
