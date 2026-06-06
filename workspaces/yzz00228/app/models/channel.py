from dataclasses import dataclass
from typing import Optional
from .enums import ChannelType, RiskLevel


@dataclass
class SourceChannel:
    channel_type: ChannelType
    channel_name: str
    seller_id: Optional[str] = None
    seller_name: Optional[str] = None
    risk_level: Optional[RiskLevel] = None
    trust_score: Optional[float] = None
    remark: Optional[str] = None

    def __post_init__(self):
        if isinstance(self.channel_type, str):
            self.channel_type = ChannelType(self.channel_type)
        if isinstance(self.risk_level, str):
            self.risk_level = RiskLevel(self.risk_level)
        if self.risk_level is None:
            self.risk_level = self._default_risk_level()
        if self.trust_score is None:
            self.trust_score = self._default_trust_score()

    def _default_risk_level(self) -> RiskLevel:
        risk_map = {
            ChannelType.OFFICIAL_STORE: RiskLevel.LOW,
            ChannelType.AUTHORIZED_DEALER: RiskLevel.LOW,
            ChannelType.SECOND_HAND_MARKET: RiskLevel.MEDIUM,
            ChannelType.PRIVATE_SELLER: RiskLevel.HIGH,
            ChannelType.AUCTION: RiskLevel.MEDIUM,
            ChannelType.UNKNOWN: RiskLevel.CRITICAL,
        }
        return risk_map.get(self.channel_type, RiskLevel.MEDIUM)

    def _default_trust_score(self) -> float:
        score_map = {
            ChannelType.OFFICIAL_STORE: 95.0,
            ChannelType.AUTHORIZED_DEALER: 85.0,
            ChannelType.SECOND_HAND_MARKET: 60.0,
            ChannelType.PRIVATE_SELLER: 40.0,
            ChannelType.AUCTION: 55.0,
            ChannelType.UNKNOWN: 20.0,
        }
        return score_map.get(self.channel_type, 50.0)
