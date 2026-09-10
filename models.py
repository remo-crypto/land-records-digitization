from database import db
from datetime import datetime

class LandRecord(db.Model):
    __tablename__ = 'land_records'

    id = db.Column(db.Integer, primary_key=True)
    owner_name = db.Column(db.String(150), nullable=True)
    father_name = db.Column(db.String(150), nullable=True)
    village = db.Column(db.String(100), nullable=True)
    district = db.Column(db.String(100), nullable=True)
    circle = db.Column(db.String(100), nullable=True)
    dag_number = db.Column(db.String(50), nullable=True)
    patta_number = db.Column(db.String(50), nullable=True)
    area = db.Column(db.String(50), nullable=True)
    land_type = db.Column(db.String(50), nullable=True)

    document_path = db.Column(db.String(300), nullable=False)
    unique_id = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(150), nullable=True)
    contact_no = db.Column(db.String(50), nullable=True)
    ocr_text = db.Column(db.Text, nullable=True)
    validation_score = db.Column(db.Integer, default=0)

    # Statuses: Pending, Verified, Needs Review, Conflict
    status = db.Column(db.String(50), default='Pending')
    validation_notes = db.Column(db.Text, nullable=True) # Stores warning/conflict JSON/text

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "owner_name": self.owner_name,
            "father_name": self.father_name,
            "village": self.village,
            "district": self.district,
            "circle": self.circle,
            "dag_number": self.dag_number,
            "patta_number": self.patta_number,
            "area": self.area,
            "land_type": self.land_type,
            "unique_id": self.unique_id or f"ASM-{self.district[:3].upper() if self.district else 'GEN'}-{self.id:04d}",
            "email": self.email,
            "contact_no": self.contact_no,
            "document_path": self.document_path,
            "ocr_text": self.ocr_text,
            "validation_score": self.validation_score,
            "status": self.status,
            "validation_notes": self.validation_notes,
            "created_at": self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }