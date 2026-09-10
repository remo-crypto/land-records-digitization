import json
import re
from sqlalchemy import or_
from models import LandRecord


def check_plot_allotment(dag_number, village=None, district=None, owner_name=None, patta_number=None, exclude_id=None):
    """
    Dedicated comparison process to check whether a given land parcel/Dag number is valid
    and whether it is available, duplicate, or already allotted to another owner.
    """
    if not dag_number or not str(dag_number).strip():
        return {
            "is_valid": False,
            "allotment_status": "Invalid",
            "allotted_to_other": False,
            "message": "Dag / Plot number is required for allotment verification.",
            "conflict_record": None
        }

    clean_dag = str(dag_number).strip()
    clean_owner = (owner_name or '').strip().lower()

    # Query existing records matching dag_number
    query = LandRecord.query.filter(LandRecord.dag_number == clean_dag)
    if exclude_id:
        query = query.filter(LandRecord.id != exclude_id)
    if village and str(village).strip():
        query = query.filter(LandRecord.village.ilike(f"%{str(village).strip()}%"))
    if district and str(district).strip():
        query = query.filter(LandRecord.district.ilike(f"%{str(district).strip()}%"))

    existing_matches = query.all()
    if not existing_matches:
        # Check without village filter to catch cross-village or circle match if any
        fallback_query = LandRecord.query.filter(LandRecord.dag_number == clean_dag)
        if exclude_id:
            fallback_query = fallback_query.filter(LandRecord.id != exclude_id)
        if patta_number and str(patta_number).strip():
            fallback_query = fallback_query.filter(LandRecord.patta_number == str(patta_number).strip())
            existing_matches = fallback_query.all()

    if not existing_matches:
        return {
            "is_valid": True,
            "allotment_status": "Available / Unregistered Plot",
            "allotted_to_other": False,
            "message": f"Plot / Dag No. {clean_dag} is not allotted to any owner in the registry.",
            "conflict_record": None
        }

    # Find the primary matching record
    primary_match = existing_matches[0]
    existing_owner = (primary_match.owner_name or '').strip().lower()

    if clean_owner and existing_owner and clean_owner != existing_owner:
        # ALLOTTED TO ANOTHER NAME! Critical conflict!
        return {
            "is_valid": True,
            "allotment_status": "Allotted to Another Name",
            "allotted_to_other": True,
            "message": (
                f"CONFLICT: Dag No. {clean_dag} is already allotted to "
                f"'{primary_match.owner_name}' (Record #{primary_match.id}, Unique ID: {primary_match.unique_id or f'ASM-{primary_match.id:04d}'}) "
                f"in Village {primary_match.village or 'N/A'}, {primary_match.district or 'N/A'}. "
                f"Cannot be allotted to '{owner_name or 'unspecified'}'. High risk of double allotment / fraud."
            ),
            "conflict_record": primary_match.to_dict()
        }
    elif clean_owner and existing_owner and clean_owner == existing_owner:
        return {
            "is_valid": True,
            "allotment_status": "Already Allotted to Same Owner",
            "allotted_to_other": False,
            "message": f"Dag No. {clean_dag} is already registered under this owner ({primary_match.owner_name}). Duplicate entry.",
            "conflict_record": primary_match.to_dict()
        }
    else:
        return {
            "is_valid": True,
            "allotment_status": "Allotted",
            "allotted_to_other": True,
            "message": f"Dag No. {clean_dag} is registered under owner '{primary_match.owner_name}' in the registry.",
            "conflict_record": primary_match.to_dict()
        }


def check_assam_land_validity(record):
    """
    Checks if land record fields conform to standard Assam revenue rules:
    - Dag Number syntax (digits with optional /Ka, /Kha, /A, /1, etc.)
    - Assam land area notation (B-K-L: Bigha, Katha, Lessa e.g. 2B-1K-5L)
    - Required fields
    """
    issues = []
    
    # 1. Required fields
    req = ['owner_name', 'dag_number', 'patta_number', 'village', 'district', 'area']
    missing = [f for f in req if not getattr(record, f, None)]
    if missing:
        issues.append(f"Missing mandatory field(s): {', '.join(missing)}")

    # 2. Dag Number format
    dag = getattr(record, 'dag_number', None)
    if dag:
        dag_str = str(dag).strip()
        # Accept numeric or numeric with standard Assam cadastral sub-plot extensions (/Ka, /Kha, /1, /A, -1, etc.)
        if not re.match(r'^[0-9]+([/-][0-9A-Za-z\u0980-\u09FF]+)?$', dag_str):
            issues.append(f"Unusual Dag number format: '{dag_str}'. Expected standard cadastral number (e.g. 101, 102/Ka, 105/1).")

    # 3. Area format (Assam standard: e.g. 2B-1K-5L or decimal/sq ft)
    area = getattr(record, 'area', None)
    if area:
        area_str = str(area).strip()
        bkl_pattern = r'^[0-9]+B-[0-9]+K-[0-9]+L$'
        if not re.match(bkl_pattern, area_str, re.IGNORECASE):
            if not any(unit in area_str.lower() for unit in ['bigha', 'katha', 'lessa', 'sq', 'acre', 'hectare']):
                if not area_str.replace('.', '', 1).isdigit():
                    issues.append(f"Invalid area format: '{area_str}'. Expected Assam B-K-L format (e.g. '2B-1K-5L') or valid unit.")

    return len(issues) == 0, issues


def compare_land_record(current_record):
    """
    Compare an uploaded record against existing records using exact important field alignment.
    Returns a payload with match_count, closest_records, match_status, and explicit allotment check.
    """
    candidates = []
    for existing in LandRecord.query.filter(LandRecord.id != current_record.id).all():
        same_identity = []
        comparison_fields = [
            'owner_name', 'father_name', 'district', 'circle', 'village',
            'dag_number', 'patta_number', 'area', 'land_type'
        ]

        matched_fields = 0
        total_fields = 0
        for field in comparison_fields:
            current_value = getattr(current_record, field, '') or ''
            existing_value = getattr(existing, field, '') or ''
            if not current_value or not existing_value:
                continue
            total_fields += 1
            if current_value.strip().lower() == existing_value.strip().lower():
                matched_fields += 1
                same_identity.append(field)

        dag_match = bool(current_record.dag_number and existing.dag_number and current_record.dag_number == existing.dag_number)
        patta_match = bool(current_record.patta_number and existing.patta_number and current_record.patta_number == existing.patta_number)

        exact_parcel_match = bool(dag_match and patta_match)
        if exact_parcel_match:
            same_identity.append('dag_number+patta_number')

        if total_fields == 0:
            similarity = 0
        else:
            similarity = round((matched_fields / total_fields) * 100)

        if similarity >= 60 or (dag_match and patta_match):
            candidates.append({
                "id": existing.id,
                "owner_name": existing.owner_name,
                "district": existing.district,
                "circle": existing.circle,
                "village": existing.village,
                "dag_number": existing.dag_number,
                "patta_number": existing.patta_number,
                "area": existing.area,
                "land_type": existing.land_type,
                "status": existing.status,
                "validation_score": existing.validation_score,
                "similarity": similarity,
                "matching_fields": same_identity,
                "exact_parcel_match": exact_parcel_match
            })

    candidates.sort(key=lambda item: item['similarity'], reverse=True)
    top_matches = candidates[:5]
    match_status = 'No Match Found'
    if top_matches:
        highest = top_matches[0]['similarity']
        if highest >= 80 or top_matches[0]['exact_parcel_match']:
            match_status = 'Match Found'
        elif highest >= 60:
            match_status = 'Possible Match'
        else:
            match_status = 'No Match Found'

    # Run explicit allotment check
    allotment_result = check_plot_allotment(
        dag_number=current_record.dag_number,
        village=current_record.village,
        district=current_record.district,
        owner_name=current_record.owner_name,
        patta_number=current_record.patta_number,
        exclude_id=current_record.id
    )

    is_valid, validity_issues = check_assam_land_validity(current_record)

    return {
        "success": True,
        "record_id": current_record.id,
        "match_status": match_status,
        "match_count": len(top_matches),
        "matches": top_matches,
        "allotment_status": allotment_result["allotment_status"],
        "allotted_to_other": allotment_result["allotted_to_other"],
        "allotment_message": allotment_result["message"],
        "conflict_record": allotment_result["conflict_record"],
        "is_valid": is_valid,
        "validity_issues": validity_issues,
        "message": "Existing record comparison and allotment check completed."
    }


def validate_land_record(current_record):
    """
    Validates record completeness, formatting, and detects database conflicts/duplicates.
    Returns: (validation_score, status, notes_list)
    """
    score = 0
    warnings = []
    conflicts = []

    # 1. Required Fields Check (+20 pts)
    req_fields = ['owner_name', 'village', 'district', 'circle', 'dag_number', 'patta_number', 'area']
    missing = [f for f in req_fields if not getattr(current_record, f)]
    
    if not missing:
        score += 20
    else:
        warnings.append(f"Missing required field(s): {', '.join(missing)}")

    # 2. Format Validation (+20 pts)
    format_valid = True
    if current_record.dag_number:
        dag_str = str(current_record.dag_number).strip()
        if not all(c.isalnum() or c in '/-' for c in dag_str):
            warnings.append("Possible invalid Dag number format")
            format_valid = False

    if current_record.patta_number:
        patta_str = str(current_record.patta_number).strip()
        if not all(c.isalnum() or c in '/-' for c in patta_str):
            warnings.append("Possible invalid Patta number format")
            format_valid = False

    if current_record.area:
        area_str = str(current_record.area).strip()
        if area_str.upper() == 'INVALID':
            warnings.append("Invalid area measurement")
            format_valid = False

    if format_valid:
        score += 20

    # 3. Duplicate and Conflict Detection (+60 pts divided: 20 Duplicate, 20 Owner, 20 Area)
    # Search for matching Dag + Patta in database
    existing_match = LandRecord.query.filter(
        LandRecord.id != current_record.id,
        LandRecord.dag_number == current_record.dag_number,
        LandRecord.patta_number == current_record.patta_number,
        LandRecord.dag_number.isnot(None)
    ).first()

    if not existing_match:
        # No existing record with same Dag + Patta -> No conflicts
        score += 60
    else:
        # Conflict / Duplicate Detected!
        warnings.append(f"POSSIBLE RECORD CONFLICT DETECTED with Record #{existing_match.id}")
        
        # Check Duplicate / Owner Allotment
        if existing_match.owner_name and current_record.owner_name and existing_match.owner_name.strip().lower() == current_record.owner_name.strip().lower():
            conflicts.append(f"Duplicate entry for owner: {current_record.owner_name}")
        else:
            score += 0 # Failed owner check
            conflicts.append(
                f"CRITICAL CONFLICT: Plot already allotted to another owner! Existing: '{existing_match.owner_name}' | New: '{current_record.owner_name}'"
            )

        # Check Area Consistency
        if existing_match.area and current_record.area and existing_match.area == current_record.area:
            score += 20
        else:
            conflicts.append(f"Area Mismatch! Existing: '{existing_match.area}' | New: '{current_record.area}'")

    # Determine final status
    all_notes = warnings + conflicts
    notes_json = json.dumps(all_notes)

    if conflicts:
        status = "Needs Review" if score >= 60 else "Conflict"
    elif score >= 90:
        status = "Verified"
    elif score >= 60:
        status = "Needs Review"
    else:
        status = "Needs Review"

    return score, status, notes_json