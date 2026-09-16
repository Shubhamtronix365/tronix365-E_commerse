import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Tuple
from sqlalchemy.orm import Session
from models import OrderDB, ProductDB, OrderItemDB
from .config import shiprocket_config
from .client import shiprocket_client

logger = logging.getLogger("shiprocket.shipment")

class ShiprocketShipmentService:
    """
    Handles validation and creation of Shiprocket adhoc shipments for confirmed orders.
    Enforces idempotency and ensures all product weights, dimensions, and customer address
    attributes conform to shipping requirements.
    """

    def validate_customer_details(self, order: OrderDB) -> Dict[str, str]:
        """Validates and normalizes customer address details."""
        name = (order.full_name or "").strip()
        if len(name) < 2:
            raise ValueError(f"Order #{order.id} has invalid customer name: '{name}'")

        email = (order.customer_email or "").strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
            raise ValueError(f"Order #{order.id} has invalid customer email: '{email}'")

        # Normalize phone: extract 10 digits
        raw_phone = re.sub(r"\D", "", str(order.phone or ""))
        if len(raw_phone) == 12 and raw_phone.startswith("91"):
            phone = raw_phone[2:]
        elif len(raw_phone) == 11 and raw_phone.startswith("0"):
            phone = raw_phone[1:]
        elif len(raw_phone) == 10:
            phone = raw_phone
        else:
            raise ValueError(
                f"Order #{order.id} has invalid phone number: '{order.phone}'. Must be a 10-digit mobile number."
            )

        address_line = (order.address_line or "").strip()
        if len(address_line) < 5:
            raise ValueError(f"Order #{order.id} has incomplete address: '{address_line}'")

        city = (order.city or "").strip()
        if not city:
            raise ValueError(f"Order #{order.id} is missing delivery city.")

        state = (order.state or "").strip()
        if not state:
            raise ValueError(f"Order #{order.id} is missing delivery state.")

        pincode = re.sub(r"\D", "", str(order.pincode or "").strip())
        if not re.match(r"^\d{6}$", pincode):
            raise ValueError(f"Order #{order.id} has invalid PIN code: '{order.pincode}'. Must be 6 digits.")

        # Split name into first and last name
        parts = name.split(None, 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

        return {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "phone": phone,
            "address": address_line,
            "city": city,
            "state": state,
            "country": order.country or "India",
            "pincode": pincode,
        }

    def validate_and_compute_items(
        self, order: OrderDB, db: Session
    ) -> Tuple[List[Dict[str, Any]], float, float, float, float]:
        """
        Validates order items, ensuring weights, dimensions, prices, and SKUs are valid.
        Computes package weight and aggregate package dimensions.
        Returns (order_items, total_weight_kg, length_cm, breadth_cm, height_cm).
        """
        if not order.items:
            raise ValueError(f"Order #{order.id} has no line items to ship.")

        shiprocket_items = []
        total_weight = 0.0
        max_length = 0.0
        max_breadth = 0.0
        total_height = 0.0

        for item in order.items:
            product = db.query(ProductDB).filter(ProductDB.id == item.product_id).first()
            if not product:
                raise ValueError(f"Product ID {item.product_id} in Order #{order.id} does not exist in the catalog.")

            qty = int(item.quantity or 1)
            if qty <= 0:
                raise ValueError(f"Invalid quantity {qty} for product '{product.title}'.")

            unit_price = float(
                item.price_at_purchase
                if item.price_at_purchase is not None
                else (product.price or product.sale_price or 0.0)
            )
            if unit_price <= 0:
                unit_price = 1.0  # Safe minimum fallback for Shiprocket validation

            # Determine SKU
            sku = (product.sku or product.skv or f"TRONIX-{product.id}").strip()

            # Weight and dimensions
            p_weight = float(product.weight or 0.2)
            if p_weight <= 0:
                p_weight = 0.2
            
            p_len = float(product.length or 10.0)
            p_brd = float(product.breadth or 10.0)
            p_hgt = float(product.height or 5.0)

            total_weight += p_weight * qty
            max_length = max(max_length, p_len)
            max_breadth = max(max_breadth, p_brd)
            total_height += p_hgt * qty

            shiprocket_items.append({
                "name": product.title[:100],  # Shiprocket max 100 chars
                "sku": sku[:50],
                "units": qty,
                "selling_price": round(unit_price, 2),
                "discount": 0,
                "tax": 0,
                "hsn": 0,
            })

        # Ensure reasonable dimension bounds for packaging
        final_weight = max(0.05, round(total_weight, 3))
        final_len = max(5.0, round(max_length, 1))
        final_brd = max(5.0, round(max_breadth, 1))
        final_hgt = max(2.0, min(100.0, round(total_height, 1)))

        return shiprocket_items, final_weight, final_len, final_brd, final_hgt

    def create_shipment(self, order_id: int, db: Session) -> Dict[str, Any]:
        """
        Creates an adhoc shipment order in Shiprocket for the given store order.
        Idempotent: Rejects creation if shipment is already registered.
        """
        order = db.query(OrderDB).filter(OrderDB.id == order_id).first()
        if not order:
            raise ValueError(f"Order #{order_id} not found.")

        # Duplicate Prevention Check
        if order.shiprocket_shipment_id:
            raise ValueError(
                f"Shipment already exists for Order #{order_id} (Shipment ID: {order.shiprocket_shipment_id}, "
                f"AWB: {order.shiprocket_awb_code or 'Not yet assigned'}). Duplicate shipment prevented."
            )

        # Validate customer address
        cust = self.validate_customer_details(order)

        # Validate products, weights, and packaging dimensions
        items, weight, length, breadth, height = self.validate_and_compute_items(order, db)

        # Order creation payload
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
        order_code = f"TRONIX-ORD-{order.id}"

        payload = {
            "order_id": order_code,
            "order_date": now_str,
            "pickup_location": shiprocket_config.pickup_location,
            "billing_customer_name": cust["first_name"],
            "billing_last_name": cust["last_name"],
            "billing_address": cust["address"],
            "billing_city": cust["city"],
            "billing_pincode": cust["pincode"],
            "billing_state": cust["state"],
            "billing_country": cust["country"],
            "billing_email": cust["email"],
            "billing_phone": cust["phone"],
            "shipping_is_billing": True,
            "order_items": items,
            "payment_method": "Prepaid",
            "sub_total": round(order.total_amount, 2),
            "length": length,
            "breadth": breadth,
            "height": height,
            "weight": weight,
        }

        logger.info(f"Creating Shiprocket shipment for Order #{order_id} ({order_code}) with {len(items)} items")
        response_data = shiprocket_client.post("/orders/create/adhoc", json_data=payload)

        sr_order_id = str(response_data.get("order_id", ""))
        sr_shipment_id = str(response_data.get("shipment_id", ""))
        sr_status = response_data.get("status", "NEW")
        sr_status_code = response_data.get("status_code", 1)

        if not sr_shipment_id:
            raise ValueError(f"Shiprocket order creation failed to return a shipment_id. Response: {response_data}")

        # Update database with Shiprocket identifiers
        order.shiprocket_order_id = sr_order_id
        order.shiprocket_shipment_id = sr_shipment_id
        order.shiprocket_status = sr_status
        order.shiprocket_status_code = sr_status_code
        order.shiprocket_created_at = datetime.utcnow()

        db.commit()
        db.refresh(order)

        logger.info(f"Shipment #{sr_shipment_id} successfully created in Shiprocket for Order #{order_id}")

        return {
            "message": "Shiprocket shipment created successfully",
            "order_id": order.id,
            "shiprocket_order_id": sr_order_id,
            "shiprocket_shipment_id": sr_shipment_id,
            "status": sr_status,
            "weight": weight,
            "dimensions": f"{length}x{breadth}x{height} cm",
        }

shiprocket_shipment = ShiprocketShipmentService()
