import csv
from .validator import BarcodeRecord, ValidationIssue


REQUIRED_COLUMNS = {"barcode", "supplier_code"}

OPTIONAL_COLUMNS = {"box_id", "scan_time"}


def parse_csv(path: str, encoding: str = "utf-8-sig") -> list[BarcodeRecord]:
    records = []
    with open(path, "r", encoding=encoding, newline="") as f:
        reader = csv.reader(f)
        header = None
        header_indices = {}
        for file_line_num, row in enumerate(reader, start=1):
            if header is None:
                header = [col.strip().lower() for col in row]
                header_indices = {col: i for i, col in enumerate(header)}
                missing = REQUIRED_COLUMNS - set(header_indices.keys())
                if missing:
                    raise ValueError(f"CSV 缺少必需列: {missing}")
                continue

            raw_line_number = file_line_num

            if len(row) < len(header):
                rec = BarcodeRecord(
                    raw_line_number=raw_line_number,
                    raw_barcode="",
                    clean_barcode="",
                    supplier_code="",
                    is_bad_row=True,
                )
                rec.issues.append(ValidationIssue("BAD_ROW", f"列数不足"))
                records.append(rec)
                continue

            try:
                barcode_idx = header_indices["barcode"]
                supplier_idx = header_indices["supplier_code"]
                box_idx = header_indices.get("box_id")
                time_idx = header_indices.get("scan_time")

                raw_barcode = row[barcode_idx] if barcode_idx < len(row) else ""
                supplier_code = row[supplier_idx].strip() if supplier_idx < len(row) else ""

                if not raw_barcode.strip() or not supplier_code:
                    rec = BarcodeRecord(
                        raw_line_number=raw_line_number,
                        raw_barcode=raw_barcode,
                        clean_barcode="",
                        supplier_code=supplier_code,
                        is_bad_row=True,
                    )
                    rec.issues.append(ValidationIssue("BAD_ROW", "条码或供应商代码为空"))
                    records.append(rec)
                    continue

                box_id = row[box_idx].strip() if box_idx is not None and box_idx < len(row) else ""
                scan_time = row[time_idx].strip() if time_idx is not None and time_idx < len(row) else ""

                records.append(
                    BarcodeRecord(
                        raw_line_number=raw_line_number,
                        raw_barcode=raw_barcode,
                        clean_barcode=raw_barcode.replace(" ", ""),
                        supplier_code=supplier_code,
                        box_id=box_id,
                        scan_time=scan_time,
                    )
                )
            except Exception as e:
                rec = BarcodeRecord(
                    raw_line_number=raw_line_number,
                    raw_barcode="",
                    clean_barcode="",
                    supplier_code="",
                    is_bad_row=True,
                )
                rec.issues.append(ValidationIssue("BAD_ROW", f"解析异常 ({e})"))
                records.append(rec)

    return records
