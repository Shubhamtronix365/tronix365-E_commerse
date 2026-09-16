import logging
import re
from typing import Optional, Dict, Any
from database import SessionLocal
from models import OrderDB
from .config import shiprocket_config
from .shipment_service import shiprocket_shipment
from .cancellation_service import shiprocket_cancellation

logger = logging.getLogger("shiprocket.automation")

NON_SHIPROCKET_KEYWORDS = [
    "pickup",
    "store_pickup",
    "store pickup",
    "office_pickup",
    "office pickup",
    "free",
    "free_delivery",
    "free delivery",
    "self_pickup",
    "self pickup",
    "local_pickup",
    "local pickup",
]


class ShiprocketAutomationService:
    """
    Automated background worker for seamless national-level logistics orchestration:
    1. Evaluates customer delivery selection (e.g. Surface/Express vs Office Pickup/Free Delivery).
    2. Automatically creates orders in Shiprocket upon checkout/payment confirmation.
    3. Automatically cancels Shiprocket shipments when an order is cancelled in Admin Dashboard.
    4. Handles incoming Shiprocket tracking webhooks.
    """

    @staticmethod
    def is_shiprocket_eligible(shipping_method: Optional[str]) -> bool:
        """
        Determines whether an order should be dispatched to Shiprocket.
        Returns False for Store/Office pickup or Free Delivery options.
        Returns True for Surface, Express, or any courier delivery options.
        """
        if not shipping_method:
            return True

        method = shipping_method.lower().strip()
        for non_sr in NON_SHIPROCKET_KEYWORDS:
            if non_sr in method:
                return False
        return True

    def auto_create_shiprocket_shipment(self, order_id: int) -> Optional[Dict[str, Any]]:
        """
        Background task: Automatically creates the shipment in Shiprocket.
        Never raises exceptions that would interrupt web requests.
        """
        db = SessionLocal()
        try:
            order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
            if not order:
                logger.warning(f"[Shiprocket Automation] Order #{order_id} not found in database.")
                return None

            # 1. Eligibility Check
            if not self.is_shiprocket_eligible(order.shipping_method):
                logger.info(
                    f"[Shiprocket Automation] Order #{order_id} has local delivery method "
                    f"'{order.shipping_method}'. Skipping Shiprocket order creation."
                )
                return None

            # 2. Duplicate Prevention / Idempotency Check
            if order.shiprocket_shipment_id or order.shiprocket_order_id:
                logger.info(
                    f"[Shiprocket Automation] Order #{order_id} already registered in Shiprocket "
                    f"(Shipment ID: {order.shiprocket_shipment_id}, Order ID: {order.shiprocket_order_id})."
                )
                return None

            # 3. Credentials Configuration Check
            if not shiprocket_config.is_configured:
                logger.info(
                    f"[Shiprocket Automation] Shiprocket API credentials not configured in backend .env. "
                    f"Order #{order_id} saved locally. Remote sync will occur once credentials are added."
                )
                return None

            # 4. Trigger Shiprocket Adhoc Order Creation
            logger.info(
                f"[Shiprocket Automation] Automatically placing Order #{order_id} "
                f"('{order.shipping_method}') in Shiprocket..."
            )
            result = shiprocket_shipment.create_shipment(order_id, db)
            logger.info(
                f"[Shiprocket Automation] Successfully placed Order #{order_id} in Shiprocket! "
                f"Shiprocket Order ID: {result.get('shiprocket_order_id')}, "
                f"Shipment ID: {result.get('shiprocket_shipment_id')}"
            )
            return result

        except Exception as e:
            logger.error(
                f"[Shiprocket Automation] Failed to automatically create Shiprocket shipment "
                f"for Order #{order_id}: {e}",
                exc_info=True,
            )
            return None
        finally:
            db.close()

    def auto_cancel_shiprocket_shipment(
        self, order_id: int, reason: str = "Cancelled by Store Administrator"
    ) -> Optional[Dict[str, Any]]:
        """
        Background task: Automatically cancels the shipment in Shiprocket when cancelled in Admin.
        Never raises exceptions that would interrupt admin UI.
        """
        db = SessionLocal()
        try:
            order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
            if not order:
                logger.warning(f"[Shiprocket Automation] Order #{order_id} not found for cancellation.")
                return None

            if not order.shiprocket_shipment_id and not order.shiprocket_order_id and not order.shiprocket_awb_code:
                logger.info(
                    f"[Shiprocket Automation] Order #{order_id} has no active Shiprocket shipment to cancel."
                )
                return None

            if not shiprocket_config.is_configured:
                logger.info(
                    f"[Shiprocket Automation] Shiprocket credentials not configured; "
                    f"marking Order #{order_id} cancelled locally only."
                )
                order.shiprocket_status = "CANCELLED"
                db.commit()
                return None

            logger.info(f"[Shiprocket Automation] Automatically cancelling Order #{order_id} in Shiprocket...")
            result = shiprocket_cancellation.cancel_shipment(order_id, db, reason=reason)
            logger.info(f"[Shiprocket Automation] Order #{order_id} successfully cancelled on Shiprocket dashboard.")
            return result

        except Exception as e:
            logger.error(
                f"[Shiprocket Automation] Failed to automatically cancel Shiprocket shipment "
                f"for Order #{order_id}: {e}",
                exc_info=True,
            )
            return None
        finally:
            db.close()

    def process_shiprocket_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processes incoming real-time status updates from Shiprocket webhook.
        Syncs order status, AWB, courier name, and triggers milestone notifications.
        """
        db = SessionLocal()
        try:
            # Shiprocket passes order_id e.g. "TRONIX-ORD-123" or "123" or shipment_id
            raw_order_id = str(payload.get("order_id", ""))
            shipment_id = str(payload.get("shipment_id", ""))
            awb_code = str(payload.get("awb", "") or payload.get("awb_code", "")).strip()
            courier_name = str(payload.get("courier_name", "")).strip()
            current_status = str(payload.get("current_status", "")).upper()

            order = None
            # Match by custom order code e.g. TRONIX-ORD-42
            match = re.search(r"TRONIX-ORD-(\d+)", raw_order_id, re.IGNORECASE)
            if match:
                order_pk = int(match.group(1))
                order = db.query(OrderDB).filter(OrderDB.id == order_pk).first()

            if not order and raw_order_id.isdigit():
                order = db.query(OrderDB).filter(OrderDB.id == int(raw_order_id)).first()

            if not order and shipment_id:
                order = db.query(OrderDB).filter(OrderDB.shiprocket_shipment_id == shipment_id).first()

            if not order and awb_code:
                order = db.query(OrderDB).filter(OrderDB.shiprocket_awb_code == awb_code).first()

            if not order:
                logger.warning(
                    f"[Shiprocket Webhook] No matching order found for payload: {payload}"
                )
                return {"status": "ignored", "reason": "Order not found"}

            # Update Waybill and Carrier details
            if awb_code and not order.shiprocket_awb_code:
                order.shiprocket_awb_code = awb_code
                order.tracking_number = awb_code

            if courier_name and not order.shiprocket_courier_name:
                order.shiprocket_courier_name = courier_name
                order.courier = courier_name

            order.shiprocket_status = current_status

            # Map Shiprocket tracking status to internal status
            if current_status in ["DELIVERED"]:
                order.status = "delivered"
            elif current_status in ["OUT FOR DELIVERY", "OUT_FOR_DELIVERY"]:
                order.status = "out_for_delivery"
            elif current_status in ["IN TRANSIT", "IN_TRANSIT", "SHIPPED", "PICKED UP"]:
                order.status = "shipped"
            elif current_status in ["CANCELED", "CANCELLED"]:
                order.status = "cancelled"

            db.commit()
            logger.info(
                f"[Shiprocket Webhook] Updated Order #{order.id} to status='{order.status}', "
                f"shiprocket_status='{current_status}', awb='{order.shiprocket_awb_code}'"
            )
            return {"status": "success", "order_id": order.id, "current_status": current_status}

        except Exception as e:
            logger.error(f"[Shiprocket Webhook] Error processing webhook: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}
        finally:
            db.close()


shiprocket_automation = ShiprocketAutomationService()
