"""
Transforms Czech ARES API responses to English entity format.
Direct port of src/lib/ares/ares.parser.ts.

Every function is pure — no I/O, no side effects, no database calls.
Input: raw Czech dict from ARES API.
Output: English dict matching the TypeScript entity types.
"""


def parse_headquarters(sidlo: dict | None) -> dict | None:
    if sidlo is None:
        return None
    return {
        "countryCode": sidlo.get("kodStatu"),
        "countryName": sidlo.get("nazevStatu"),
        "regionCode": sidlo.get("kodKraje"),
        "regionName": sidlo.get("nazevKraje"),
        "districtCode": sidlo.get("kodOkresu"),
        "districtName": sidlo.get("nazevOkresu"),
        "municipalityCode": sidlo.get("kodObce"),
        "municipalityName": sidlo.get("nazevObce"),
        "administrativeDistrictCode": sidlo.get("kodSpravnihoObvodu"),
        "administrativeDistrictName": sidlo.get("nazevSpravnihoObvodu"),
        "cityDistrictCode": sidlo.get("kodMestskehoObvodu"),
        "cityDistrictName": sidlo.get("nazevMestskehoObvodu"),
        "cityPartCode": sidlo.get("kodMestskeCastiObvodu"),
        "cityPartName": sidlo.get("nazevMestskeCastiObvodu"),
        "streetCode": sidlo.get("kodUlice"),
        "streetName": sidlo.get("nazevUlice"),
        "buildingNumber": sidlo.get("cisloDomovni"),
        "addressSupplement": sidlo.get("doplnekAdresy"),
        "municipalityPartCode": sidlo.get("kodCastiObce"),
        "orientationNumber": sidlo.get("cisloOrientacni"),
        "orientationNumberLetter": sidlo.get("cisloOrientacniPismeno"),
        "municipalityPartName": sidlo.get("nazevCastiObce"),
        "addressPointCode": sidlo.get("kodAdresnihoMista"),
        "postalCode": sidlo.get("psc"),
        "textAddress": sidlo.get("textovaAdresa"),
        "addressNumberTo": sidlo.get("cisloDoAdresy"),
        "addressStandardized": sidlo.get("standardizaceAdresy"),
        "postalCodeText": sidlo.get("pscTxt"),
        "buildingNumberType": sidlo.get("typCisloDomovni"),
    }


def parse_delivery_address(adresa: dict | None) -> dict | None:
    if adresa is None:
        return None
    return {
        "addressLine1": adresa.get("radekAdresy1"),
        "addressLine2": adresa.get("radekAdresy2"),
        "addressLine3": adresa.get("radekAdresy3"),
    }


def parse_registration_statuses(seznam: dict | None) -> dict | None:
    if seznam is None:
        return None
    return {
        "rosStatus": seznam.get("stavZdrojeRos"),
        "businessRegisterStatus": seznam.get("stavZdrojeVr"),
        "resStatus": seznam.get("stavZdrojeRes"),
        "tradeRegisterStatus": seznam.get("stavZdrojeRzp"),
        "nrpzsStatus": seznam.get("stavZdrojeNrpzs"),
        "rpshStatus": seznam.get("stavZdrojeRpsh"),
        "rcnsStatus": seznam.get("stavZdrojeRcns"),
        "szrStatus": seznam.get("stavZdrojeSzr"),
        "vatStatus": seznam.get("stavZdrojeDph"),
        "slovakVatStatus": seznam.get("stavZdrojeSkDph"),
        "sdStatus": seznam.get("stavZdrojeSd"),
        "irStatus": seznam.get("stavZdrojeIr"),
        "ceuStatus": seznam.get("stavZdrojeCeu"),
        "rsStatus": seznam.get("stavZdrojeRs"),
        "redStatus": seznam.get("stavZdrojeRed"),
        "monitorStatus": seznam.get("stavZdrojeMonitor"),
    }


def parse_economic_subject(subject: dict) -> dict:
    record = {
        "ico": subject["ico"],
        "businessName": subject["obchodniJmeno"],
        "headquarters": parse_headquarters(subject.get("sidlo")),
        "legalForm": subject.get("pravniForma"),
        "legalFormRos": subject.get("pravniFormaRos"),
        "taxOffice": subject.get("financniUrad"),
        "foundationDate": subject.get("datumVzniku"),
        "terminationDate": subject.get("datumZaniku"),
        "updateDate": subject.get("datumAktualizace"),
        "vatId": subject.get("dic"),
        "slovakVatId": subject.get("dicSkDph"),
        "naceActivities": subject.get("czNace"),
        "naceActivities2008": subject.get("czNace2008"),
        "deliveryAddress": parse_delivery_address(subject.get("adresaDorucovaci")),
        "registrationStatuses": parse_registration_statuses(
            subject.get("seznamRegistraci")
        ),
        "primarySource": subject.get("primarniZdroj"),
        "subRegisterSzr": subject.get("subRegistrSzr"),
        "isPrimaryRecord": True,
    }
    return {
        "icoId": subject.get("icoId") or subject["ico"],
        "records": [record],
    }


def parse_search_result(response: dict) -> dict:
    return {
        "totalCount": response["pocetCelkem"],
        "economicSubjects": [
            parse_economic_subject(s)
            for s in response.get("ekonomickeSubjekty", [])
        ],
    }


def to_search_request(params: dict) -> dict:
    body = {}
    if params.get("start") is not None:
        body["start"] = params["start"]
    if params.get("count") is not None:
        body["pocet"] = params["count"]
    if params.get("sorting"):
        body["razeni"] = params["sorting"]
    if params.get("ico"):
        body["ico"] = params["ico"]
    if params.get("businessName"):
        body["obchodniJmeno"] = params["businessName"]
    if params.get("legalForm"):
        body["pravniForma"] = params["legalForm"]
    if params.get("location"):
        loc = params["location"]
        sidlo = {}
        if loc.get("municipalityCode") is not None:
            sidlo["kodObce"] = loc["municipalityCode"]
        if loc.get("regionCode") is not None:
            sidlo["kodKraje"] = loc["regionCode"]
        if loc.get("districtCode") is not None:
            sidlo["kodOkresu"] = loc["districtCode"]
        if sidlo:
            body["sidlo"] = sidlo
    return body
