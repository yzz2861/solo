from typing import Optional, List
from dataclasses import dataclass, field
from datetime import datetime
from .enums import MaterialType, LuxuryCategory


@dataclass
class MaterialDoc:
    material_type: MaterialType
    name: str
    file_url: Optional[str] = None
    verified: bool = False
    verified_at: Optional[datetime] = None
    remark: Optional[str] = None

    def __post_init__(self):
        if isinstance(self.material_type, str):
            self.material_type = MaterialType(self.material_type)


@dataclass
class LuxuryItem:
    item_id: str
    name: str
    brand: str
    category: LuxuryCategory
    model: Optional[str] = None
    serial_number: Optional[str] = None
    estimated_value: Optional[float] = None
    purchase_date: Optional[datetime] = None
    condition: Optional[str] = None
    description: Optional[str] = None
    materials: List[MaterialDoc] = field(default_factory=list)

    def __post_init__(self):
        if isinstance(self.category, str):
            self.category = LuxuryCategory(self.category)
        if self.materials and isinstance(self.materials[0], dict):
            self.materials = [MaterialDoc(**m) for m in self.materials]

    def has_material(self, material_type: MaterialType) -> bool:
        return any(m.material_type == material_type and m.verified for m in self.materials)

    def get_missing_materials(self, required: List[MaterialType]) -> List[MaterialType]:
        return [mt for mt in required if not self.has_material(mt)]
