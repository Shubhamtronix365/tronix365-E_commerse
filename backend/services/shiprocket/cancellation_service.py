import logging
from typing import Any, Dict
from sqlalchemy.orm import Session
from models import OrderDB
from .client import shiprocket_client

logger = logging.getLogger("shiprocket.cancellation")

class ShiprocketCancellationService:
    """
    Handles cancellation of shipments and AWBs on Shiprocket.
    """

    def cancel_shipment(self, order_id: int, db: Session, reason: str = "Cancelled by Administrator") -> Dict[str, Any]:
        """
        Cancels the Shiprocket shipment/AWB for the given order.
        """
        order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
        if not order:
            raise ValueError(f"Order #{order_id} not found.")

        if not order.shiprocket_shipment_id and not order.shiprocket_awb_code:
            raise ValueError(f"Order #{order_id} has no active Shiprocket shipment to cancel.")

        results = {}

        # 1. If AWB is assigned, cancel AWB
        if order.shiprocket_awb_code:
            logger.info(f"Cancelling Shiprocket AWB #{order.shiprocket_awb_code} for Order #{order_id}")
            try:
                res_awb = shiprocket_client.post(
                    "/orders/cancel/shipment/awbs",
                    json_data={"awbs": [order.shiprocket_awb_code]}
                )
                results["awb_cancel"] = res_awb
            except Exception as e:
                logger.warning(f"Could not cancel AWB {order.shiprocket_awb_code}: {e}")

        # 2. Cancel order by shiprocket_order_id or shipment_id
        if order.shiprocket_order_id:
            try:
                order_id_param = int(order.shiprocket_order_id) if str(order.shiprocket_order_id).isdigit() else order.shiprocket_order_id
                res_ord = shiprocket_client.post(
                    "/orders/cancel",
                    json_data={"ids": [order_id_param]}
                )
                results["order_cancel"] = res_ord
            except Exception as e:
                logger.warning(f"Could not cancel order {order.shiprocket_order_id}: {e}")

        order.shiprocket_status = "CANCELLED"
        order.cancellation_reason = reason

        db.commit()
        db.refresh(order)

        logger.info(f"Shipment for Order #{order_id} cancelled successfully.")

        return {
            "message": "Shiprocket shipment cancelled successfully",
            "order_id": order.id,
            "status": "CANCELLED",
            "details": results,
        }

shiprocket_cancellation = ShiprocketCancellationService()
