import gzip

from justice.parsers.xml_parser import parse_xml_bytes, parse_xml_stream


class TestParseSingleSubjekt:
    def test_parse_single_subjekt(self, sample_xml_bytes):
        """Parse basic Subjekt with name, ico, dates."""
        results = list(parse_xml_bytes(sample_xml_bytes))
        first = results[0]
        assert first["name"] == "Test Company s.r.o."
        assert first["ico"] == "12345678"
        assert first["registration_date"] == "2020-01-15"
        assert first["deletion_date"] == ""


class TestParseMultipleSubjekts:
    def test_parse_multiple_subjekts(self, sample_xml_bytes):
        """Parse XML with 2 Subjekts and verify both are yielded."""
        results = list(parse_xml_bytes(sample_xml_bytes))
        assert len(results) == 2
        assert results[0]["name"] == "Test Company s.r.o."
        assert results[0]["ico"] == "12345678"
        assert results[1]["name"] == "Deleted Corp s.r.o."
        assert results[1]["ico"] == "99887766"


class TestParseAddress:
    def test_parse_address(self, sample_xml_bytes):
        """Verify address fields are extracted correctly from the Sídlo udaj."""
        results = list(parse_xml_bytes(sample_xml_bytes))
        sidlo_fact = results[0]["facts"][0]
        assert sidlo_fact["fact_type"]["code"] == "SIDLO"
        address = sidlo_fact["address"]
        assert address is not None
        assert address["country"] == "Česká republika"
        assert address["municipality"] == "Praha"
        assert address["street"] == "Vodičkova"
        assert address["house_number"] == "123"
        assert address["postal_code"] == "11000"
        assert address["city_part"] == ""
        assert address["orientation_number"] == ""
        assert address["evidence_number"] == ""
        assert address["number_text"] == ""
        assert address["district"] == ""
        assert address["full_address"] == ""
        assert address["supplementary_text"] == ""


class TestParseNaturalPerson:
    def test_parse_natural_person(self, sample_xml_bytes):
        """Natural person with jmeno, prijmeni, narozDatum, titulPred."""
        results = list(parse_xml_bytes(sample_xml_bytes))
        # The natural person is inside Statutární orgán -> podudaje -> Jednatel
        statutarni_fact = results[0]["facts"][3]
        assert statutarni_fact["header"] == "Statutární orgán"
        jednatel = statutarni_fact["sub_facts"][0]
        person = jednatel["person"]
        assert person is not None
        assert person["type"] == "natural"
        assert person["first_name"] == "Jan"
        assert person["last_name"] == "Novák"
        assert person["birth_date"] == "1985-03-15"
        assert person["title_before"] == "Ing."
        assert person["title_after"] == ""
        assert person["person_text"] == ""


class TestParseLegalPerson:
    def test_parse_legal_person(self, sample_xml_bytes):
        """Legal person with nazev, ico, regCislo."""
        results = list(parse_xml_bytes(sample_xml_bytes))
        spolecnik_fact = results[0]["facts"][4]
        assert spolecnik_fact["header"] == "Společník"
        person = spolecnik_fact["person"]
        assert person is not None
        assert person["type"] == "legal"
        assert person["entity_name"] == "Holding Corp a.s."
        assert person["ico"] == "87654321"
        assert person["reg_number"] == "REG123"
        assert person["euid"] == ""
        assert person["person_text"] == ""


class TestParseFileReference:
    def test_parse_file_reference(self, sample_xml_bytes):
        """spisZn with soud (kod, nazev), oddil, vlozka."""
        results = list(parse_xml_bytes(sample_xml_bytes))
        spis_fact = results[0]["facts"][2]
        assert spis_fact["fact_type"]["code"] == "SPIS_ZN"
        file_ref = spis_fact["file_reference"]
        assert file_ref is not None
        assert file_ref["court_code"] == "MSPH"
        assert file_ref["court_name"] == "Městský soud v Praze"
        assert file_ref["section"] == "C"
        assert file_ref["insert"] == "231666"


class TestParseLegalForm:
    def test_parse_legal_form(self, sample_xml_bytes):
        """pravniForma with kod, nazev, zkratka."""
        results = list(parse_xml_bytes(sample_xml_bytes))
        pravni_forma_fact = results[0]["facts"][1]
        assert pravni_forma_fact["fact_type"]["code"] == "PRAVNI_FORMA"
        legal_form = pravni_forma_fact["legal_form"]
        assert legal_form is not None
        assert legal_form["code"] == "112"
        assert legal_form["name"] == "Společnost s ručením omezeným"
        assert legal_form["abbreviation"] == "s.r.o."


class TestParseSubFacts:
    def test_parse_sub_facts(self, sample_xml_bytes):
        """Nested podudaje/Udaj recursion — Statutární orgán contains Jednatel."""
        results = list(parse_xml_bytes(sample_xml_bytes))
        statutarni_fact = results[0]["facts"][3]
        assert statutarni_fact["header"] == "Statutární orgán"
        assert len(statutarni_fact["sub_facts"]) == 1

        jednatel = statutarni_fact["sub_facts"][0]
        assert jednatel["header"] == "Jednatel"
        assert jednatel["function_name"] == "jednatel"
        assert jednatel["fact_type"]["code"] == "STATUTARNI_ORGAN_CLEN"
        assert jednatel["person"] is not None
        assert jednatel["person"]["last_name"] == "Novák"
        # Sub-facts of the sub-fact should be an empty list
        assert jednatel["sub_facts"] == []


class TestParseHodnotaUdaje:
    def test_parse_hodnota_udaje(self, sample_xml_bytes):
        """Nested value data with child elements (vklad, souhrn)."""
        results = list(parse_xml_bytes(sample_xml_bytes))
        spolecnik_fact = results[0]["facts"][4]
        assert spolecnik_fact["header"] == "Společník"
        value_data = spolecnik_fact["value_data"]
        assert value_data is not None
        assert "vklad" in value_data
        assert value_data["vklad"]["typ"] == "KORUNY"
        assert value_data["vklad"]["textValue"] == "200000"
        assert "souhrn" in value_data
        assert value_data["souhrn"]["typ"] == "KORUNY"
        assert value_data["souhrn"]["textValue"] == "200000"


class TestParseResidence:
    def test_parse_residence(self, sample_xml_bytes):
        """bydliste address extraction on the Jednatel sub-fact."""
        results = list(parse_xml_bytes(sample_xml_bytes))
        statutarni_fact = results[0]["facts"][3]
        jednatel = statutarni_fact["sub_facts"][0]
        residence = jednatel["residence"]
        assert residence is not None
        assert residence["municipality"] == "Praha"
        assert residence["street"] == "Národní"
        assert residence["postal_code"] == "11000"
        # Fields not present in XML should be empty strings
        assert residence["country"] == ""
        assert residence["house_number"] == ""
        assert residence["city_part"] == ""


class TestParseDeletionDate:
    def test_parse_deletion_date(self, sample_xml_bytes):
        """Entity with vymazDatum on both Subjekt and Udaj level."""
        results = list(parse_xml_bytes(sample_xml_bytes))
        deleted = results[1]
        assert deleted["name"] == "Deleted Corp s.r.o."
        assert deleted["deletion_date"] == "2023-12-01"
        assert deleted["registration_date"] == "2010-05-20"
        # The Sídlo fact also has a deletion date
        sidlo_fact = deleted["facts"][0]
        assert sidlo_fact["deletion_date"] == "2023-12-01"


class TestParseEmptyFields:
    def test_parse_empty_fields(self, sample_xml_bytes):
        """Missing optional elements return empty strings or None."""
        results = list(parse_xml_bytes(sample_xml_bytes))
        first = results[0]
        # deletion_date is missing on the first Subjekt
        assert first["deletion_date"] == ""

        # Sídlo fact has no person, no legal_form, no file_reference, no residence
        sidlo_fact = first["facts"][0]
        assert sidlo_fact["person"] is None
        assert sidlo_fact["legal_form"] is None
        assert sidlo_fact["file_reference"] is None
        assert sidlo_fact["residence"] is None
        assert sidlo_fact["value_text"] == ""
        assert sidlo_fact["value_data"] is None
        assert sidlo_fact["membership_from"] == ""
        assert sidlo_fact["membership_to"] == ""
        assert sidlo_fact["function_from"] == ""
        assert sidlo_fact["function_to"] == ""
        assert sidlo_fact["function_name"] == ""
        assert sidlo_fact["sub_facts"] == []


class TestParseFunctionDates:
    def test_parse_function_dates(self, sample_xml_bytes):
        """funkceOd, funkceDo, clenstviOd, clenstviDo extraction."""
        results = list(parse_xml_bytes(sample_xml_bytes))
        statutarni_fact = results[0]["facts"][3]
        jednatel = statutarni_fact["sub_facts"][0]
        assert jednatel["function_from"] == "2020-01-01"
        # funkceDo is not in the XML, so it should be empty
        assert jednatel["function_to"] == ""
        # clenstviOd / clenstviDo are not in the XML
        assert jednatel["membership_from"] == ""
        assert jednatel["membership_to"] == ""


class TestParseGzippedStream:
    def test_parse_gzipped_stream(self, sample_xml_bytes):
        """Gzip compressed XML via parse_xml_stream."""
        compressed = gzip.compress(sample_xml_bytes)
        # parse_xml_stream expects an iterator of bytes chunks
        chunks = [compressed[i : i + 64] for i in range(0, len(compressed), 64)]
        results = list(parse_xml_stream(iter(chunks)))
        assert len(results) == 2
        assert results[0]["name"] == "Test Company s.r.o."
        assert results[0]["ico"] == "12345678"
        assert results[1]["name"] == "Deleted Corp s.r.o."
        assert results[1]["ico"] == "99887766"

    def test_parse_gzipped_bytes(self, sample_xml_bytes):
        """Gzip compressed XML via parse_xml_bytes with is_gzipped=True."""
        compressed = gzip.compress(sample_xml_bytes)
        results = list(parse_xml_bytes(compressed, is_gzipped=True))
        assert len(results) == 2
        assert results[0]["name"] == "Test Company s.r.o."
        assert results[1]["name"] == "Deleted Corp s.r.o."


class TestParseUdajTyp:
    def test_parse_udaj_typ(self, sample_xml_bytes):
        """udajTyp with kod and nazev on each fact."""
        results = list(parse_xml_bytes(sample_xml_bytes))
        facts = results[0]["facts"]

        assert facts[0]["fact_type"] == {"code": "SIDLO", "name": "Sídlo"}
        assert facts[1]["fact_type"] == {"code": "PRAVNI_FORMA", "name": "Právní forma"}
        assert facts[2]["fact_type"] == {"code": "SPIS_ZN", "name": "Spisová značka"}
        assert facts[3]["fact_type"] == {"code": "STATUTARNI_ORGAN", "name": "Statutární orgán"}
        assert facts[4]["fact_type"] == {"code": "SPOLECNIK_OSOBA", "name": "Společník"}

    def test_parse_udaj_typ_on_sub_fact(self, sample_xml_bytes):
        """udajTyp is also parsed on nested sub-facts."""
        results = list(parse_xml_bytes(sample_xml_bytes))
        jednatel = results[0]["facts"][3]["sub_facts"][0]
        assert jednatel["fact_type"] == {
            "code": "STATUTARNI_ORGAN_CLEN",
            "name": "Člen statutárního orgánu",
        }


class TestParseEmptyXml:
    def test_parse_empty_xml(self):
        """XML with no Subjekt elements yields nothing."""
        empty_xml = b"<xml></xml>"
        results = list(parse_xml_bytes(empty_xml))
        assert results == []

    def test_parse_xml_with_only_root(self):
        """XML with only a root element and whitespace yields nothing."""
        xml = b"<xml>   \n   </xml>"
        results = list(parse_xml_bytes(xml))
        assert results == []
