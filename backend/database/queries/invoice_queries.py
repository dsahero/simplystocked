from sqlalchemy.orm import Session
from sqlalchemy import text


def get_all_invoices(db: Session):
    result = db.execute(text("""
        SELECT i.InvoiceId, i.Date, i.`Desc`, i.TotalPrice,
               v.VendorId, v.VendorName, v.Email AS VendorEmail, v.HQCity AS VendorCity
        FROM Invoice i
        JOIN Vendor v ON i.VendorId = v.VendorId
        ORDER BY i.Date DESC
    """))
    return result.mappings().all()


def get_invoice_by_id(db: Session, invoice_id: int):
    invoice = db.execute(text("""
        SELECT i.InvoiceId, i.Date, i.`Desc`, i.TotalPrice, i.VendorId,
               v.VendorName, v.Email AS VendorEmail, v.Phone AS VendorPhone,
               v.HQAddress, v.HQCity, v.HQState, v.HQZip,
               frm.Attn AS FromAttn, frm.Address AS FromAddress,
               frm.City AS FromCity, frm.State AS FromState,
               frm.Zip AS FromZip, frm.Phone AS FromPhone,
               bil.Attn AS BillToAttn, bil.Address AS BillToAddress,
               bil.City AS BillToCity, bil.State AS BillToState,
               bil.Zip AS BillToZip, bil.Email AS BillToEmail,
               del.Attn AS DeliveryAttn, del.Address AS DeliveryAddress,
               del.City AS DeliveryCity, del.State AS DeliveryState,
               del.Zip AS DeliveryZip
        FROM Invoice i
        JOIN Vendor v ON i.VendorId = v.VendorId
        LEFT JOIN InvoiceAddressDetails frm ON i.InvoiceFromId = frm.InvoiceAddressDetailsId
        LEFT JOIN InvoiceAddressDetails bil ON i.InvoiceBillToId = bil.InvoiceAddressDetailsId
        LEFT JOIN InvoiceAddressDetails del ON i.InvoiceDeliveryId = del.InvoiceAddressDetailsId
        WHERE i.InvoiceId = :invoice_id
    """), {"invoice_id": invoice_id})

    items = db.execute(text("""
        SELECT ii.InvoiceItemId, ii.Quantity, ii.UnitPrice,
               fp.FoodProductId, fp.ProductName,
               c.CategoryName
        FROM InvoiceItem ii
        JOIN FoodProduct fp ON ii.FoodProductId = fp.FoodProductId
        JOIN Category c ON fp.CategoryId = c.CategoryId
        WHERE ii.InvoiceId = :invoice_id
        ORDER BY fp.ProductName
    """), {"invoice_id": invoice_id})

    return invoice.mappings().first(), items.mappings().all()


def get_invoices_by_vendor(db: Session, vendor_id: int):
    result = db.execute(text("""
        SELECT i.InvoiceId, i.Date, i.`Desc`, i.TotalPrice
        FROM Invoice i
        WHERE i.VendorId = :vendor_id
        ORDER BY i.Date DESC
    """), {"vendor_id": vendor_id})
    return result.mappings().all()


def create_invoice_address(db: Session, attn: str, address: str, city: str,
                           state: str, zip_code: str, phone: str, email: str) -> int:
    result = db.execute(text("""
        INSERT INTO InvoiceAddressDetails (Attn, Address, City, State, Zip, Phone, Email)
        VALUES (:attn, :address, :city, :state, :zip, :phone, :email)
    """), {"attn": attn, "address": address, "city": city, "state": state,
           "zip": zip_code, "phone": phone, "email": email})
    db.commit()
    return result.lastrowid


def create_invoice(db: Session, date: str, desc: str, total_price: float,
                   vendor_id: int, from_id: int, bill_to_id: int, delivery_id: int) -> int:
    result = db.execute(text("""
        INSERT INTO Invoice (Date, `Desc`, TotalPrice, VendorId, InvoiceFromId, InvoiceBillToId, InvoiceDeliveryId)
        VALUES (:date, :desc, :total_price, :vendor_id, :from_id, :bill_to_id, :delivery_id)
    """), {"date": date, "desc": desc, "total_price": total_price,
           "vendor_id": vendor_id, "from_id": from_id,
           "bill_to_id": bill_to_id, "delivery_id": delivery_id})
    db.commit()
    return result.lastrowid


def add_invoice_item(db: Session, invoice_id: int, product_id: int,
                     quantity: int, unit_price: float) -> int:
    result = db.execute(text("""
        INSERT INTO InvoiceItem (InvoiceId, FoodProductId, Quantity, UnitPrice)
        VALUES (:invoice_id, :product_id, :quantity, :unit_price)
    """), {"invoice_id": invoice_id, "product_id": product_id,
           "quantity": quantity, "unit_price": unit_price})
    db.commit()
    return result.lastrowid


def update_invoice_total(db: Session, invoice_id: int):
    """Recalculate invoice total from its line items."""
    db.execute(text("""
        UPDATE Invoice i
        SET TotalPrice = (
            SELECT COALESCE(SUM(ii.Quantity * ii.UnitPrice), 0)
            FROM InvoiceItem ii
            WHERE ii.InvoiceId = i.InvoiceId
        )
        WHERE i.InvoiceId = :invoice_id
    """), {"invoice_id": invoice_id})
    db.commit()
