from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from database.queries import vendor_queries


def get_all_vendors(db: Session) -> list:
    return [dict(v) for v in vendor_queries.get_all_vendors(db)]


def get_vendor_by_id(db: Session, vendor_id: int) -> dict:
    vendor = vendor_queries.get_vendor_by_id(db, vendor_id)
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    return dict(vendor)


def create_vendor(db: Session, email: str, phone: str, hq_address: str,
                  hq_city: str, hq_state: str, hq_zip: str) -> dict:
    vendor_id = vendor_queries.create_vendor(db, email, phone, hq_address, hq_city, hq_state, hq_zip)
    return {
        "VendorId": vendor_id, "Email": email, "Phone": phone,
        "HQAddress": hq_address, "HQCity": hq_city, "HQState": hq_state, "HQZip": hq_zip
    }


def update_vendor(db: Session, vendor_id: int, email: str, phone: str,
                  hq_address: str, hq_city: str, hq_state: str, hq_zip: str) -> dict:
    vendor = vendor_queries.get_vendor_by_id(db, vendor_id)
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    vendor_queries.update_vendor(db, vendor_id, email, phone, hq_address, hq_city, hq_state, hq_zip)
    return {
        "VendorId": vendor_id, "Email": email, "Phone": phone,
        "HQAddress": hq_address, "HQCity": hq_city, "HQState": hq_state, "HQZip": hq_zip
    }


def delete_vendor(db: Session, vendor_id: int) -> dict:
    vendor = vendor_queries.get_vendor_by_id(db, vendor_id)
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
    vendor_queries.delete_vendor(db, vendor_id)
    return {"message": f"Vendor {vendor_id} deleted"}
