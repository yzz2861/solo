import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.resolve()

DATA_DIR = BASE_DIR / "data"
SNAPSHOT_DIR = DATA_DIR / "snapshots"
REPORT_DIR = BASE_DIR / "reports"
URLS_FILE = BASE_DIR / "urls.txt"

for dir_path in [DATA_DIR, SNAPSHOT_DIR, REPORT_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

BROWSER_CONFIG = {
    "headless": True,
    "viewport": {"width": 1920, "height": 1080},
    "timeout": 30000,
    "slow_mo": 100,
    "wait_until": "networkidle",
    "wait_for_load_state_timeout": 45000,
}

RETRY_CONFIG = {
    "max_retries": 3,
    "retry_delay_seconds": 5,
}

PRICE_PATTERNS = [
    r"¥\s*\d+(?:[.,]\d+)?",
    r"&\s*\d+(?:[.,]\d+)?",
    r"元\s*\d+(?:[.,]\d+)?",
    r"\d+(?:[.,]\d+)?\s*元",
    r"\d+(?:[.,]\d+)?\s*RMB",
    r"RMB\s*\d+(?:[.,]\d+)?",
    r"\$\s*\d+(?:[.,]\d+)?",
    r"USD\s*\d+(?:[.,]\d+)?",
    r"\d+(?:[.,]\d+)?\s*¥",
]

KEY_SELECTORS = {
    "price": [
        ".price", ".product-price", ".goods-price", ".item-price",
        "[class*='price']", "[data-price]", ".price-box",
    ],
    "button": [
        "button", ".btn", ".button", "[class*='btn']", ".buy-btn",
        ".add-cart", ".purchase-btn",
    ],
    "activity": [
        ".activity", ".promotion", ".banner", ".ad-banner",
        ".entry", ".activity-entry", ".promo-banner",
        "[class*='activity']", "[class*='promo']", "[class*='banner']",
    ],
    "title": [
        "title", "h1", ".product-title", ".goods-title", ".item-title",
        "[class*='title']",
    ],
}

KEYWORDS_TO_EXTRACT = [
    "限时", "优惠", "折扣", "满减", "赠品", "秒杀", "预售",
    "到手价", "券后价", "活动价", "直降", "立减", "买赠",
]

IMAGE_FORMAT = "png"
IMAGE_QUALITY = 90

DIFF_THRESHOLD = {
    "price": 0.01,
    "text": 0.0,
    "image": 5.0,
}
