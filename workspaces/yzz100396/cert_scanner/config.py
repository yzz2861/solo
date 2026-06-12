import yaml
from dataclasses import dataclass
from typing import List


@dataclass
class DomainEntry:
    host: str
    port: int
    environment: str
    owner: str
    owner_contact: str

    @property
    def is_orphan(self) -> bool:
        return self.owner.strip() == "" or self.owner.strip().lower() == "unknown"

    @property
    def key(self) -> str:
        return f"{self.host}:{self.port}:{self.environment}"


def load_config(path: str) -> List[DomainEntry]:
    with open(path, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    entries = []
    for item in raw.get("domains", []):
        entries.append(
            DomainEntry(
                host=item.get("host", ""),
                port=int(item.get("port", 443)),
                environment=item.get("environment", "unknown"),
                owner=item.get("owner", ""),
                owner_contact=item.get("owner_contact", ""),
            )
        )
    return entries
