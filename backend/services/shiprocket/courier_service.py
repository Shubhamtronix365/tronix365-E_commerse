import logging
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from models import OrderDB
from .client import shiprocket_client
from .serviceability_service import shiprocket_serviceability

logger = logging.getLogger("shiprocket.courier")

class ShiprocketCourierService:
    """
    Handles courier selection, rate discovery, and AWB (Air Waybill) generation for shipments.
    """

    def get_available_couriers_for_order(self, order_id: int, db: Session) -> Dict[str, Any]:
        """
        Retrieves available couriers and rates for an order that has a created shipment.
        """
        order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
        if not order:
            raise ValueError(f"Order #{order_id} not found.")

        if not order.pincode:
            raise ValueError(f"Order #{order_id} has no delivery PIN code.")

        return shiprocket_serviceability.check_serviceability(
            delivery_pincode=order.pincode,
            weight_kg=0.5,
            is_cod=False,
        )

    def assign_awb(
        self, order_id: int, db: Session, courier_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Assigns an AWB code and courier to the order's Shiprocket shipment.
        If courier_id is not provided, Shiprocket will assign the recommended courier.
        """
        order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
        if not order:
            raise ValueError(f"Order #{order_id} not found.")

        if not order.shiprocket_shipment_id:
            raise ValueError(f"Order #{order_id} has no Shiprocket shipment. Please create shipment first.")

        if order.shiprocket_awb_code:
            logger.info(f"Order #{order_id} already has AWB {order.shiprocket_awb_code}. Returning existing AWB.")
            return {
                "message": "AWB already assigned to this shipment",
                "awb_code": order.shiprocket_awb_code,
                "courier_name": order.shiprocket_courier_name,
                "courier_id": order.shiprocket_courier_id,
            }

        payload: Dict[str, Any] = {
            "shipment_id": int(order.shiprocket_shipment_id)
            if str(order.shiprocket_shipment_id).isdigit()
            else order.shiprocket_shipment_id
        }
        if courier_id:
            payload["courier_id"] = int(courier_id)

        logger.info(f"Assigning AWB for Order #{order_id} (Shipment: {order.shiprocket_shipment_id}, Courier ID: {courier_id})")
        res = shiprocket_client.post("/courier/assign/awb", json_data=payload)

        data = res.get("response", {}).get("data", {}) or res.get("data", {})
        awb_code = data.get("awb_code") or res.get("awb_code")
        courier_name = data.get("courier_name") or res.get("courier_name") or "Shiprocket Courier"
        assigned_courier_id = data.get("courier_company_id") or courier_id

        if not awb_code:
            raise ValueError(f"AWB assignment failed to return an AWB tracking code. Response: {res}")

        # Update order in database
        order.shiprocket_awb_code = str(awb_code)
        order.shiprocket_courier_name = str(courier_name)
        if assigned_courier_id:
            try:
                order.shiprocket_courier_id = int(assigned_courier_id)
            except Exception:
                pass
        order.shiprocket_status = "AWB ASSIGNED"
        
        # Synchronize with core order tracking fields
        order.courier = courier_name
        order.tracking_number = str(awb_code)
        if order.status == "pending":
            order.status = "confirmed"

        db.commit()
        db.refresh(order)

        logger.info(f"AWB {awb_code} successfully assigned to Order #{order_id} via {courier_name}")

        return {
            "message": "AWB successfully generated and assigned",
            "order_id": order.id,
            "shipment_id": order.shiprocket_shipment_id,
            "awb_code": str(awb_code),
            "courier_name": courier_name,
            "courier_id": assigned_courier_id,
        }

shiprocket_courier = ShiprocketCourierService()
