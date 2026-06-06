from enum import Enum


class AuthStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    PASSED = "passed"
    REJECTED = "rejected"
    PENDING_REVIEW = "pending_review"
    REVIEW_PASSED = "review_passed"
    REVIEW_REJECTED = "review_rejected"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ChannelType(str, Enum):
    OFFICIAL_STORE = "official_store"
    AUTHORIZED_DEALER = "authorized_dealer"
    SECOND_HAND_MARKET = "second_hand_market"
    PRIVATE_SELLER = "private_seller"
    AUCTION = "auction"
    UNKNOWN = "unknown"


class MaterialType(str, Enum):
    PURCHASE_INVOICE = "purchase_invoice"
    ORIGINAL_BOX = "original_box"
    WARRANTY_CARD = "warranty_card"
    CERTIFICATE = "certificate"
    RECEIPT = "receipt"
    APPRAISAL_REPORT = "appraisal_report"
    BRAND_CARD = "brand_card"


class LuxuryCategory(str, Enum):
    WATCH = "watch"
    BAG = "bag"
    JEWELRY = "jewelry"
    CLOTHING = "clothing"
    SHOES = "shoes"
    ACCESSORY = "accessory"


class ActionType(str, Enum):
    SUBMIT = "submit"
    AUTO_AUTH = "auto_auth"
    MANUAL_PASS = "manual_pass"
    MANUAL_REJECT = "manual_reject"
    REVIEW_PASS = "review_pass"
    REVIEW_REJECT = "review_reject"
    REPROCESS = "reprocess"
