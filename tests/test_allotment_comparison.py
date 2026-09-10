import json
from pathlib import Path
from app import create_app
from database import db
from models import LandRecord
from seed_data import seed_database
from validator import check_plot_allotment, check_assam_land_validity


def test_single_deletion_only(tmp_path):
    app = create_app({
        'SQLALCHEMY_DATABASE_URI': f"sqlite:///{tmp_path / 'test_delete.db'}"
    })
    client = app.test_client()

    with app.app_context():
        db.create_all()
        # Create two test records
        r1 = LandRecord(owner_name="Owner One", dag_number="501", patta_number="10", document_path="uploads/test1.txt")
        r2 = LandRecord(owner_name="Owner Two", dag_number="502", patta_number="11", document_path="uploads/test2.txt")
        db.session.add_all([r1, r2])
        db.session.commit()
        r1_id, r2_id = r1.id, r2.id

        # Delete exactly one record
        res = client.delete(f'/api/records/{r1_id}')
        assert res.status_code == 200
        data = res.get_json()
        assert data['success'] is True
        assert data['deleted_id'] == r1_id

        # Verify only r1 is deleted, r2 is strictly preserved
        assert LandRecord.query.get(r1_id) is None
        assert LandRecord.query.get(r2_id) is not None
        assert LandRecord.query.count() == 1


def test_allotment_available_when_not_registered(tmp_path):
    app = create_app({
        'SQLALCHEMY_DATABASE_URI': f"sqlite:///{tmp_path / 'test_allot.db'}"
    })

    with app.app_context():
        db.create_all()
        result = check_plot_allotment(dag_number="999", village="Barbari", district="Baksa", owner_name="New Applicant")
        assert result['allotment_status'] == "Available / Unregistered Plot"
        assert result['allotted_to_other'] is False
        assert result['conflict_record'] is None


def test_allotment_detected_for_another_name(tmp_path):
    app = create_app({
        'SQLALCHEMY_DATABASE_URI': f"sqlite:///{tmp_path / 'test_conflict.db'}"
    })

    with app.app_context():
        db.create_all()
        # Original ground truth record in admin database
        r = LandRecord(
            owner_name="Ramesh Basumatary",
            father_name="Mohan Basumatary",
            dag_number="101",
            patta_number="KP-45",
            village="Barbari",
            district="Baksa",
            unique_id="ASM-BAK-2024-0101",
            document_path="uploads/test.txt"
        )
        db.session.add(r)
        db.session.commit()

        # Someone uploads or claims Dag 101 with another name
        result = check_plot_allotment(
            dag_number="101",
            village="Barbari",
            district="Baksa",
            owner_name="Suresh Basumatary"
        )
        assert result['allotment_status'] == "Allotted to Another Name"
        assert result['allotted_to_other'] is True
        assert "Ramesh Basumatary" in result['message']
        assert result['conflict_record']['owner_name'] == "Ramesh Basumatary"


def test_allotment_same_owner_is_duplicate(tmp_path):
    app = create_app({
        'SQLALCHEMY_DATABASE_URI': f"sqlite:///{tmp_path / 'test_dup.db'}"
    })

    with app.app_context():
        db.create_all()
        r = LandRecord(
            owner_name="Mina Boro",
            dag_number="105",
            patta_number="KP-57",
            village="Dhaligaon",
            district="Kokrajhar",
            document_path="uploads/test.txt"
        )
        db.session.add(r)
        db.session.commit()

        result = check_plot_allotment(
            dag_number="105",
            village="Dhaligaon",
            district="Kokrajhar",
            owner_name="Mina Boro"
        )
        assert result['allotment_status'] == "Already Allotted to Same Owner"
        assert result['allotted_to_other'] is False


def test_assam_land_validity_rules():
    class RecordMock:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

    # Valid Assam record
    valid_rec = RecordMock(
        owner_name="Anita Das",
        dag_number="107",
        patta_number="KP-64",
        village="Kayakuchi",
        district="Barpeta",
        area="1B-4K-8L"
    )
    is_valid, issues = check_assam_land_validity(valid_rec)
    assert is_valid is True
    assert len(issues) == 0

    # Invalid area format
    invalid_area_rec = RecordMock(
        owner_name="Anita Das",
        dag_number="107",
        patta_number="KP-64",
        village="Kayakuchi",
        district="Barpeta",
        area="NOT_AN_AREA"
    )
    is_valid, issues = check_assam_land_validity(invalid_area_rec)
    assert is_valid is False
    assert any("Invalid area format" in issue for issue in issues)


def test_download_and_export_csv_endpoints(tmp_path):
    app = create_app({
        'SQLALCHEMY_DATABASE_URI': f"sqlite:///{tmp_path / 'test_csv.db'}"
    })
    client = app.test_client()

    with app.app_context():
        db.create_all()
        # Test download of registry CSV
        res = client.get('/api/download/assam-registry-csv')
        assert res.status_code == 200
        assert 'sl no' in res.data.decode('utf-8')
        assert 'plot no or dag no' in res.data.decode('utf-8')

        # Test export of current database
        r = LandRecord(owner_name="Jonali Baruah", dag_number="201", patta_number="KP-99", document_path="uploads/test.txt")
        db.session.add(r)
        db.session.commit()

        export_res = client.get('/api/export/csv')
        assert export_res.status_code == 200
        export_text = export_res.data.decode('utf-8')
        assert 'Jonali Baruah' in export_text
        assert '201' in export_text
