from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session
from database.db import get_db
from controllers import invoice_controller

router = APIRouter(prefix="/invoices", tags=["Invoices"])


class AddressDetails(BaseModel):
    attn: str
    address: str
    city: str
    state: str
    zip_code: str
    phone: str
    email: str


class InvoiceLineItem(BaseModel):
    product_id: int
    quantity: int
    unit_price: float
    program: str = "open_market"  # open_market | grocery


class CreateInvoiceRequest(BaseModel):
    date: str          # YYYY-MM-DD
    desc: str
    vendor_id: int
    from_details: AddressDetails
    bill_to_details: AddressDetails
    delivery_details: AddressDetails
    items: List[InvoiceLineItem]


class AddInvoiceItemRequest(BaseModel):
    product_id: int
    quantity: int
    unit_price: float
    program: str = "open_market"


@router.get("/")
def get_all_invoices(
    vendor_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    if vendor_id is not None:
        return invoice_controller.get_invoices_by_vendor(db, vendor_id)
    return invoice_controller.get_all_invoices(db)


@router.get("/{invoice_id}")
def get_invoice_by_id(invoice_id: int, db: Session = Depends(get_db)):
    return invoice_controller.get_invoice_by_id(db, invoice_id)


@router.post("/")
def create_invoice(body: CreateInvoiceRequest, db: Session = Depends(get_db)):
    return invoice_controller.create_invoice(
        db,
        date=body.date,
        desc=body.desc,
        vendor_id=body.vendor_id,
        from_details=body.from_details.model_dump(by_alias=False),
        bill_to_details=body.bill_to_details.model_dump(by_alias=False),
        delivery_details=body.delivery_details.model_dump(by_alias=False),
        items=[item.model_dump() for item in body.items]
    )


@router.post("/{invoice_id}/items")
def add_invoice_item(invoice_id: int, body: AddInvoiceItemRequest, db: Session = Depends(get_db)):
    return invoice_controller.add_invoice_item(
        db, invoice_id, body.product_id, body.quantity, body.unit_price, body.program
    )
