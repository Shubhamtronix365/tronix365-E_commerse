import os
import logging
from typing import Optional

logger = logging.getLogger("shiprocket.config")

class ShiprocketConfig:
    """Configuration loader for Shiprocket API settings."""

    def __init__(self):
        self.base_url = os.getenv("SHIPROCKET_BASE_URL", "https://apiv2.shiprocket.in/v1/external").rstrip("/")
        self.email = os.getenv("SHIPROCKET_API_EMAIL", "").strip()
        self.password = os.getenv("SHIPROCKET_API_PASSWORD", "").strip()
        # Default store pickup location and pincode (Pune headquarters / warehouse)
        self.pickup_pincode = os.getenv("SHIPROCKET_PICKUP_PINCODE", "411001").strip()
        self.pickup_location = os.getenv("SHIPROCKET_PICKUP_LOCATION", "Primary").strip()
        self.request_timeout = int(os.getenv("SHIPROCKET_TIMEOUT_SECONDS", "15"))

    @property
    def is_configured(self) -> bool:
        """Checks whether credentials have been supplied."""
        return bool(self.email and self.password)

    def validate_or_raise(self):
        """Raises ValueError if Shiprocket credentials are not provided."""
        if not self.is_configured:
            raise ValueError(
                "Shiprocket API credentials (SHIPROCKET_API_EMAIL, SHIPROCKET_API_PASSWORD) are not set in environment variables. "
                "Please configure them in your backend .env file."
            )

shiprocket_config = ShiprocketConfig()
