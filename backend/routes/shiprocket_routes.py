import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from sqlalchemy.orm import Session

from database import get_db
from models import OrderDB, UserDB
from deps import get_current_user, get_current_admin
from services.shiprocket import (
    shiprocket_config,
    shiprocket_serviceability,
    shiprocket_shipment,
    shiprocket_courier,
    shiprocket_label,
    shiprocket_pickup,
    shiprocket_tracking,
    shiprocket_cancellation,
    shiprocket_automation,
)

logger = logging.getLogger("shiprocket.routes")
router = APIRouter(prefix="/api/shipping", tags=["Shipping & Logistics"])


# =====================================================================
# PUBLIC / CUSTOMER SHIPPING ENDPOINTS
# =====================================================================

@router.get("/serviceability")
async def check_pincode_serviceability(
    pincode: str = Query(..., description="Customer destination 6-digit PIN code"),
    weight: float = Query(0.5, description="Package weight in kg"),
):
    """
    Checks whether a delivery PIN code is serviceable by Shiprocket couriers.
    Provides delivery speed and courier options.
    """
    if not shiprocket_config.is_configured:
        # Graceful fallback when Shiprocket credentials are not yet configured in environment
        return {
            "is_serviceable": True,
            "delivery_pincode": pincode,
            "pickup_pincode": shiprocket_config.pickup_pincode,
            "total_couriers": 1,
            "available_couriers": [
                {
                    "courier_name": "Standard Surface Courier",
                    "etd": "3-5 business days",
                    "rate": 69.0,
                    "rating": 4.5,
                }
            ],
            "fastest_etd": "3-5 business days",
            "recommended_courier": "Standard Surface Courier",
            "is_mock_fallback": True,
        }

    try:
        result = shiprocket_serviceability.check_serviceability(
            delivery_pincode=pincode,
            weight_kg=weight,
            is_cod=False,
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error checking serviceability for PIN {pincode}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check courier serviceability: {str(e)}")


@router.get("/orders/{order_id}/tracking")
async def get_customer_order_tracking(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user),
):
    """
    Retrieves real-time shipment tracking for an order.
    Ensures that customers can only view tracking for their own orders.
    """
    order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail=f"Order #{order_id} not found.")

    if order.customer_email != current_user.email and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to access tracking for this order.")

    try:
        tracking_info = shiprocket_tracking.track_order(order_id, db)
        return tracking_info
    except Exception as e:
        logger.error(f"Tracking error for order #{order_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Unable to retrieve tracking details: {str(e)}")


# =====================================================================
# ADMIN LOGISTICS MANAGEMENT ENDPOINTS
# =====================================================================

@router.post("/admin/orders/{order_id}/check-serviceability")
async def admin_check_order_serviceability(
    order_id: int,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    """
    Checks courier serviceability and available rates specifically for an order's address and dimensions.
    """
    order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if not order.pincode:
        raise HTTPException(status_code=400, detail="Order has no delivery PIN code.")

    try:
        return shiprocket_serviceability.check_serviceability(
            delivery_pincode=order.pincode,
            weight_kg=0.5,
            is_cod=False,
        )
    except Exception as e:
        logger.error(f"Serviceability check failed for order #{order_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/orders/{order_id}/create-shipment")
async def admin_create_shipment(
    order_id: int,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    """
    Creates a new adhoc shipment in Shiprocket for the order.
    Validates product weights, dimensions, customer phone, and prevents duplicate creation.
    """
    try:
        return shiprocket_shipment.create_shipment(order_id, db)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Shipment creation failed for order #{order_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create Shiprocket shipment: {str(e)}")


@router.get("/admin/orders/{order_id}/couriers")
async def admin_get_available_couriers(
    order_id: int,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    """
    Fetches all available couriers and rates for this order's shipment.
    """
    try:
        return shiprocket_courier.get_available_couriers_for_order(order_id, db)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Could not fetch couriers for order #{order_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/orders/{order_id}/assign-awb")
async def admin_assign_awb(
    order_id: int,
    courier_id: Optional[int] = Body(None, embed=True),
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    """
    Assigns a courier and generates an AWB tracking number for the order.
    """
    try:
        return shiprocket_courier.assign_awb(order_id, db, courier_id=courier_id)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"AWB assignment failed for order #{order_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to assign AWB: {str(e)}")


@router.post("/admin/orders/{order_id}/generate-label")
async def admin_generate_shipping_label(
    order_id: int,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    """
    Generates and returns the official printable PDF shipping label URL from Shiprocket.
    """
    try:
        return shiprocket_label.generate_label(order_id, db)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Label generation failed for order #{order_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate label: {str(e)}")


@router.post("/admin/orders/{order_id}/request-pickup")
async def admin_request_pickup(
    order_id: int,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    """
    Schedules courier pickup for the order.
    """
    try:
        return shiprocket_pickup.request_pickup(order_id, db)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Pickup request failed for order #{order_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to schedule pickup: {str(e)}")


@router.get("/admin/orders/{order_id}/track")
async def admin_track_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    """
    Fetches real-time tracking scans from Shiprocket and syncs with order history.
    """
    try:
        return shiprocket_tracking.track_order(order_id, db)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Admin tracking failed for order #{order_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to track order: {str(e)}")


@router.post("/admin/orders/{order_id}/cancel-shipment")
async def admin_cancel_shipment(
    order_id: int,
    reason: Optional[str] = Body("Cancelled by Store Administrator", embed=True),
    db: Session = Depends(get_db),
    current_admin: UserDB = Depends(get_current_admin),
):
    """
    Cancels the active Shiprocket shipment / AWB for the order.
    """
    try:
        return shiprocket_cancellation.cancel_shipment(order_id, db, reason=reason)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Shipment cancellation failed for order #{order_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to cancel shipment: {str(e)}")


@router.post("/webhook")
async def shiprocket_webhook_listener(
    payload: Dict[str, Any] = Body(...),
):
    """
    Receives real-time order tracking & AWB webhooks from Shiprocket.
    Updates order statuses (In Transit, Out for Delivery, Delivered, Cancelled) automatically.
    """
    logger.info(f"Received Shiprocket webhook payload: {payload}")
    return shiprocket_automation.process_shiprocket_webhook(payload)

