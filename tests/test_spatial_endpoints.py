import json
from app import create_app
from database import db
from models import LandRecord


def test_spatial_routes_render_successfully(tmp_path):
    app = create_app({
        'SQLALCHEMY_DATABASE_URI': f"sqlite:///{tmp_path / 'spatial_test.db'}"
    })
    client = app.test_client()

    with app.app_context():
        db.create_all()

    # 1. 2D Map Studio route
    res_map = client.get('/map')
    assert res_map.status_code == 200
    assert b'2D Map Studio' in res_map.data
    assert b'Google Satellite' in res_map.data

    # 2. Pipeline route
    res_pipe = client.get('/pipeline')
    assert res_pipe.status_code == 200
    assert b'Multi-Source Geospatial Ingestion' in res_pipe.data

    # 3. Schema Matcher route
    res_schema = client.get('/schema-matcher')
    assert res_schema.status_code == 200
    assert b'LADM ISO 19152' in res_schema.data


def test_api_spatial_parcels_geojson(tmp_path):
    app = create_app({
        'SQLALCHEMY_DATABASE_URI': f"sqlite:///{tmp_path / 'parcels_test.db'}"
    })
    client = app.test_client()

    with app.app_context():
        db.create_all()
        r1 = LandRecord(
            owner_name="Bhaben Barman",
            dag_number="301",
            patta_number="KP-77",
            village="Guwahati Sector 12",
            district="Kamrup Metro",
            area="2B-1K-0L",
            latitude=26.1445,
            longitude=91.7362,
            document_path="uploads/test1.txt"
        )
        db.session.add(r1)
        db.session.commit()

        res = client.get('/api/spatial/parcels')
        assert res.status_code == 200
        data = res.get_json()
        assert data['type'] == 'FeatureCollection'
        assert len(data['features']) == 1

        feature = data['features'][0]
        assert feature['properties']['dag_number'] == '301'
        assert feature['properties']['owner_name'] == 'Bhaben Barman'
        assert feature['geometry']['type'] == 'Polygon'


def test_api_save_marked_parcel(tmp_path):
    app = create_app({
        'SQLALCHEMY_DATABASE_URI': f"sqlite:///{tmp_path / 'save_marked_test.db'}"
    })
    client = app.test_client()

    with app.app_context():
        db.create_all()

        polygon_geom = {
            "type": "Polygon",
            "coordinates": [
                [[91.7360, 26.1440], [91.7370, 26.1440], [91.7370, 26.1450], [91.7360, 26.1450], [91.7360, 26.1440]]
            ]
        }

        payload = {
            "dag_number": "505/Ka",
            "patta_number": "KP-99",
            "owner_name": "Dipak Nath",
            "father_name": "Kandarpa Nath",
            "village": "Dispur Ward 4",
            "district": "Kamrup Metro",
            "area": "1B-2K-5L",
            "land_type": "Residential",
            "latitude": 26.1445,
            "longitude": 91.7365,
            "boundary_geojson": polygon_geom
        }

        res = client.post('/api/spatial/save-marked-parcel', json=payload)
        assert res.status_code == 201
        data = res.get_json()
        assert data['success'] is True
        assert data['record']['dag_number'] == '505/Ka'
        assert data['record']['owner_name'] == 'Dipak Nath'
        assert data['record']['latitude'] == 26.1445

        # Verify persisted in database
        saved = db.session.get(LandRecord, data['record_id'])
        assert saved is not None
        assert saved.dag_number == '505/Ka'


def test_view_record_does_not_open_edit_modal_by_default(tmp_path):
    """Verify that viewing a record does not have the edit modal displayed."""
    app = create_app({
        'SQLALCHEMY_DATABASE_URI': f"sqlite:///{tmp_path / 'view_test.db'}"
    })
    client = app.test_client()

    with app.app_context():
        db.create_all()
        r = LandRecord(
            owner_name="Mridula Das",
            dag_number="102",
            patta_number="KP-33",
            village="Barbari",
            district="Baksa",
            document_path="uploads/test.txt"
        )
        db.session.add(r)
        db.session.commit()
        record_id = r.id

        res = client.get(f'/records/{record_id}')
        assert res.status_code == 200
        html = res.data.decode('utf-8')

        # Verify the record details are present
        assert 'Mridula Das' in html
        assert '102' in html

        # Verify editModal is strictly hidden by inline style display: none !important
        assert 'id="editModal" class="modal hidden" style="display: none !important;"' in html


def test_dashboard_displays_real_database_counts(tmp_path):
    """Verify that the dashboard displays exact counts from real database data."""
    app = create_app({
        'SQLALCHEMY_DATABASE_URI': f"sqlite:///{tmp_path / 'real_counts_test.db'}"
    })
    client = app.test_client()

    with app.app_context():
        db.create_all()
        # Seed exactly 3 records: 2 Verified, 1 Conflict
        r1 = LandRecord(owner_name="Owner A", dag_number="1", status="Verified", document_path="uploads/1.txt")
        r2 = LandRecord(owner_name="Owner B", dag_number="2", status="Verified", document_path="uploads/2.txt")
        r3 = LandRecord(owner_name="Owner C", dag_number="3", status="Conflict", document_path="uploads/3.txt")
        db.session.add_all([r1, r2, r3])
        db.session.commit()

        res = client.get('/')
        assert res.status_code == 200
        html = res.data.decode('utf-8')

        # Real counts: Total = 3, Verified = 2, Conflicts = 1, Needs Review = 0
        assert '<div class="kpi-number">3</div>' in html
        assert '<div class="kpi-number text-success">2</div>' in html
        assert '<div class="kpi-number text-danger">1</div>' in html
        assert '<div class="kpi-number text-warning">0</div>' in html

