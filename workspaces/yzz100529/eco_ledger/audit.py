from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from .models import LedgerEntry, ManifestEntry, ReorderResult


class AuditTrail:
    def __init__(self, mapping_path: str | Path | None = None):
        self.id_mapping: dict[str, str] = {}
        self.original_id_mapping: dict[str, str] = {}
        self.manifest_links: dict[str, str] = {}
        self.reorder_time: str = ""
        self.remark: str = ""

        if mapping_path is not None:
            self.load(mapping_path)

    def build_from_result(
        self,
        result: ReorderResult,
        entries: list[LedgerEntry],
        remark: str = "",
    ) -> None:
        self.id_mapping = dict(result.id_mapping)
        self.original_id_mapping = dict(result.original_id_mapping)
        self.reorder_time = datetime.now().isoformat()
        self.remark = remark

        for entry in entries:
            if entry.manifest_no:
                new_id = entry.new_id or entry.original_id
                self.manifest_links[new_id] = entry.manifest_no
                self.manifest_links[entry.original_id] = entry.manifest_no

    def lookup_original_id(self, new_id: str) -> str | None:
        return self.original_id_mapping.get(new_id)

    def lookup_new_id(self, original_id: str) -> str | None:
        return self.id_mapping.get(original_id)

    def lookup_manifest(self, identifier: str) -> str | None:
        manifest = self.manifest_links.get(identifier)
        if manifest:
            return manifest
        new_id = self.id_mapping.get(identifier)
        if new_id:
            return self.manifest_links.get(new_id)
        return None

    def trace(self, identifier: str) -> dict:
        info: dict = {"查询编号": identifier}

        if identifier in self.original_id_mapping:
            info["类型"] = "重排后编号"
            info["原始编号"] = self.original_id_mapping[identifier]
            resolved_id = identifier
        elif identifier in self.id_mapping:
            info["类型"] = "原始编号"
            resolved_id = self.id_mapping[identifier]
            info["重排后编号"] = resolved_id
        else:
            info["类型"] = "未知"
            resolved_id = None

        manifest = self.lookup_manifest(identifier)
        if manifest:
            info["关联联单"] = manifest

        for new_id, manifest_no in self.manifest_links.items():
            if manifest_no == identifier:
                info.setdefault("被引用于", []).append(new_id)

        info["重排时间"] = self.reorder_time
        if self.remark:
            info["备注"] = self.remark

        return info

    def save(self, path: str | Path) -> None:
        path = Path(path)
        data = {
            "reorder_time": self.reorder_time,
            "remark": self.remark,
            "id_mapping": self.id_mapping,
            "original_id_mapping": self.original_id_mapping,
            "manifest_links": self.manifest_links,
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load(self, path: str | Path) -> None:
        path = Path(path)
        with open(path, encoding="utf-8") as f:
            data = json.load(f)

        self.id_mapping = data.get("id_mapping", {})
        self.original_id_mapping = data.get("original_id_mapping", {})
        self.manifest_links = data.get("manifest_links", {})
        self.reorder_time = data.get("reorder_time", "")
        self.remark = data.get("remark", "")
