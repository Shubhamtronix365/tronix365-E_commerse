import logging
from typing import Any, Dict
from sqlalchemy.orm import Session
from models import OrderDB
from .client import shiprocket_client

logger = logging.getLogger("shiprocket.pickup")

class ShiprocketPickupService:
    """
    Handles scheduling courier pickup requests for shipments.
    """

    def request_pickup(self, order_id: int, db: Session) -> Dict[str, Any]:
        """
        Requests courier pickup for the order's shipment via Shiprocket.
        """
        order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
        if not order:
            raise ValueError(f"Order #{order_id} not found.")

        if not order.shiprocket_shipment_id:
            raise ValueError(f"Order #{order_id} has no Shiprocket shipment ID. Create shipment first.")

        if not order.shiprocket_awb_code:
            raise ValueError(f"Order #{order_id} has no AWB assigned. Please assign courier/AWB before requesting pickup.")

        shipment_id_int = int(order.shiprocket_shipment_id) if str(order.shiprocket_shipment_id).isdigit() else order.shiprocket_shipment_id
        payload = {"shipment_id": [shipment_id_int]}

        logger.info(f"Requesting courier pickup for Order #{order_id} (Shipment: {shipment_id_int})")
        res = shiprocket_client.post("/courier/generate/pickup", json_data=payload)

        data = res.get("response", {})
        pickup_token = (
            data.get("pickup_token_number")
            or res.get("pickup_token_number")
            or res.get("pickup_id")
            or "SCHEDULED"
        )

        order.shiprocket_pickup_token = str(pickup_token)
        order.shiprocket_status = "PICKUP SCHEDULED"
        if order.status in ["confirmed", "pending"]:
            order.status = "shipped"

        db.commit()
        db.refresh(order)

        logger.info(f"Courier pickup successfully scheduled for Order #{order_id} (Token: {pickup_token})")

        return {
            "message": "Courier pickup scheduled successfully",
            "order_id": order.id,
            "shipment_id": order.shiprocket_shipment_id,
            "pickup_token": str(pickup_token),
            "status": "PICKUP SCHEDULED",
        }

shiprocket_pickup = ShiprocketPickupService()
