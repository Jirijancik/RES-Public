"""
Justice business logic + caching layer.
Same pattern as AresService but for a file-parsing data source.

Responsible for:
- Downloading PDFs/CSVs from or.justice.cz (via client)
- Parsing them (via parsers)
- Caching metadata in Redis

Strategy:
- Cache ONLY the lightweight metadata (document type, table count, source URL)
  in Redis. This makes repeated "what kind of document is this?" lookups instant.
- Return the full parsed content (text + tables) directly in the API response
  without caching it. PDFs from justice.cz are static (filed documents never
  change), so re-parsing on a cache miss is acceptable.
- If you find re-parsing is too slow for large PDFs, consider storing parsed
  results in PostgreSQL (a JSONField on the CourtRecord model) instead of Redis.
  PostgreSQL uses disk, so it won't compete with the Redis memory budget.
"""
from core.services.cache import CacheService
from .client import JusticeClient
from .parsers.pdf_parser import PDFParser
from .parsers.csv_parser import JusticeCSVParser
from .constants import DOCUMENT_CACHE_TTL, SEARCH_CACHE_TTL, MAX_PDF_SIZE_MB


class JusticeService:
    def __init__(self):
        self.client = JusticeClient()
        self.pdf_parser = PDFParser()
        self.csv_parser = JusticeCSVParser()
        self.cache = CacheService(prefix="justice", default_ttl=SEARCH_CACHE_TTL)

    def get_document(self, ico: str, document_id: str) -> dict:
        """Download, parse, and return a PDF document.

        Caches only lightweight metadata in Redis (not the full text/tables).
        See module docstring for rationale.
        """
        # Check if we have cached metadata (avoids re-downloading the PDF)
        cached = self.cache.get("doc", ico, document_id)
        if cached is not None:
            return cached

        # Download PDF
        pdf_bytes, source_url = self.client.download_document(document_id)

        # Validate size
        size_mb = len(pdf_bytes) / (1024 * 1024)
        if size_mb > MAX_PDF_SIZE_MB:
            raise ValueError(
                f"PDF too large: {size_mb:.1f}MB (max {MAX_PDF_SIZE_MB}MB)"
            )

        # Parse
        text = self.pdf_parser.extract_text(pdf_bytes)
        tables = self.pdf_parser.extract_tables(pdf_bytes)
        doc_type = self.pdf_parser.detect_document_type(text)

        result = {
            "ico": ico,
            "documentId": document_id,
            "documentType": doc_type,
            "textContent": text[:10000],  # Truncate for API response
            "tables": tables,
            "tableCount": len(tables),
            "sourceUrl": source_url,
        }

        # Cache only lightweight metadata in Redis
        metadata = {
            "ico": ico,
            "documentId": document_id,
            "documentType": doc_type,
            "tableCount": len(tables),
            "sourceUrl": source_url,
        }
        self.cache.set(
            metadata, "doc:meta", ico, document_id, ttl=DOCUMENT_CACHE_TTL
        )

        return result

    def import_companies_csv(self, dataset_url: str) -> list[dict]:
        """Download and parse a company CSV from open data portal."""
        cached = self.cache.get("csv", self.cache.hash_params({"url": dataset_url}))
        if cached is not None:
            return cached

        csv_bytes = self.client.download_csv(dataset_url)
        records = self.csv_parser.parse_all(csv_bytes)

        self.cache.set(
            records, "csv", self.cache.hash_params({"url": dataset_url}), ttl=43200
        )
        return records
