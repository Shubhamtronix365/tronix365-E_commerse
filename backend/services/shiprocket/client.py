import logging
import requests
from typing import Any, Dict, Optional
from .config import shiprocket_config
from .auth_service import shiprocket_auth

logger = logging.getLogger("shiprocket.client")

class ShiprocketClient:
    """
    Centralized HTTP client wrapper for all Shiprocket API requests.
    Handles token injection, automatic 401 refresh retries, timeouts, and error formatting.
    """

    def request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        retry_on_401: bool = True,
    ) -> Dict[str, Any]:
        """
        Executes an authenticated HTTP request to Shiprocket API.
        """
        token = shiprocket_auth.get_valid_token()
        url = f"{shiprocket_config.base_url}/{endpoint.lstrip('/')}"

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }

        try:
            response = requests.request(
                method=method.upper(),
                url=url,
                params=params,
                json=json_data,
                headers=headers,
                timeout=shiprocket_config.request_timeout,
            )
        except requests.exceptions.Timeout:
            logger.error(f"Timeout while calling Shiprocket endpoint {endpoint}")
            raise TimeoutError("Shiprocket API request timed out. Please try again.")
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error while calling Shiprocket {endpoint}: {e}")
            raise ConnectionError(f"Failed to communicate with Shiprocket: {str(e)}")

        # Handle expired token / 401 retry
        if response.status_code == 401 and retry_on_401:
            logger.warning(f"Received 401 from Shiprocket for {endpoint}. Refreshing token and retrying...")
            shiprocket_auth.invalidate_token()
            return self.request(method, endpoint, params, json_data, retry_on_401=False)

        try:
            data = response.json()
        except Exception:
            data = {"raw_response": response.text}

        if response.status_code >= 400:
            error_message = (
                data.get("message")
                or data.get("error")
                or data.get("errors")
                or f"Shiprocket API error: HTTP {response.status_code}"
            )
            logger.error(f"Shiprocket API returned error ({response.status_code}) on {endpoint}: {error_message}")
            raise ValueError(f"Shiprocket Error ({response.status_code}): {error_message}")

        return data

    def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return self.request("GET", endpoint, params=params)

    def post(self, endpoint: str, json_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        return self.request("POST", endpoint, json_data=json_data)

shiprocket_client = ShiprocketClient()
