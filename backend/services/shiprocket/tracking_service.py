import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from models import OrderDB
from .client import shiprocket_client

logger = logging.getLogger("shiprocket.tracking")

# Milestone hierarchy for tracking progression
TRACKING_MILESTONES = [
    {"key": "order_confirmed", "label": "Order Confirmed"},
    {"key": "processing", "label": "Processing"},
    {"key": "shipment_created", "label": "Shipment Created"},
    {"key": "pickup_scheduled", "label": "Pickup Scheduled"},
    {"key": "picked_up", "label": "Picked Up"},
    {"key": "in_transit", "label": "In Transit"},
    {"key": "out_for_delivery", "label": "Out for Delivery"},
    {"key": "delivered", "label": "Delivered"},
]

class ShiprocketTrackingService:
    """
    Fetches, parses, and normalizes real-time tracking scans from Shiprocket API.
    Updates the database with fresh tracking scans and current delivery status.
    """

    def map_shiprocket_status(self, raw_status: str) -> str:
        """Normalizes Shiprocket status into a standard status string."""
        s = (raw_status or "").strip().upper()
        if "DELIVERED" in s:
            return "Delivered"
        if "OUT FOR DELIVERY" in s:
            return "Out for Delivery"
        if "IN TRANSIT" in s or "REACHED AT" in s:
            return "In Transit"
        if "PICKED UP" in s or "PICKUP DONE" in s:
            return "Picked Up"
        if "PICKUP SCHEDULED" in s or "PICKUP QUEUED" in s:
            return "Pickup Scheduled"
        if "AWB ASSIGNED" in s:
            return "Shipment Created"
        if "CANCELLED" in s or "CANCELED" in s:
            return "Cancelled"
        if "RTO" in s or "RETURN" in s:
            return "Returned"
        if "FAILED" in s or "UNDELIVERED" in s:
            return "Delivery Failed"
        return raw_status or "Processing"

    def track_order(self, order_id: int, db: Session) -> Dict[str, Any]:
        """
        Retrieves real-time tracking information from Shiprocket for a specific order.
        Updates order tracking columns and scan activities.
        """
        order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
        if not order:
            raise ValueError(f"Order #{order_id} not found.")

        # If no Shiprocket shipment exists, build basic internal order tracking
        if not order.shiprocket_awb_code and not order.shiprocket_shipment_id:
            return {
                "order_id": order.id,
                "current_status": (order.status or "Pending").capitalize(),
                "courier_name": order.courier,
                "awb_code": order.tracking_number,
                "shipment_id": None,
                "activities": [
                    {
                        "date": order.created_at.strftime("%Y-%m-%d %H:%M") if order.created_at else "",
                        "status": "Order Placed",
                        "activity": "Order received and pending verification.",
                        "location": "Tronix365 Store",
                    }
                ],
                "milestones": TRACKING_MILESTONES,
                "active_step": 0 if order.status == "pending" else 1,
            }

        data = {}
        # 1. Primary track via AWB code
        if order.shiprocket_awb_code:
            try:
                data = shiprocket_client.get(f"/courier/track/awb/{order.shiprocket_awb_code}")
            except Exception as e:
                logger.warning(f"Could not track by AWB {order.shiprocket_awb_code}: {e}")

        # 2. Fallback to track by shipment ID
        if not data and order.shiprocket_shipment_id:
            try:
                data = shiprocket_client.get(f"/courier/track/shipment/{order.shiprocket_shipment_id}")
            except Exception as e:
                logger.warning(f"Could not track by shipment {order.shiprocket_shipment_id}: {e}")

        tracking_data = data.get("tracking_data", {})
        track_status = tracking_data.get("track_status", 0)
        shipment_track = tracking_data.get("shipment_track", [])
        
        current_status_raw = ""
        etd = tracking_data.get("etd", "")
        if shipment_track and len(shipment_track) > 0:
            current_status_raw = shipment_track[0].get("current_status", "")

        if not current_status_raw:
            current_status_raw = order.shiprocket_status or "Shipment Created"

        normalized_status = self.map_shiprocket_status(current_status_raw)

        # Parse scan activities
        scans_raw = tracking_data.get("shipment_track_activities", [])
        activities = []
        for scan in scans_raw:
            activities.append({
                "date": scan.get("date") or scan.get("time") or "",
                "status": scan.get("status") or "",
                "activity": scan.get("activity") or scan.get("sr-status") or "",
                "location": scan.get("location") or "",
            })

        # If no scans yet from courier API, provide synthesized baseline events
        if not activities:
            if order.shiprocket_pickup_token:
                activities.append({
                    "date": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
                    "status": "Pickup Scheduled",
                    "activity": f"Courier pickup scheduled with token: {order.shiprocket_pickup_token}",
                    "location": "Pune Fulfillment Center",
                })
            if order.shiprocket_awb_code:
                activities.append({
                    "date": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
                    "status": "AWB Assigned",
                    "activity": f"AWB #{order.shiprocket_awb_code} assigned with {order.shiprocket_courier_name or 'courier'}",
                    "location": "Pune Fulfillment Center",
                })
            if order.shiprocket_created_at:
                activities.append({
                    "date": order.shiprocket_created_at.strftime("%Y-%m-%d %H:%M"),
                    "status": "Shipment Created",
                    "activity": f"Shipment #{order.shiprocket_shipment_id} registered with Shiprocket",
                    "location": "Tronix365 Dispatch",
                })

        # Determine active milestone step index (0 to 7)
        step_map = {
            "Order Confirmed": 0,
            "Processing": 1,
            "Shipment Created": 2,
            "Pickup Scheduled": 3,
            "Picked Up": 4,
            "In Transit": 5,
            "Out for Delivery": 6,
            "Delivered": 7,
        }
        active_step = step_map.get(normalized_status, 2)

        # Update order in DB
        order.shiprocket_status = normalized_status
        order.shiprocket_tracking_data = {
            "status": normalized_status,
            "etd": etd,
            "activities": activities,
            "last_synced": datetime.utcnow().isoformat(),
        }
        order.shiprocket_last_tracking_update = datetime.utcnow()

        # Synchronize order.status with delivery milestones
        if normalized_status == "Delivered":
            order.status = "delivered"
        elif normalized_status == "Out for Delivery":
            order.status = "out_for_delivery"
        elif normalized_status in ["In Transit", "Picked Up"]:
            order.status = "shipped"

        db.commit()
        db.refresh(order)

        return {
            "order_id": order.id,
            "current_status": normalized_status,
            "courier_name": order.shiprocket_courier_name or order.courier or "Shiprocket Logistics",
            "awb_code": order.shiprocket_awb_code or order.tracking_number,
            "shipment_id": order.shiprocket_shipment_id,
            "pickup_token": order.shiprocket_pickup_token,
            "etd": etd or order.estimated_delivery_date,
            "activities": activities,
            "milestones": TRACKING_MILESTONES,
            "active_step": active_step,
            "is_delivered": normalized_status == "Delivered",
            "is_cancelled": normalized_status in ["Cancelled", "Returned", "Delivery Failed"],
        }

shiprocket_tracking = ShiprocketTrackingService()
