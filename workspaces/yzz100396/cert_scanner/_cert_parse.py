import datetime
import struct
from typing import Optional, Dict


def _read_tag_length(data: bytes, offset: int) -> tuple:
    if offset >= len(data):
        return None, None, offset
    tag = data[offset]
    offset += 1
    if offset >= len(data):
        return None, None, offset
    length = data[offset]
    offset += 1
    if length & 0x80:
        num_bytes = length & 0x7F
        if num_bytes == 0 or offset + num_bytes > len(data):
            return None, None, offset
        length = int.from_bytes(data[offset:offset + num_bytes], "big")
        offset += num_bytes
    return tag, length, offset


def _read_sequence(data: bytes, offset: int) -> tuple:
    tag, length, content_offset = _read_tag_length(data, offset)
    if tag is None:
        return None, offset
    if tag != 0x30:
        return None, offset
    return data[content_offset:content_offset + length], content_offset + length


def _read_oid(data: bytes, offset: int) -> tuple:
    tag, length, content_offset = _read_tag_length(data, offset)
    if tag is None or tag != 0x06:
        return None, offset
    oid_bytes = data[content_offset:content_offset + length]
    oid_parts = []
    if oid_bytes:
        oid_parts.append(str(oid_bytes[0] // 40))
        oid_parts.append(str(oid_bytes[0] % 40))
        val = 0
        for b in oid_bytes[1:]:
            val = (val << 7) | (b & 0x7F)
            if not (b & 0x80):
                oid_parts.append(str(val))
                val = 0
    return ".".join(oid_parts), content_offset + length


OID_NOT_AFTER = "2.5.29.32.0"
OID_COMMON_NAME = "2.5.4.3"
OID_ORGANIZATION = "2.5.4.10"
OID_VALIDITY = "2.5.4.0"
OID_NOT_AFTER_DIRECT = "2.5.29.31"

UTCTIME_TAG = 0x17
GENERALIZEDTIME_TAG = 0x18


def _parse_time(data: bytes) -> Optional[datetime.datetime]:
    try:
        time_str = data.decode("ascii").rstrip("Z")
        if len(time_str) == 12:
            year = int(time_str[:2])
            year += 2000 if year < 50 else 1900
            return datetime.datetime(
                year, int(time_str[2:4]), int(time_str[4:6]),
                int(time_str[6:8]), int(time_str[8:10]), int(time_str[10:12]),
            )
        elif len(time_str) == 14:
            return datetime.datetime(
                int(time_str[:4]), int(time_str[4:6]), int(time_str[6:8]),
                int(time_str[8:10]), int(time_str[10:12]), int(time_str[12:14]),
            )
    except (ValueError, UnicodeDecodeError):
        pass
    return None


def _find_validity_and_extract(der_data: bytes) -> Dict:
    result = {}
    try:
        cert_seq, _ = _read_sequence(der_data, 0)
        if cert_seq is None:
            return result

        tbs_seq, tbs_end = _read_sequence(cert_seq, 0)
        if tbs_seq is None:
            return result

        offset = 0
        tag, _, content_offset = _read_tag_length(tbs_seq, offset)
        if tag == 0xA0:
            offset = content_offset
            tag, length, content_offset = _read_tag_length(tbs_seq, offset)
            if tag is not None:
                offset = content_offset + length
        else:
            offset = content_offset

        tag, length, content_offset = _read_tag_length(tbs_seq, offset)
        if tag is None:
            return result
        offset = content_offset + length

        tag, length, content_offset = _read_tag_length(tbs_seq, offset)
        if tag is None:
            return result
        offset = content_offset + length

        tag, length, validity_offset = _read_tag_length(tbs_seq, offset)
        if tag != 0x30:
            return result

        validity_data = tbs_seq[validity_offset:validity_offset + length]

        not_before_tag, not_before_len, nb_content = _read_tag_length(validity_data, 0)
        idx = nb_content + not_before_len

        not_after_tag, not_after_len, na_content = _read_tag_length(validity_data, idx)
        if not_after_tag in (UTCTIME_TAG, GENERALIZEDTIME_TAG):
            na_data = validity_data[na_content:na_content + not_after_len]
            result["not_after"] = _parse_time(na_data)

        subject_offset = validity_offset + length
        tag, length, subject_content = _read_tag_length(tbs_seq, subject_offset)
        if tag == 0x31:
            result["subject"] = _extract_cn(tbs_seq[subject_content:subject_content + length])

        issuer_content_start = offset - length if length else offset
    except Exception:
        pass

    return result


def _extract_cn(subject_data: bytes) -> str:
    parts = []
    offset = 0
    while offset < len(subject_data):
        tag, length, content_offset = _read_tag_length(subject_data, offset)
        if tag is None:
            break
        if tag == 0x31:
            inner = subject_data[content_offset:content_offset + length]
            inner_offset = 0
            while inner_offset < len(inner):
                itag, ilen, icontent = _read_tag_length(inner, inner_offset)
                if itag is None:
                    break
                if itag == 0x06:
                    oid, _ = _read_oid(inner, inner_offset)
                    inner_offset = icontent + ilen
                    itag2, ilen2, icontent2 = _read_tag_length(inner, inner_offset)
                    if itag2 is not None:
                        if oid == OID_COMMON_NAME:
                            val = inner[icontent2:icontent2 + ilen2].decode("utf-8", errors="replace")
                            parts.append(f"CN={val}")
                        inner_offset = icontent2 + ilen2
                    else:
                        break
                else:
                    inner_offset = content_offset + length
                    break
            offset = content_offset + length
        else:
            offset = content_offset + length
    return ", ".join(parts) if parts else ""


def parse_der_cert(der_data: bytes) -> Optional[Dict]:
    try:
        return _find_validity_and_extract(der_data)
    except Exception:
        return None
