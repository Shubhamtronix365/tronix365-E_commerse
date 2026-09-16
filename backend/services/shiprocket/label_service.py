import logging
from typing import Any, Dict
from sqlalchemy.orm import Session
from models import OrderDB
from .client import shiprocket_client

logger = logging.getLogger("shiprocket.label")

class ShiprocketLabelService:
    """
    Handles generation of official Shiprocket shipping labels and manifests.
    """

    def generate_label(self, order_id: int, db: Session) -> Dict[str, Any]:
        """
        Generates a printable PDF shipping label URL for the order's shipment.
        """
        order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
        if not order:
            raise ValueError(f"Order #{order_id} not found.")

        if not order.shiprocket_shipment_id:
            raise ValueError(f"Order #{order_id} has no Shiprocket shipment ID. Create shipment first.")

        shipment_id_int = int(order.shiprocket_shipment_id) if str(order.shiprocket_shipment_id).isdigit() else order.shiprocket_shipment_id
        payload = {"shipment_id": [shipment_id_int]}

        logger.info(f"Generating shipping label for Order #{order_id} (Shipment: {shipment_id_int})")
        res = shiprocket_client.post("/courier/generate/label", json_data=payload)

        label_url = res.get("label_url") or res.get("response", {}).get("label_url")
        if not label_url:
            raise ValueError(f"Failed to generate shipping label from Shiprocket. Response: {res}")

        # Cache label URL in database
        order.shiprocket_label_url = label_url
        db.commit()
        db.refresh(order)

        logger.info(f"Shipping label URL created for Order #{order_id}: {label_url}")

        return {
            "message": "Shipping label generated successfully",
            "order_id": order.id,
            "shipment_id": order.shiprocket_shipment_id,
            "label_url": label_url,
        }

    def generate_manifest(self, order_id: int, db: Session) -> Dict[str, Any]:
        """
        Generates a pickup manifest PDF URL for the order's shipment.
        """
        order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
        if not order:
            raise ValueError(f"Order #{order_id} not found.")

        if not order.shiprocket_shipment_id:
            raise ValueError(f"Order #{order_id} has no Shiprocket shipment ID.")

        shipment_id_int = int(order.shiprocket_shipment_id) if str(order.shiprocket_shipment_id).isdigit() else order.shiprocket_shipment_id
        payload = {"shipment_id": [shipment_id_int]}

        res = shiprocket_client.post("/manifests/generate", json_data=payload)
        manifest_url = res.get("manifest_url")

        if manifest_url:
            order.shiprocket_manifest_url = manifest_url
            db.commit()
            db.refresh(order)

        return {
            "message": "Manifest generated successfully",
            "manifest_url": manifest_url,
        }

shiprocket_label = ShiprocketLabelService()
