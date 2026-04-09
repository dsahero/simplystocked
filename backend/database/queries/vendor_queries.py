from sqlalchemy.orm import Session
from sqlalchemy import text


def get_all_vendors(db: Session):
    result = db.execute(
        text("""
            SELECT VendorId, VendorName, Email, Phone, HQAddress, HQCity, HQState, HQZip
            FROM Vendor
            ORDER BY VendorName
        """)
    )
    return result.mappings().all()


def get_vendor_by_id(db: Session, vendor_id: int):
    result = db.execute(
        text("""
            SELECT VendorId, VendorName, Email, Phone, HQAddress, HQCity, HQState, HQZip
            FROM Vendor
            WHERE VendorId = :vendor_id
        """),
        {"vendor_id": vendor_id}
    )
    return result.mappings().first()


def create_vendor(db: Session, vendor_name: str, email: str, phone: str,
                  hq_address: str, hq_city: str, hq_state: str, hq_zip: str) -> int:
    result = db.execute(
        text("""
            INSERT INTO Vendor (VendorName, Email, Phone, HQAddress, HQCity, HQState, HQZip)
            VALUES (:vendor_name, :email, :phone, :hq_address, :hq_city, :hq_state, :hq_zip)
        """),
        {"vendor_name": vendor_name, "email": email, "phone": phone,
         "hq_address": hq_address, "hq_city": hq_city, "hq_state": hq_state, "hq_zip": hq_zip}
    )
    db.commit()
    return result.lastrowid


def update_vendor(db: Session, vendor_id: int, vendor_name: str, email: str, phone: str,
                  hq_address: str, hq_city: str, hq_state: str, hq_zip: str):
    db.execute(
        text("""
            UPDATE Vendor
            SET VendorName = :vendor_name, Email = :email, Phone = :phone,
                HQAddress = :hq_address, HQCity = :hq_city, HQState = :hq_state, HQZip = :hq_zip
            WHERE VendorId = :vendor_id
        """),
        {"vendor_name": vendor_name, "email": email, "phone": phone,
         "hq_address": hq_address, "hq_city": hq_city, "hq_state": hq_state, "hq_zip": hq_zip,
         "vendor_id": vendor_id}
    )
    db.commit()


def delete_vendor(db: Session, vendor_id: int):
    db.execute(
        text("DELETE FROM Vendor WHERE VendorId = :vendor_id"),
        {"vendor_id": vendor_id}
    )
    db.commit()
