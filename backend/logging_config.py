import os
import sys
import re
import json
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from contextvars import ContextVar

# Context variables for asynchronous request tracing
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")
user_id_ctx: ContextVar[str] = ContextVar("user_id", default="-")
client_ip_ctx: ContextVar[str] = ContextVar("client_ip", default="-")

# Environment configuration
APP_NAME = "tronix365"
ENVIRONMENT = os.getenv("ENVIRONMENT") or ("development" if "localhost" in os.getenv("VITE_API_URL", "") else "production")
LOG_LEVEL_NAME = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_FORMAT = os.getenv("LOG_FORMAT", "console").lower()  # "console" or "json"

# Indian Standard Time (UTC+5:30) helper
IST = timezone(timedelta(hours=5, minutes=30), name="IST")

SENSITIVE_KEYS = {
    "password", "hashed_password", "token", "access_token", "refresh_token",
    "otp", "otp_hash", "two_factor_secret", "secret", "secret_key", "api_key",
    "cvv", "card_number", "credit_card", "debit_card", "pin", "salt",
    "authorization", "payu_key", "payu_salt", "brevo_api_key", "hash"
}

EMAIL_REGEX = re.compile(r"([a-zA-Z0-9_.+-])[a-zA-Z0-9_.+-]*@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)")
PHONE_REGEX = re.compile(r"(\+?\d{2,3})?(\d{2})\d{4,6}(\d{2,4})")


def mask_email(email: Optional[str]) -> str:
    """Mask email address e.g. 'shubham.tronix365@gmail.com' -> 's***5@gmail.com'."""
    if not email or not isinstance(email, str) or "@" not in email:
        return str(email or "-")
    try:
        parts = email.strip().split("@")
        local, domain = parts[0], parts[1]
        if len(local) <= 2:
            masked_local = local[0] + "*"
        else:
            masked_local = local[0] + "***" + local[-1]
        return f"{masked_local}@{domain}"
    except Exception:
        return "[MASKED_EMAIL]"


def mask_phone(phone: Optional[str]) -> str:
    """Mask phone number e.g. '+918888092189' -> '+9188****2189'."""
    if not phone or not isinstance(phone, str):
        return str(phone or "-")
    p = phone.strip()
    if len(p) <= 4:
        return "****"
    return p[:4] + "****" + p[-4:]


def sanitize_value(key: str, value: Any) -> Any:
    """Recursively sanitize sensitive dictionaries and attributes."""
    if not key or not isinstance(key, str):
        key = ""
    k_lower = key.lower()

    if any(s in k_lower for s in SENSITIVE_KEYS):
        return "[REDACTED]"

    if isinstance(value, str):
        if "email" in k_lower and "@" in value:
            return mask_email(value)
        if any(p in k_lower for p in ["phone", "mobile", "tel"]):
            return mask_phone(value)
        return value

    if isinstance(value, dict):
        return {k: sanitize_value(k, v) for k, v in value.items()}

    if isinstance(value, (list, tuple)):
        return [sanitize_value(key, item) for item in value]

    return value


def get_current_timestamp_iso() -> str:
    """Return ISO 8601 timestamp with IST timezone."""
    return datetime.now(IST).isoformat()


class SensitiveDataFilter(logging.Filter):
    """Logging filter that scrubs sensitive customer and credential data."""

    def filter(self, record: logging.LogRecord) -> bool:
        # Populate context variables if missing
        if not hasattr(record, "request_id"):
            record.request_id = request_id_ctx.get()
        if not hasattr(record, "user_id"):
            record.user_id = user_id_ctx.get()
        if not hasattr(record, "client_ip"):
            record.client_ip = client_ip_ctx.get()

        # Sanitize human-readable message if needed
        if isinstance(record.msg, str):
            # Mask potential passwords or tokens in strings
            record.msg = re.sub(r"(password=['\"][^'\"]*['\"])", "password='[REDACTED]'", record.msg, flags=re.IGNORECASE)
            record.msg = re.sub(r"(token=['\"][^'\"]*['\"])", "token='[REDACTED]'", record.msg, flags=re.IGNORECASE)
            record.msg = re.sub(r"(otp=['\"][^'\"]*['\"])", "otp='[REDACTED]'", record.msg, flags=re.IGNORECASE)

        return True


class StructuredConsoleFormatter(logging.Formatter):
    """
    Human-readable structured console formatter for development and production logs:
    [2026-11-02T23:15:30.123+05:30] [INFO] [TRONIX365] [ORDER] [ORDER_CREATED] [req_123] Customer USER42 created order #105. Action: Pending payment. Result: SUCCESS | ...
    """

    COLOR_MAP = {
        "DEBUG": "\033[36m",     # Cyan
        "INFO": "\033[32m",      # Green
        "WARNING": "\033[33m",   # Yellow
        "ERROR": "\033[31m",     # Red
        "CRITICAL": "\033[1;31m" # Bold Red
    }
    RESET = "\033[0m"

    def __init__(self, use_color: bool = True):
        super().__init__()
        self.use_color = use_color and sys.stdout.isatty() and os.name != "nt"

    def format(self, record: logging.LogRecord) -> str:
        timestamp = getattr(record, "custom_timestamp", get_current_timestamp_iso())
        level = record.levelname
        app = APP_NAME.upper()
        module = getattr(record, "module_name", record.name).upper()
        event = getattr(record, "event_name", "GENERAL").upper()
        req_id = getattr(record, "request_id", request_id_ctx.get())
        user_id = getattr(record, "user_id", user_id_ctx.get())

        action = getattr(record, "action", None)
        result = getattr(record, "result", None)
        duration_ms = getattr(record, "duration_ms", None)

        color = self.COLOR_MAP.get(level, "") if self.use_color else ""
        reset = self.RESET if self.use_color else ""

        header = f"[{timestamp}] [{color}{level:<5}{reset}] [{app}] [{module}] [{event}]"
        if req_id and req_id != "-":
            header += f" [{req_id}]"

        msg = record.getMessage()

        meta_parts = []
        if user_id and user_id != "-":
            meta_parts.append(f"user={user_id}")
        if getattr(record, "order_id", None):
            meta_parts.append(f"order_id={record.order_id}")
        if getattr(record, "product_id", None):
            meta_parts.append(f"product_id={record.product_id}")
        if getattr(record, "txnid", None):
            meta_parts.append(f"txnid={record.txnid}")
        if duration_ms is not None:
            meta_parts.append(f"duration={duration_ms:.1f}ms")
        if action:
            meta_parts.append(f"action='{action}'")
        if result:
            meta_parts.append(f"result={result}")

        meta_str = f" | {', '.join(meta_parts)}" if meta_parts else ""

        full_log = f"{header} {msg}{meta_str}"

        if record.exc_info:
            full_log += "\n" + self.formatException(record.exc_info)

        return full_log


class StructuredJSONFormatter(logging.Formatter):
    """
    Machine-readable JSON formatter for log aggregation (Render, Datadog, ELK, CloudWatch).
    """

    def format(self, record: logging.LogRecord) -> str:
        data = {
            "timestamp": getattr(record, "custom_timestamp", get_current_timestamp_iso()),
            "level": record.levelname,
            "app": APP_NAME,
            "environment": ENVIRONMENT,
            "module": getattr(record, "module_name", record.name).upper(),
            "event": getattr(record, "event_name", "GENERAL").upper(),
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", request_id_ctx.get()),
            "user_id": getattr(record, "user_id", user_id_ctx.get()),
            "client_ip": getattr(record, "client_ip", client_ip_ctx.get()),
        }

        # Contextual entities
        for attr in ["order_id", "product_id", "txnid", "category_id", "action", "result", "duration_ms", "status_code"]:
            val = getattr(record, attr, None)
            if val is not None:
                data[attr] = val

        # Extra data dict if provided
        extra = getattr(record, "extra_data", None)
        if isinstance(extra, dict):
            for k, v in extra.items():
                if k not in data:
                    data[k] = sanitize_value(k, v)

        # Exception information
        if record.exc_info:
            data["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else "Exception",
                "message": str(record.exc_info[1]),
                "stacktrace": self.formatException(record.exc_info)
            }

        return json.dumps(data, ensure_ascii=False)


class AppLogger:
    """
    Centralized application logger wrapper with standard event-based structured logging methods.
    """

    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.name = name

    def log_event(
        self,
        level: int,
        module: str,
        event: str,
        message: str,
        action: Optional[str] = None,
        result: Optional[str] = None,
        user_id: Optional[str] = None,
        order_id: Optional[Any] = None,
        product_id: Optional[Any] = None,
        txnid: Optional[str] = None,
        duration_ms: Optional[float] = None,
        status_code: Optional[int] = None,
        error_details: Optional[Any] = None,
        exc_info: Optional[Any] = None,
        **extra_data
    ):
        """Emit a structured event log following the 6-part human-readable standard."""
        extra = {
            "module_name": module,
            "event_name": event,
            "custom_timestamp": get_current_timestamp_iso(),
            "action": action,
            "result": result,
            "user_id": user_id or user_id_ctx.get(),
            "request_id": request_id_ctx.get(),
            "client_ip": client_ip_ctx.get(),
            "order_id": order_id,
            "product_id": product_id,
            "txnid": txnid,
            "duration_ms": duration_ms,
            "status_code": status_code,
            "extra_data": extra_data if extra_data else None,
        }

        if error_details and not exc_info:
            extra["error_details"] = str(error_details)

        self.logger.log(level, message, extra=extra, exc_info=exc_info)

    def info_event(self, module: str, event: str, message: str, **kwargs):
        self.log_event(logging.INFO, module, event, message, **kwargs)

    def warning_event(self, module: str, event: str, message: str, **kwargs):
        self.log_event(logging.WARNING, module, event, message, **kwargs)

    def error_event(self, module: str, event: str, message: str, **kwargs):
        self.log_event(logging.ERROR, module, event, message, **kwargs)

    def critical_event(self, module: str, event: str, message: str, **kwargs):
        self.log_event(logging.CRITICAL, module, event, message, **kwargs)

    def debug_event(self, module: str, event: str, message: str, **kwargs):
        self.log_event(logging.DEBUG, module, event, message, **kwargs)


def configure_logging():
    """Configure root and application loggers with structured formatting, filters, and rotation."""
    level = getattr(logging, LOG_LEVEL_NAME, logging.INFO)
    root = logging.getLogger()
    root.setLevel(level)

    # Remove default unformatted handlers
    for h in list(root.handlers):
        root.removeHandler(h)

    # Choose formatter
    formatter = StructuredJSONFormatter() if LOG_FORMAT == "json" else StructuredConsoleFormatter()
    data_filter = SensitiveDataFilter()

    # 1. Console / Stdout handler (Production container standard)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(data_filter)
    root.addHandler(console_handler)

    # 2. Rotating File Handler (Keeps last 14 days / max 20MB files, auto-rotated)
    try:
        log_dir = "logs"
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        file_handler = RotatingFileHandler(
            os.path.join(log_dir, "tronix365.log"),
            maxBytes=20 * 1024 * 1024,  # 20 MB
            backupCount=14,
            encoding="utf-8"
        )
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        file_handler.addFilter(data_filter)
        root.addHandler(file_handler)
    except Exception as e:
        sys.stderr.write(f"Warning: Could not initialize rotating file logger: {e}\n")

    # Silence overly verbose external libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)
    logging.getLogger("cloudinary").setLevel(logging.WARNING)


# Factory function for application loggers
def get_logger(name: str) -> AppLogger:
    """Return an AppLogger instance with structured event-driven logging helpers."""
    return AppLogger(name)
