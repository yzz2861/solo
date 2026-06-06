import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

request_data = {
    "batch_no": "BATCH-API-TEST-001",
    "action": "auto_auth",
    "operator": "test_user",
    "items": [
        {
            "item_no": "ITEM-API-001",
            "status": "pending",
            "luxury": {
                "item_id": "LUX-API-001",
                "name": "劳力士潜航者型",
                "brand": "Rolex",
                "category": "watch",
                "model": "116610LN",
                "serial_number": "12345678",
                "estimated_value": 85000.0,
                "materials": [
                    {"material_type": "purchase_invoice", "name": "购买发票", "verified": True},
                    {"material_type": "warranty_card", "name": "保修卡", "verified": True},
                    {"material_type": "original_box", "name": "原装表盒", "verified": True},
                ],
            },
            "source_channel": {
                "channel_type": "official_store",
                "channel_name": "劳力士官方专卖店",
                "seller_id": "ROLEX-SH-001",
            },
        }
    ],
}

response = client.post("/api/v1/auth/batch/process", json=request_data)
print(f"Status code: {response.status_code}")
print(f"Response: {response.json()}")
