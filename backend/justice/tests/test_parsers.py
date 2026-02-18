from justice.parsers.csv_parser import JusticeCSVParser
from justice.parsers.pdf_parser import PDFParser


class TestJusticeCSVParser:
    def setup_method(self):
        self.parser = JusticeCSVParser()

    def test_parse_all_basic(self):
        raw = b"ico,nazev,pravni_forma\n12345678,Test Company,s.r.o."
        result = self.parser.parse_all(raw)
        assert len(result) == 1
        assert result[0]["ico"] == "12345678"
        assert result[0]["name"] == "Test Company"
        assert result[0]["legal_form"] == "s.r.o."

    def test_parse_all_multiple_rows(self):
        raw = (
            b"ico,nazev,pravni_forma,sidlo,rejstrikovy_soud,spisova_znacka,datum_zapisu\n"
            b"12345678,Company A,s.r.o.,Praha,Mestsky soud,C 12345,2020-01-01\n"
            b"87654321,Company B,a.s.,Brno,Krajsky soud,B 67890,2021-06-15\n"
        )
        result = self.parser.parse_all(raw)
        assert len(result) == 2
        assert result[0]["ico"] == "12345678"
        assert result[0]["name"] == "Company A"
        assert result[0]["address"] == "Praha"
        assert result[0]["registry_court"] == "Mestsky soud"
        assert result[0]["file_number"] == "C 12345"
        assert result[0]["registration_date"] == "2020-01-01"
        assert result[1]["ico"] == "87654321"
        assert result[1]["name"] == "Company B"

    def test_parse_stream_yields_rows(self):
        raw = b"ico,nazev,pravni_forma\n11111111,A,s.r.o.\n22222222,B,a.s."
        rows = list(self.parser.parse_stream(raw))
        assert len(rows) == 2
        assert rows[0]["ico"] == "11111111"
        assert rows[1]["ico"] == "22222222"

    def test_strips_whitespace(self):
        raw = b"ico,nazev,pravni_forma\n 12345678 , Test , s.r.o. "
        result = self.parser.parse_all(raw)
        assert result[0]["ico"] == "12345678"
        assert result[0]["name"] == "Test"
        assert result[0]["legal_form"] == "s.r.o."

    def test_missing_columns_return_empty_string(self):
        raw = b"ico,nazev\n12345678,Test"
        result = self.parser.parse_all(raw)
        assert result[0]["ico"] == "12345678"
        assert result[0]["name"] == "Test"
        assert result[0]["legal_form"] == ""
        assert result[0]["address"] == ""

    def test_decode_utf8(self):
        raw = "ico,nazev,pravni_forma\n12345678,Česká firma,s.r.o.".encode("utf-8")
        result = self.parser.parse_all(raw)
        assert result[0]["name"] == "Česká firma"

    def test_decode_cp1250_fallback(self):
        raw = "ico,nazev,pravni_forma\n12345678,Česká firma,s.r.o.".encode("cp1250")
        result = self.parser.parse_all(raw)
        assert result[0]["name"] == "Česká firma"

    def test_empty_csv(self):
        raw = b"ico,nazev,pravni_forma\n"
        result = self.parser.parse_all(raw)
        assert result == []


class TestPDFParserDetectDocumentType:
    def setup_method(self):
        self.parser = PDFParser()

    def test_balance_sheet(self):
        assert self.parser.detect_document_type("ROZVAHA v plném rozsahu") == "balance_sheet"

    def test_balance_sheet_lowercase_in_text(self):
        text = "Společnost XYZ\nROZVAHA ke dni 31.12.2023"
        assert self.parser.detect_document_type(text) == "balance_sheet"

    def test_profit_loss_with_diacritics(self):
        assert self.parser.detect_document_type("VÝKAZ ZISKU a ztrát") == "profit_loss"

    def test_profit_loss_without_diacritics(self):
        assert self.parser.detect_document_type("VYKAZ ZISKU a ztrat") == "profit_loss"

    def test_notes_with_diacritics(self):
        assert self.parser.detect_document_type("PŘÍLOHA k účetní závěrce") == "notes"

    def test_notes_without_diacritics(self):
        assert self.parser.detect_document_type("PRILOHA k ucetni zaverce") == "notes"

    def test_unknown_document(self):
        assert self.parser.detect_document_type("Some random text") == "unknown"

    def test_empty_text(self):
        assert self.parser.detect_document_type("") == "unknown"

    def test_only_checks_first_2000_chars(self):
        text = "A" * 2001 + "ROZVAHA"
        assert self.parser.detect_document_type(text) == "unknown"
