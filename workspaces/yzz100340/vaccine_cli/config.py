import os
from pathlib import Path

DEFAULT_DB_PATH = Path.home() / ".vaccine_cli" / "vaccine_records.db"

MIN_TEMP = 2.0
MAX_TEMP = 8.0
TEMP_WINDOW_HOURS = 24

EXPIRY_WARNING_DAYS = 30

TEMPERATURE_NORMAL_RANGE = (2.0, 8.0)
TEMPERATURE_EXCURSION_THRESHOLD = 1.0

SUPPORTED_LOG_EXTENSIONS = {'.csv', '.txt', '.log'}
