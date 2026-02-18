"""
CSV parsing for Czech Justice open data exports from dataor.justice.cz.
Streams rows one at a time for memory efficiency (these files can be large).

Handles Czech encodings: UTF-8 (modern files) and cp1250 (legacy Windows files).
"""
import csv
import io
from typing import Generator


class JusticeCSVParser:
    # Map Czech CSV headers to English field names
    COLUMN_MAP = {
        "ico": "ico",
        "nazev": "name",
        "pravni_forma": "legal_form",
        "sidlo": "address",
        "rejstrikovy_soud": "registry_court",
        "spisova_znacka": "file_number",
        "datum_zapisu": "registration_date",
    }

    def parse_stream(self, raw_bytes: bytes) -> Generator[dict, None, None]:
        """Stream rows from CSV one at a time."""
        text = self._decode(raw_bytes)
        reader = csv.DictReader(io.StringIO(text))

        for row in reader:
            yield {
                english: (row.get(czech) or "").strip()
                for czech, english in self.COLUMN_MAP.items()
            }

    def parse_all(self, raw_bytes: bytes) -> list[dict]:
        """Parse entire CSV into a list. For smaller files."""
        return list(self.parse_stream(raw_bytes))

    def _decode(self, raw_bytes: bytes) -> str:
        """Try UTF-8 first, fall back to cp1250 (Czech Windows encoding)."""
        try:
            return raw_bytes.decode("utf-8")
        except UnicodeDecodeError:
            return raw_bytes.decode("cp1250")
