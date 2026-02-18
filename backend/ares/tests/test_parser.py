from ares.parser import (
    parse_delivery_address,
    parse_economic_subject,
    parse_headquarters,
    parse_registration_statuses,
    parse_search_result,
    to_search_request,
)


FULL_SIDLO = {
    "kodStatu": "CZ",
    "nazevStatu": "Česká republika",
    "kodKraje": 19,
    "nazevKraje": "Hlavní město Praha",
    "kodOkresu": 3100,
    "nazevOkresu": "Hlavní město Praha",
    "kodObce": 554782,
    "nazevObce": "Praha",
    "kodSpravnihoObvodu": 51,
    "nazevSpravnihoObvodu": "Praha 7",
    "kodMestskehoObvodu": 500178,
    "nazevMestskehoObvodu": "Praha 7",
    "kodMestskeCastiObvodu": 500178,
    "nazevMestskeCastiObvodu": "Praha 7",
    "kodUlice": 468622,
    "nazevUlice": "Jankovcova",
    "cisloDomovni": 1522,
    "doplnekAdresy": "budova B",
    "kodCastiObce": 490091,
    "cisloOrientacni": 53,
    "cisloOrientacniPismeno": "a",
    "nazevCastiObce": "Holešovice",
    "kodAdresnihoMista": 41587524,
    "psc": 17000,
    "textovaAdresa": "Jankovcova 1522/53a, 17000 Praha 7",
    "cisloDoAdresy": "1525",
    "standardizaceAdresy": True,
    "pscTxt": "170 00",
    "typCisloDomovni": 1,
}


FULL_SEZNAM_REGISTRACI = {
    "stavZdrojeRos": "AKTIVNI",
    "stavZdrojeVr": "AKTIVNI",
    "stavZdrojeRes": "AKTIVNI",
    "stavZdrojeRzp": "AKTIVNI",
    "stavZdrojeNrpzs": "NEEXISTUJE",
    "stavZdrojeRpsh": "NEEXISTUJE",
    "stavZdrojeRcns": "NEEXISTUJE",
    "stavZdrojeSzr": "NEEXISTUJE",
    "stavZdrojeDph": "AKTIVNI",
    "stavZdrojeSkDph": "NEEXISTUJE",
    "stavZdrojeSd": "NEEXISTUJE",
    "stavZdrojeIr": "NEEXISTUJE",
    "stavZdrojeCeu": "NEEXISTUJE",
    "stavZdrojeRs": "NEEXISTUJE",
    "stavZdrojeRed": "NEEXISTUJE",
    "stavZdrojeMonitor": "NEEXISTUJE",
}


FULL_SUBJECT = {
    "ico": "27082440",
    "icoId": "27082440",
    "obchodniJmeno": "Alza.cz a.s.",
    "sidlo": FULL_SIDLO,
    "pravniForma": "121",
    "pravniFormaRos": "121",
    "financniUrad": "Finanční úřad pro hlavní město Prahu",
    "datumVzniku": "2003-09-15",
    "datumZaniku": None,
    "datumAktualizace": "2024-01-15",
    "dic": "CZ27082440",
    "dicSkDph": None,
    "czNace": ["47910"],
    "czNace2008": ["47910"],
    "adresaDorucovaci": {
        "radekAdresy1": "Jankovcova 1522/53",
        "radekAdresy2": "Holešovice",
        "radekAdresy3": "170 00 Praha 7",
    },
    "seznamRegistraci": FULL_SEZNAM_REGISTRACI,
    "primarniZdroj": "ros",
    "subRegistrSzr": None,
}


class TestParseHeadquarters:
    def test_returns_none_for_none(self):
        assert parse_headquarters(None) is None

    def test_empty_dict_returns_dict_with_none_values(self):
        result = parse_headquarters({})
        assert result is not None
        assert result["countryCode"] is None
        assert len(result) == 29

    def test_all_29_fields_mapped(self):
        result = parse_headquarters(FULL_SIDLO)
        assert result is not None
        assert result["countryCode"] == "CZ"
        assert result["countryName"] == "Česká republika"
        assert result["regionCode"] == 19
        assert result["regionName"] == "Hlavní město Praha"
        assert result["districtCode"] == 3100
        assert result["districtName"] == "Hlavní město Praha"
        assert result["municipalityCode"] == 554782
        assert result["municipalityName"] == "Praha"
        assert result["administrativeDistrictCode"] == 51
        assert result["administrativeDistrictName"] == "Praha 7"
        assert result["cityDistrictCode"] == 500178
        assert result["cityDistrictName"] == "Praha 7"
        assert result["cityPartCode"] == 500178
        assert result["cityPartName"] == "Praha 7"
        assert result["streetCode"] == 468622
        assert result["streetName"] == "Jankovcova"
        assert result["buildingNumber"] == 1522
        assert result["addressSupplement"] == "budova B"
        assert result["municipalityPartCode"] == 490091
        assert result["orientationNumber"] == 53
        assert result["orientationNumberLetter"] == "a"
        assert result["municipalityPartName"] == "Holešovice"
        assert result["addressPointCode"] == 41587524
        assert result["postalCode"] == 17000
        assert result["textAddress"] == "Jankovcova 1522/53a, 17000 Praha 7"
        assert result["addressNumberTo"] == "1525"
        assert result["addressStandardized"] is True
        assert result["postalCodeText"] == "170 00"
        assert result["buildingNumberType"] == 1
        # Exactly 29 keys
        assert len(result) == 29


class TestParseDeliveryAddress:
    def test_returns_none_for_none(self):
        assert parse_delivery_address(None) is None

    def test_all_3_fields_mapped(self):
        result = parse_delivery_address({
            "radekAdresy1": "Line 1",
            "radekAdresy2": "Line 2",
            "radekAdresy3": "Line 3",
        })
        assert result["addressLine1"] == "Line 1"
        assert result["addressLine2"] == "Line 2"
        assert result["addressLine3"] == "Line 3"


class TestParseRegistrationStatuses:
    def test_returns_none_for_none(self):
        assert parse_registration_statuses(None) is None

    def test_all_16_fields_mapped(self):
        result = parse_registration_statuses(FULL_SEZNAM_REGISTRACI)
        assert result is not None
        assert result["rosStatus"] == "AKTIVNI"
        assert result["businessRegisterStatus"] == "AKTIVNI"
        assert result["resStatus"] == "AKTIVNI"
        assert result["tradeRegisterStatus"] == "AKTIVNI"
        assert result["nrpzsStatus"] == "NEEXISTUJE"
        assert result["rpshStatus"] == "NEEXISTUJE"
        assert result["rcnsStatus"] == "NEEXISTUJE"
        assert result["szrStatus"] == "NEEXISTUJE"
        assert result["vatStatus"] == "AKTIVNI"
        assert result["slovakVatStatus"] == "NEEXISTUJE"
        assert result["sdStatus"] == "NEEXISTUJE"
        assert result["irStatus"] == "NEEXISTUJE"
        assert result["ceuStatus"] == "NEEXISTUJE"
        assert result["rsStatus"] == "NEEXISTUJE"
        assert result["redStatus"] == "NEEXISTUJE"
        assert result["monitorStatus"] == "NEEXISTUJE"
        assert len(result) == 16


class TestParseEconomicSubject:
    def test_full_subject(self):
        result = parse_economic_subject(FULL_SUBJECT)
        assert result["icoId"] == "27082440"
        assert len(result["records"]) == 1

        record = result["records"][0]
        assert record["ico"] == "27082440"
        assert record["businessName"] == "Alza.cz a.s."
        assert record["headquarters"] is not None
        assert record["headquarters"]["countryCode"] == "CZ"
        assert record["legalForm"] == "121"
        assert record["legalFormRos"] == "121"
        assert record["taxOffice"] == "Finanční úřad pro hlavní město Prahu"
        assert record["foundationDate"] == "2003-09-15"
        assert record["terminationDate"] is None
        assert record["updateDate"] == "2024-01-15"
        assert record["vatId"] == "CZ27082440"
        assert record["slovakVatId"] is None
        assert record["naceActivities"] == ["47910"]
        assert record["naceActivities2008"] == ["47910"]
        assert record["deliveryAddress"] is not None
        assert record["deliveryAddress"]["addressLine1"] == "Jankovcova 1522/53"
        assert record["registrationStatuses"] is not None
        assert record["registrationStatuses"]["rosStatus"] == "AKTIVNI"
        assert record["primarySource"] == "ros"
        assert record["subRegisterSzr"] is None
        assert record["isPrimaryRecord"] is True

    def test_ico_id_fallback_to_ico(self):
        subject = {"ico": "12345678", "obchodniJmeno": "Test"}
        result = parse_economic_subject(subject)
        assert result["icoId"] == "12345678"

    def test_minimal_subject(self):
        subject = {"ico": "12345678", "obchodniJmeno": "Test"}
        result = parse_economic_subject(subject)
        record = result["records"][0]
        assert record["ico"] == "12345678"
        assert record["businessName"] == "Test"
        assert record["headquarters"] is None
        assert record["isPrimaryRecord"] is True


class TestParseSearchResult:
    def test_maps_total_count_and_subjects(self):
        response = {
            "pocetCelkem": 2,
            "ekonomickeSubjekty": [
                {"ico": "11111111", "obchodniJmeno": "Company A"},
                {"ico": "22222222", "obchodniJmeno": "Company B"},
            ],
        }
        result = parse_search_result(response)
        assert result["totalCount"] == 2
        assert len(result["economicSubjects"]) == 2
        assert result["economicSubjects"][0]["icoId"] == "11111111"
        assert result["economicSubjects"][1]["icoId"] == "22222222"

    def test_empty_results(self):
        response = {"pocetCelkem": 0, "ekonomickeSubjekty": []}
        result = parse_search_result(response)
        assert result["totalCount"] == 0
        assert result["economicSubjects"] == []


class TestToSearchRequest:
    def test_full_params(self):
        params = {
            "start": 0,
            "count": 10,
            "sorting": ["ICO_ASC"],
            "ico": ["12345678"],
            "businessName": "Alza",
            "legalForm": ["121"],
            "location": {
                "municipalityCode": 554782,
                "regionCode": 19,
                "districtCode": 3100,
            },
        }
        result = to_search_request(params)
        assert result["start"] == 0
        assert result["pocet"] == 10
        assert result["razeni"] == ["ICO_ASC"]
        assert result["ico"] == ["12345678"]
        assert result["obchodniJmeno"] == "Alza"
        assert result["pravniForma"] == ["121"]
        assert result["sidlo"]["kodObce"] == 554782
        assert result["sidlo"]["kodKraje"] == 19
        assert result["sidlo"]["kodOkresu"] == 3100

    def test_minimal_params(self):
        params = {"businessName": "Test"}
        result = to_search_request(params)
        assert result == {"obchodniJmeno": "Test"}
        assert "start" not in result
        assert "sidlo" not in result

    def test_empty_params(self):
        result = to_search_request({})
        assert result == {}
