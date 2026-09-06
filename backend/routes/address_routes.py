from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import (
    AddressDB,
    AddressCreate,
    AddressUpdate,
    AddressResponse,
    UserDB,
)
from deps import get_current_user

router = APIRouter(tags=["Addresses"])


@router.get("/addresses", response_model=List[AddressResponse])
async def get_user_addresses(
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all saved addresses for the logged-in user, default address first."""
    return (
        db.query(AddressDB)
        .filter(AddressDB.user_id == current_user.id)
        .order_by(AddressDB.is_default.desc(), AddressDB.created_at.desc())
        .all()
    )


@router.post("/addresses", response_model=AddressResponse, status_code=201)
async def create_user_address(
    address_data: AddressCreate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new delivery address for the logged-in user."""
    user_addr_count = db.query(AddressDB).filter(AddressDB.user_id == current_user.id).count()
    is_default = bool(address_data.is_default) or user_addr_count == 0

    if is_default:
        db.query(AddressDB).filter(AddressDB.user_id == current_user.id).update({"is_default": False})

    new_address = AddressDB(
        user_id=current_user.id,
        label=address_data.label or "Home",
        full_name=address_data.full_name,
        phone=address_data.phone,
        address_line=address_data.address_line,
        landmark=address_data.landmark,
        city=address_data.city,
        state=address_data.state,
        pincode=address_data.pincode,
        is_default=is_default,
        is_gst_invoice=bool(address_data.is_gst_invoice),
        company_name=address_data.company_name,
        gstin=address_data.gstin,
    )
    db.add(new_address)
    db.commit()
    db.refresh(new_address)
    return new_address


@router.put("/addresses/{address_id}", response_model=AddressResponse)
async def update_user_address(
    address_id: int,
    address_data: AddressUpdate,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an existing saved address."""
    addr = db.query(AddressDB).filter(AddressDB.id == address_id, AddressDB.user_id == current_user.id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")

    update_dict = address_data.dict(exclude_unset=True)
    if update_dict.get("is_default"):
        db.query(AddressDB).filter(AddressDB.user_id == current_user.id).update({"is_default": False})

    for k, v in update_dict.items():
        setattr(addr, k, v)

    db.commit()
    db.refresh(addr)
    return addr


@router.delete("/addresses/{address_id}")
async def delete_user_address(
    address_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a saved address."""
    addr = db.query(AddressDB).filter(AddressDB.id == address_id, AddressDB.user_id == current_user.id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")

    was_default = addr.is_default
    db.delete(addr)
    db.commit()

    if was_default:
        remaining = db.query(AddressDB).filter(AddressDB.user_id == current_user.id).order_by(AddressDB.created_at.desc()).first()
        if remaining:
            remaining.is_default = True
            db.commit()

    return {"message": "Address deleted successfully"}


@router.put("/addresses/{address_id}/set-default", response_model=AddressResponse)
async def set_default_address(
    address_id: int,
    current_user: UserDB = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set the specified address as the user's primary default address."""
    addr = db.query(AddressDB).filter(AddressDB.id == address_id, AddressDB.user_id == current_user.id).first()
    if not addr:
        raise HTTPException(status_code=404, detail="Address not found")

    db.query(AddressDB).filter(AddressDB.user_id == current_user.id).update({"is_default": False})
    addr.is_default = True
    db.commit()
    db.refresh(addr)
    return addr
