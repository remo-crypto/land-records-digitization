import os
import json
import uuid
import io
import csv
from datetime import datetime, timezone
from flask import Flask, render_template, request, jsonify, redirect, url_for, send_file, make_response
from werkzeug.utils import secure_filename

from config import Config
from database import db
from models import LandRecord
from ocr import extract_text_from_file
from extractor import extract_fields_from_text
from validator import validate_land_record, compare_land_record, check_plot_allotment, check_assam_land_validity
from seed_data import seed_database

def create_app(config_overrides=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if config_overrides:
        app.config.update(config_overrides)

    db.init_app(app)

    with app.app_context():
        db.create_all()
        inspector = db.inspect(db.engine)
        columns = [column['name'] for column in inspector.get_columns('land_records')]
        for col_name, col_type in [
            ('circle', 'VARCHAR(100)'),
            ('unique_id', 'VARCHAR(100)'),
            ('email', 'VARCHAR(150)'),
            ('contact_no', 'VARCHAR(50)')
        ]:
            if col_name not in columns:
                db.session.execute(db.text(f"ALTER TABLE land_records ADD COLUMN {col_name} {col_type}"))
                db.session.commit()

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

    def build_health_payload():
        total = LandRecord.query.count()
        verified = LandRecord.query.filter_by(status='Verified').count()
        needs_review = LandRecord.query.filter_by(status='Needs Review').count()
        conflicts = LandRecord.query.filter_by(status='Conflict').count()
        return {
            "status": "ok",
            "records": total,
            "verified": verified,
            "needs_review": needs_review,
            "conflicts": conflicts,
            "upload_folder": app.config['UPLOAD_FOLDER'],
            "generated_at": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }

    # --- HTML ROUTES ---

    @app.route('/')
    def index():
        total = LandRecord.query.count()
        verified = LandRecord.query.filter_by(status='Verified').count()
        needs_review = LandRecord.query.filter_by(status='Needs Review').count()
        conflicts = LandRecord.query.filter_by(status='Conflict').count()
        recent = LandRecord.query.order_by(LandRecord.created_at.desc()).limit(10).all()

        return render_template('index.html', total=total, verified=verified, 
                               needs_review=needs_review, conflicts=conflicts, recent=recent)

    @app.route('/upload')
    def upload_page():
        return render_template('upload.html')

    @app.route('/records')
    def records_page():
        records = LandRecord.query.order_by(LandRecord.created_at.desc()).all()
        return render_template('records.html', records=records)

    @app.route('/verify')
    def verify_page():
        return render_template('verify.html')

    @app.route('/records/<int:record_id>')
    def record_detail(record_id):
        record = LandRecord.query.get_or_404(record_id)
        notes = json.loads(record.validation_notes) if record.validation_notes else []
        return render_template('record.html', record=record, notes=notes)

    @app.route('/health')
    def health():
        try:
            return jsonify(build_health_payload())
        except Exception as exc:
            return jsonify({"status": "error", "message": str(exc)}), 500

    # --- API ENDPOINTS ---

    @app.route('/api/upload', methods=['POST'])
    def upload_file():
        if 'file' not in request.files:
            return jsonify({"success": False, "message": "No file part in request"}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({"success": False, "message": "No file selected"}), 400

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            original_base, original_ext = os.path.splitext(filename)
            unique_name = f"{original_base}_{uuid.uuid4().hex}{original_ext.lower()}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
            file.save(filepath)

            # Create preliminary database record
            new_record = LandRecord(
                document_path=f"uploads/{unique_name}",
                status="Pending"
            )
            db.session.add(new_record)
            db.session.commit()

            return jsonify({
                "success": True,
                "record_id": new_record.id,
                "message": "Document uploaded successfully"
            }), 201

        return jsonify({"success": False, "message": "File type not allowed. Use PDF, JPG, JPEG or PNG."}), 400

    @app.route('/api/process/<int:record_id>', methods=['POST'])
    def process_record(record_id):
        record = LandRecord.query.get_or_404(record_id)
        full_path = os.path.join(app.root_path, record.document_path)

        try:
            # 1. OCR Extraction
            text = extract_text_from_file(full_path)
            record.ocr_text = text

            # 2. Intelligent Field Extraction
            extracted = extract_fields_from_text(text)
            record.owner_name = extracted.get("owner_name")
            record.father_name = extracted.get("father_name")
            record.village = extracted.get("village")
            record.district = extracted.get("district")
            record.circle = extracted.get("circle")
            record.dag_number = extracted.get("dag_number")
            record.patta_number = extracted.get("patta_number")
            record.area = extracted.get("area")
            record.land_type = extracted.get("land_type")

            db.session.commit()

            return jsonify({
                "success": True,
                "record": record.to_dict(),
                "message": "OCR & field extraction completed"
            })
        except Exception as e:
            return jsonify({"success": False, "message": str(e)}), 500

    @app.route('/api/validate/<int:record_id>', methods=['POST'])
    def validate_record(record_id):
        record = LandRecord.query.get_or_404(record_id)

        score, status, notes = validate_land_record(record)

        record.validation_score = score
        record.status = status
        record.validation_notes = notes

        db.session.commit()

        return jsonify({
            "success": True,
            "validation_score": score,
            "status": status,
            "notes": json.loads(notes),
            "record": record.to_dict()
        })

    @app.route('/api/compare/<int:record_id>', methods=['POST'])
    def compare_record(record_id):
        record = LandRecord.query.get_or_404(record_id)
        result = compare_land_record(record)
        return jsonify(result)

    @app.route('/api/records', methods=['GET'])
    def get_records():
        records = LandRecord.query.all()
        return jsonify([r.to_dict() for r in records])

    @app.route('/api/records/<int:record_id>', methods=['GET'])
    def get_record(record_id):
        record = LandRecord.query.get_or_404(record_id)
        return jsonify(record.to_dict())

    @app.route('/api/search', methods=['GET'])
    def search():
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify([])

        results = LandRecord.query.filter(
            (LandRecord.owner_name.ilike(f'%{query}%')) |
            (LandRecord.dag_number.ilike(f'%{query}%')) |
            (LandRecord.patta_number.ilike(f'%{query}%')) |
            (LandRecord.village.ilike(f'%{query}%')) |
            (LandRecord.district.ilike(f'%{query}%')) |
            (LandRecord.circle.ilike(f'%{query}%'))
        ).all()

        return jsonify([r.to_dict() for r in results])

    @app.route('/api/records/<int:record_id>', methods=['DELETE'])
    def delete_record(record_id):
        """Delete exactly one land record at a time, cleaning up its uploaded file."""
        record = LandRecord.query.get_or_404(record_id)
        document_path = record.document_path
        deleted_id = record.id
        db.session.delete(record)
        db.session.commit()
        if document_path:
            uploaded_path = os.path.join(app.root_path, document_path)
            if os.path.isfile(uploaded_path):
                try:
                    os.remove(uploaded_path)
                except OSError:
                    pass
        return jsonify({
            "success": True,
            "deleted_id": deleted_id,
            "message": f"Record #{deleted_id} deleted successfully (single record deletion)."
        })

    @app.route('/api/records/<int:record_id>', methods=['PUT', 'POST'])
    def update_record(record_id):
        """Update an existing land record and re-run validation checks."""
        record = LandRecord.query.get_or_404(record_id)
        data = request.get_json() or {}

        editable_fields = [
            'owner_name', 'father_name', 'village', 'district', 'circle',
            'dag_number', 'patta_number', 'area', 'land_type', 'unique_id',
            'email', 'contact_no', 'status'
        ]
        for field in editable_fields:
            if field in data:
                setattr(record, field, data[field].strip() if isinstance(data[field], str) else data[field])

        score, auto_status, notes = validate_land_record(record)
        record.validation_score = score
        if 'status' not in data or not data['status']:
            record.status = auto_status
        record.validation_notes = notes

        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Record #{record.id} updated successfully.",
            "record": record.to_dict()
        })

    @app.route('/api/records/manual', methods=['POST'])
    def create_manual_record():
        """Administrative entry to add a land record directly."""
        data = request.get_json() or {}
        if not data.get('dag_number') or not data.get('owner_name'):
            return jsonify({"success": False, "message": "Owner Name and Dag Number are required."}), 400

        doc_name = f"admin-record-{uuid.uuid4().hex[:8]}.txt"
        unique_id = data.get('unique_id')
        new_record = LandRecord(
            owner_name=data.get('owner_name'),
            father_name=data.get('father_name'),
            village=data.get('village'),
            district=data.get('district'),
            circle=data.get('circle'),
            dag_number=data.get('dag_number'),
            patta_number=data.get('patta_number'),
            area=data.get('area'),
            land_type=data.get('land_type', 'Agricultural'),
            unique_id=unique_id,
            email=data.get('email'),
            contact_no=data.get('contact_no'),
            document_path=f"uploads/{doc_name}",
            ocr_text=json.dumps(data)
        )
        score, auto_status, notes = validate_land_record(new_record)
        new_record.validation_score = score
        new_record.status = data.get('status') or auto_status
        new_record.validation_notes = notes

        db.session.add(new_record)
        db.session.commit()

        return jsonify({
            "success": True,
            "record_id": new_record.id,
            "message": f"Record #{new_record.id} created successfully.",
            "record": new_record.to_dict()
        }), 201

    @app.route('/api/check-allotment', methods=['POST'])
    def check_allotment_endpoint():
        """Instant allotment verification and collision check against registry."""
        data = request.get_json() or {}
        dag_number = data.get('dag_number')
        village = data.get('village')
        district = data.get('district')
        owner_name = data.get('owner_name')
        patta_number = data.get('patta_number')
        exclude_id = data.get('exclude_id')

        allotment_res = check_plot_allotment(
            dag_number=dag_number,
            village=village,
            district=district,
            owner_name=owner_name,
            patta_number=patta_number,
            exclude_id=exclude_id
        )

        class DummyRecord:
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

        dummy = DummyRecord(
            owner_name=owner_name,
            dag_number=dag_number,
            patta_number=patta_number,
            village=village,
            district=district,
            area=data.get('area')
        )
        is_valid, validity_issues = check_assam_land_validity(dummy)
        allotment_res['is_valid'] = is_valid
        allotment_res['validity_issues'] = validity_issues

        return jsonify(allotment_res)

    @app.route('/api/download/assam-registry-csv', methods=['GET'])
    @app.route('/api/download/dummy-csv', methods=['GET'])
    def download_assam_registry_csv():
        """Download the authentic Assam Land Records dummy CSV file with contacts and plot details."""
        csv_path = os.path.join(app.root_path, 'dummy_assam_land_records.csv')
        if not os.path.exists(csv_path):
            csv_path = os.path.join(app.root_path, 'sample_records.csv')
        return send_file(
            csv_path,
            as_attachment=True,
            download_name='assam_land_records_registry.csv',
            mimetype='text/csv'
        )

    @app.route('/api/export/csv', methods=['GET'])
    def export_records_csv():
        """Export all current records from database as CSV."""
        records = LandRecord.query.order_by(LandRecord.id.asc()).all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            'sl no', 'name', 'email', 'contact no', 'gmail',
            'plot no or dag no', 'unique id', 'father name',
            'district', 'circle', 'village', 'patta no', 'area',
            'land type', 'status'
        ])

        for idx, r in enumerate(records, start=1):
            unique_id = r.unique_id or f"ASM-{r.district[:3].upper() if r.district else 'GEN'}-{r.id:04d}"
            email = r.email or ''
            gmail = email if email.endswith('@gmail.com') else (f"{r.owner_name.lower().replace(' ', '')}{r.id}@gmail.com" if r.owner_name else '')
            writer.writerow([
                idx,
                r.owner_name or '',
                email,
                r.contact_no or '',
                gmail,
                r.dag_number or '',
                unique_id,
                r.father_name or '',
                r.district or '',
                r.circle or '',
                r.village or '',
                r.patta_number or '',
                r.area or '',
                r.land_type or '',
                r.status or ''
            ])

        response = make_response(output.getvalue())
        response.headers["Content-Disposition"] = "attachment; filename=assam_land_records_export.csv"
        response.headers["Content-type"] = "text/csv; charset=utf-8"
        return response

    # CLI Command to seed demo records
    @app.cli.command('seed-db')
    def seed_db():
        """Replace the database with the records in sample_records.csv or dummy_assam_land_records.csv."""
        db.drop_all()
        db.create_all()
        csv_path = os.path.join(app.root_path, 'dummy_assam_land_records.csv')
        if not os.path.exists(csv_path):
            csv_path = os.path.join(app.root_path, 'sample_records.csv')
        count = seed_database(db.session, LandRecord, csv_path)
        print(f"Database seeded with {count} sample records.")

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)