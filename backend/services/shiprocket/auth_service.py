import time
import logging
import requests
from typing import Optional
from .config import shiprocket_config

logger = logging.getLogger("shiprocket.auth")

class ShiprocketAuthService:
    """
    Manages authentication and token caching for Shiprocket API.
    Automatically refreshes tokens before expiry or on demand.
    """

    def __init__(self):
        self._token: Optional[str] = None
        self._expires_at: float = 0.0  # Unix timestamp

    def invalidate_token(self):
        """Forces subsequent requests to fetch a fresh token."""
        logger.info("Shiprocket token invalidated. A fresh token will be requested.")
        self._token = None
        self._expires_at = 0.0

    def get_valid_token(self) -> str:
        """
        Returns a valid JWT token. If cached and not expired, returns cached token;
        otherwise requests a fresh token from Shiprocket.
        """
        # Proactively refresh token 24 hours before expiration
        if self._token and time.time() < (self._expires_at - 86400):
            return self._token

        return self._authenticate()

    def _authenticate(self) -> str:
        shiprocket_config.validate_or_raise()

        url = f"{shiprocket_config.base_url}/auth/login"
        payload = {
            "email": shiprocket_config.email,
            "password": shiprocket_config.password,
        }

        logger.info(f"Authenticating with Shiprocket as {shiprocket_config.email[:3]}***@***")
        try:
            response = requests.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=shiprocket_config.request_timeout,
            )
        except requests.exceptions.RequestException as e:
            logger.error(f"Shiprocket auth network request failed: {e}")
            raise ConnectionError(f"Could not connect to Shiprocket authentication service: {str(e)}")

        if response.status_code != 200:
            logger.error(f"Shiprocket authentication failed ({response.status_code}): {response.text}")
            raise PermissionError(
                f"Shiprocket authentication failed with HTTP {response.status_code}. "
                "Please verify SHIPROCKET_API_EMAIL and SHIPROCKET_API_PASSWORD."
            )

        data = response.json()
        token = data.get("token")
        if not token:
            logger.error(f"Shiprocket login response missing 'token': {data}")
            raise ValueError("Shiprocket login succeeded but token was not returned.")

        self._token = token
        # Shiprocket tokens typically last 10 days (864000s). Default to 9 days to ensure freshness.
        self._expires_at = time.time() + (9 * 86400)
        logger.info("Successfully authenticated with Shiprocket. Token cached.")
        return self._token

shiprocket_auth = ShiprocketAuthService()
