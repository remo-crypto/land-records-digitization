# Land Record Intelligence System — Project Documentation

## 1. Project Overview
The Land Record Intelligence System is a Flask-based OCR workflow for digitizing land records, extracting structured fields from scanned or uploaded images/PDFs, and validating records for conflict, missing-field, and duplicate-risk issues.

## 2. Main Goals
- Upload land-record documents such as JPG, JPEG, PNG, or PDF.
- Run OCR and field extraction over uploaded documents.
- Save extracted metadata in a SQLite database.
- Show validation notes, duplicate/conflict warnings, and a record review workflow.
- Provide a dashboard and searchable record records for administrators or field officers.

## 3. Project File Map
- `app.py`: Flask application factory, HTML routes, API routes, CLI seed command.
- `config.py`: Shared configuration values such as upload folder, file types, and app secret key.
- `database.py`: SQLAlchemy database object.
- `models.py`: LandRecord model structure.
- `ocr.py`: OCR preprocessing and Tesseract extraction routines.
- `extractor.py`: Regex field extraction utility.
- `validator.py`: Automated validation engine for completeness, formatting, conflicts, and duplicate detection.
- `templates/`: HTML pages for dashboard, upload, records, and record details.
- `static/`: CSS and JavaScript assets.
- `tests/`: Regression and validation tests.

## 4. Dependencies
The project depends on:
- Flask
- Flask-SQLAlchemy
- SQLAlchemy
- Python packages for OCR and image processing (`opencv-python`, `pillow`, `pytesseract`)
- SQLite database storage

## 5. Workflow
1. Upload a JPG/JPEG/PNG/PDF file using the upload page or API.
2. Save the named file safely in the uploads directory.
3. Run OCR processing through the `/api/process/<record_id>` route.
4. Extract fields such as owner name, father’s name, village, district, dag number, patta number, land area, and land type.
5. Validate the record through the `/api/validate/<record_id>` route.
6. Compare the processed record with existing records through
	`/api/compare/<record_id>` and show matching fields and similarity.
7. Display the record in the dashboard, records overview, and detail page.
8. Delete records from the detail page when data retention rules allow it.

## 6. Newly Added Improvements
During the workspace extension, the project was improved with the following features:
- **Strict Single Deletion Safeguard**: Added row-level single deletion from the registry table and detail view, ensuring data cannot be accidentally bulk-deleted. File artifacts are cleaned up safely.
- **Assam Regional Parcel Allotment Engine**: Built an intelligent comparison process that verifies whether an uploaded/queried land parcel (Dag number, village, district) is:
  - 🟢 **Available / Unregistered Plot**: Clear and free for allotment.
  - 🟡 **Already Allotted to Same Owner**: Duplicate record detection.
  - 🔴 **Allotted to Another Name (Critical Conflict)**: Immediately alerts if a parcel is already registered under someone else, preventing double-allocation and fraud.
- **Interactive Verification Console (`/verify`)**: Direct portal for field officers to enter Dag No, Village, District, and Applicant Name for instant allotment and Assam cadastral validity check.
- **Assam Regional Ground-Truth Dataset & CSV**: Generated `dummy_assam_land_records.csv` and `assam_land_records_registry.csv` with fields: `sl no`, `name`, `email`, `contact no`, `gmail`, `plot no or dag no`, `unique id`, `father name`, `district`, `circle`, `village`, `patta no`, `area`, `land type`, `status`.
- **Administrative Client Controls**: Inline edit modal for record corrections, manual record entry modal, and direct CSV export/download endpoints.
- **Automated Test Suite**: Added 10 tests covering single deletion constraints, allotment comparison scenarios, and CSV downloads.

## 8. Testing
The workspace test suite currently includes a regression test checking OCR Tesseract environment configuration and the new health summary endpoint shape.

## 9. Notes for Running
The app is run through:
```bash
python app.py
```
Or through the Flask app factory using environment-specific configuration:
```bash
flask --app app create_app
```

## 10. Implementation Notes
The project is suitable for rapid prototype development and hackathon-style demonstration. It is easy to extend with stronger authentication, job queueing, report generation, and multi-user workflows.
