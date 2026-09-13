"""General application logging (Security_Design.md section 5 / G2 item
#111: "confirmed by absence -- no logging config, no structured-log
library, no request/error logging middleware anywhere"). Deliberately
stdlib-only (logging + json), no new dependency, matching this codebase's
existing minimal-dependency style. Structured JSON to stdout is exactly
what Render's web services capture out of the box (Hosting_Decision_
Finance_Management_Platform.md) -- no log-shipping agent needed at this
project's current scale.
"""

import json
import logging
import sys
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        extra_fields = getattr(record, "extra_fields", None)
        if extra_fields:
            payload.update(extra_fields)
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging(level: int = logging.INFO) -> None:
    root = logging.getLogger()
    if root.handlers:
        # Already configured -- avoids duplicate handlers if this is called
        # more than once in the same process (e.g. re-imported under a
        # test runner or a dev-server reload).
        root.setLevel(level)
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root.addHandler(handler)
    root.setLevel(level)
