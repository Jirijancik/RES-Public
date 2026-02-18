"""
PDF parsing for Czech Justice Registry documents.
Uses pdfplumber (pure Python, no Java/Ghostscript needed in Docker).
"""
import pdfplumber
from io import BytesIO


class PDFParser:
    MAX_PAGES = 100  # Safety limit

    def extract_text(self, pdf_bytes: bytes) -> str:
        """Extract all text from a PDF."""
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            pages = []
            for page in pdf.pages[: self.MAX_PAGES]:
                text = page.extract_text()
                if text:
                    pages.append(text)
            return "\n\n".join(pages)

    def extract_tables(self, pdf_bytes: bytes) -> list[list[list[str]]]:
        """
        Extract tables from a PDF.
        Returns: list of tables, each table is list of rows, each row is list of cells.
        """
        all_tables = []
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages[: self.MAX_PAGES]:
                tables = page.extract_tables(
                    table_settings={
                        "vertical_strategy": "lines",
                        "horizontal_strategy": "lines",
                        "snap_tolerance": 5,
                    }
                )
                for table in tables:
                    cleaned = [
                        [cell or "" for cell in row]
                        for row in table
                        if any(cell for cell in row)
                    ]
                    if cleaned:
                        all_tables.append(cleaned)
        return all_tables

    def detect_document_type(self, text: str) -> str:
        """Detect Czech financial document type from text content."""
        text_upper = text[:2000].upper()
        if "ROZVAHA" in text_upper:
            return "balance_sheet"
        if "VÝKAZ ZISKU" in text_upper or "VYKAZ ZISKU" in text_upper:
            return "profit_loss"
        if "PŘÍLOHA" in text_upper or "PRILOH" in text_upper:
            return "notes"
        return "unknown"
