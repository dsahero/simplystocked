from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database.db import get_db
from controllers import vendor_controller

router = APIRouter(prefix="/vendors", tags=["Vendors"])


class VendorRequest(BaseModel):
    vendor_name: str
    email: str
    phone: str
    hq_address: str
    hq_city: str
    hq_state: str
    hq_zip: str


@router.get("/")
def get_all_vendors(db: Session = Depends(get_db)):
    return vendor_controller.get_all_vendors(db)


@router.get("/{vendor_id}")
def get_vendor_by_id(vendor_id: int, db: Session = Depends(get_db)):
    return vendor_controller.get_vendor_by_id(db, vendor_id)


@router.post("/")
def create_vendor(body: VendorRequest, db: Session = Depends(get_db)):
    return vendor_controller.create_vendor(
        db, body.vendor_name, body.email, body.phone, body.hq_address,
        body.hq_city, body.hq_state, body.hq_zip
    )


@router.put("/{vendor_id}")
def update_vendor(vendor_id: int, body: VendorRequest, db: Session = Depends(get_db)):
    return vendor_controller.update_vendor(
        db, vendor_id, body.vendor_name, body.email, body.phone, body.hq_address,
        body.hq_city, body.hq_state, body.hq_zip
    )


@router.delete("/{vendor_id}")
def delete_vendor(vendor_id: int, db: Session = Depends(get_db)):
    return vendor_controller.delete_vendor(db, vendor_id)
