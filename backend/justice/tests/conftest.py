import pytest
from django.core.cache import cache

SAMPLE_SUBJEKT_XML = """<xml>
<Subjekt>
  <nazev>Test Company s.r.o.</nazev>
  <ico>12345678</ico>
  <zapisDatum>2020-01-15</zapisDatum>
  <udaje>
    <Udaj>
      <hlavicka>Sídlo</hlavicka>
      <zapisDatum>2020-01-15</zapisDatum>
      <udajTyp><kod>SIDLO</kod><nazev>Sídlo</nazev></udajTyp>
      <adresa>
        <statNazev>Česká republika</statNazev>
        <obec>Praha</obec>
        <ulice>Vodičkova</ulice>
        <cisloPo>123</cisloPo>
        <psc>11000</psc>
      </adresa>
    </Udaj>
    <Udaj>
      <hlavicka>Právní forma</hlavicka>
      <zapisDatum>2020-01-15</zapisDatum>
      <udajTyp><kod>PRAVNI_FORMA</kod><nazev>Právní forma</nazev></udajTyp>
      <pravniForma><kod>112</kod><nazev>Společnost s ručením omezeným</nazev><zkratka>s.r.o.</zkratka></pravniForma>
    </Udaj>
    <Udaj>
      <hlavicka>Spisová značka</hlavicka>
      <zapisDatum>2020-01-15</zapisDatum>
      <udajTyp><kod>SPIS_ZN</kod><nazev>Spisová značka</nazev></udajTyp>
      <spisZn><soud><kod>MSPH</kod><nazev>Městský soud v Praze</nazev></soud><oddil>C</oddil><vlozka>231666</vlozka></spisZn>
    </Udaj>
    <Udaj>
      <hlavicka>Statutární orgán</hlavicka>
      <zapisDatum>2020-01-15</zapisDatum>
      <udajTyp><kod>STATUTARNI_ORGAN</kod><nazev>Statutární orgán</nazev></udajTyp>
      <podudaje>
        <Udaj>
          <hlavicka>Jednatel</hlavicka>
          <zapisDatum>2020-01-15</zapisDatum>
          <funkceOd>2020-01-01</funkceOd>
          <funkce>jednatel</funkce>
          <udajTyp><kod>STATUTARNI_ORGAN_CLEN</kod><nazev>Člen statutárního orgánu</nazev></udajTyp>
          <osoba>
            <jmeno>Jan</jmeno>
            <prijmeni>Novák</prijmeni>
            <narozDatum>1985-03-15</narozDatum>
            <titulPred>Ing.</titulPred>
          </osoba>
          <bydliste>
            <obec>Praha</obec>
            <ulice>Národní</ulice>
            <psc>11000</psc>
          </bydliste>
        </Udaj>
      </podudaje>
    </Udaj>
    <Udaj>
      <hlavicka>Společník</hlavicka>
      <zapisDatum>2020-02-01</zapisDatum>
      <udajTyp><kod>SPOLECNIK_OSOBA</kod><nazev>Společník</nazev></udajTyp>
      <osoba>
        <nazev>Holding Corp a.s.</nazev>
        <ico>87654321</ico>
        <regCislo>REG123</regCislo>
      </osoba>
      <hodnotaUdaje>
        <vklad><typ>KORUNY</typ><textValue>200000</textValue></vklad>
        <souhrn><typ>KORUNY</typ><textValue>200000</textValue></souhrn>
      </hodnotaUdaje>
    </Udaj>
  </udaje>
</Subjekt>
<Subjekt>
  <nazev>Deleted Corp s.r.o.</nazev>
  <ico>99887766</ico>
  <zapisDatum>2010-05-20</zapisDatum>
  <vymazDatum>2023-12-01</vymazDatum>
  <udaje>
    <Udaj>
      <hlavicka>Sídlo</hlavicka>
      <zapisDatum>2010-05-20</zapisDatum>
      <vymazDatum>2023-12-01</vymazDatum>
      <udajTyp><kod>SIDLO</kod><nazev>Sídlo</nazev></udajTyp>
      <adresa>
        <obec>Brno</obec>
        <psc>60200</psc>
      </adresa>
    </Udaj>
  </udaje>
</Subjekt>
</xml>"""

@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()

@pytest.fixture
def sample_xml_bytes():
    return SAMPLE_SUBJEKT_XML.encode("utf-8")

@pytest.fixture
def sample_subjekt_dict():
    """A single parsed Subjekt dict (output of xml_parser)."""
    return {
        "name": "Test Company s.r.o.",
        "ico": "12345678",
        "registration_date": "2020-01-15",
        "deletion_date": "",
        "facts": [
            {
                "header": "Sídlo",
                "registration_date": "2020-01-15",
                "deletion_date": "",
                "value_text": "",
                "value_data": None,
                "membership_from": "",
                "membership_to": "",
                "function_from": "",
                "function_to": "",
                "function_name": "",
                "fact_type": {"code": "SIDLO", "name": "Sídlo"},
                "legal_form": None,
                "file_reference": None,
                "person": None,
                "address": {
                    "country": "Česká republika",
                    "municipality": "Praha",
                    "city_part": "",
                    "street": "Vodičkova",
                    "house_number": "123",
                    "orientation_number": "",
                    "evidence_number": "",
                    "number_text": "",
                    "postal_code": "11000",
                    "district": "",
                    "full_address": "",
                    "supplementary_text": "",
                },
                "residence": None,
                "sub_facts": [],
            },
        ],
    }
