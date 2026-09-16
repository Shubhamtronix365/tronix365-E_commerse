import logging
import re
from typing import Any, Dict, List, Optional
from .config import shiprocket_config
from .client import shiprocket_client

logger = logging.getLogger("shiprocket.serviceability")

class ShiprocketServiceabilityService:
    """
    Checks courier serviceability, turnaround times, and rates between pickup and delivery PIN codes.
    """

    def validate_pincode(self, pincode: str) -> str:
        clean = str(pincode).strip()
        if not re.match(r"^\d{6}$", clean):
            raise ValueError(f"Invalid PIN code '{pincode}'. Must be a 6-digit Indian postal code.")
        return clean

    def check_serviceability(
        self,
        delivery_pincode: str,
        pickup_pincode: Optional[str] = None,
        weight_kg: float = 0.5,
        is_cod: bool = False,
    ) -> Dict[str, Any]:
        """
        Queries Shiprocket for available couriers between pickup and delivery PIN codes.
        """
        deliv_pin = self.validate_pincode(delivery_pincode)
        pickup_pin = self.validate_pincode(pickup_pincode or shiprocket_config.pickup_pincode)

        params = {
            "pickup_postcode": pickup_pin,
            "delivery_postcode": deliv_pin,
            "weight": max(0.05, round(weight_kg, 2)),
            "cod": 1 if is_cod else 0,
        }

        logger.info(f"Checking serviceability: {pickup_pin} -> {deliv_pin} (Weight: {params['weight']}kg, COD: {is_cod})")
        data = shiprocket_client.get("/courier/serviceability/", params=params)

        couriers_raw = data.get("data", {}).get("available_courier_companies", [])
        
        parsed_couriers = []
        for c in couriers_raw:
            parsed_couriers.append({
                "courier_company_id": c.get("courier_company_id"),
                "courier_name": c.get("courier_name"),
                "rate": float(c.get("rate", 0.0) or 0.0),
                "etd": c.get("etd", "3-5 days"),
                "estimated_delivery_days": c.get("estimated_delivery_days"),
                "rating": float(c.get("rating", 0.0) or 0.0),
                "is_surface": "surface" in str(c.get("courier_name", "")).lower(),
                "call_before_delivery": c.get("call_before_delivery"),
            })

        # Sort couriers by rating and rate
        parsed_couriers.sort(key=lambda x: (-x["rating"], x["rate"]))

        return {
            "is_serviceable": len(parsed_couriers) > 0,
            "delivery_pincode": deliv_pin,
            "pickup_pincode": pickup_pin,
            "total_couriers": len(parsed_couriers),
            "available_couriers": parsed_couriers,
            "fastest_etd": parsed_couriers[0]["etd"] if parsed_couriers else None,
            "recommended_courier": parsed_couriers[0]["courier_name"] if parsed_couriers else None,
        }

shiprocket_serviceability = ShiprocketServiceabilityService()
