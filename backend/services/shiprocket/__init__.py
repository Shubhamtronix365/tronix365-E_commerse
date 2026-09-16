"""
Shiprocket Integration Service Package for Troni365 E-commerce Platform.
Provides modular, decoupled services for authentication, serviceability,
shipment creation, courier/AWB assignment, label generation, pickup, and tracking.
"""

from .config import shiprocket_config
from .auth_service import shiprocket_auth
from .client import shiprocket_client
from .serviceability_service import shiprocket_serviceability
from .shipment_service import shiprocket_shipment
from .courier_service import shiprocket_courier
from .label_service import shiprocket_label
from .pickup_service import shiprocket_pickup
from .tracking_service import shiprocket_tracking
from .cancellation_service import shiprocket_cancellation
from .automation import shiprocket_automation

__all__ = [
    "shiprocket_config",
    "shiprocket_auth",
    "shiprocket_client",
    "shiprocket_serviceability",
    "shiprocket_shipment",
    "shiprocket_courier",
    "shiprocket_label",
    "shiprocket_pickup",
    "shiprocket_tracking",
    "shiprocket_cancellation",
    "shiprocket_automation",
]
