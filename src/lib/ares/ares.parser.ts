import type {
  AresApiSidlo,
  AresApiAdresaDorucovaci,
  AresApiSeznamRegistraci,
  AresApiEkonomickySubjekt,
  AresApiSearchResponse,
  AresApiSearchRequest,
  AresHeadquarters,
  AresDeliveryAddress,
  AresRegistrationStatuses,
  AresBusinessRecord,
  AresEconomicSubject,
  AresSearchResult,
  AresSearchParams,
} from "./ares.types";

/**
 * Parse optional date string to Date object
 */
function parseDate(dateString: string | undefined): Date | undefined {
  if (!dateString) return undefined;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Parse headquarters/address from Czech API format to English entity
 */
function parseHeadquarters(sidlo: AresApiSidlo | undefined): AresHeadquarters | undefined {
  if (!sidlo) return undefined;

  return {
    countryCode: sidlo.kodStatu,
    countryName: sidlo.nazevStatu,
    regionCode: sidlo.kodKraje,
    regionName: sidlo.nazevKraje,
    districtCode: sidlo.kodOkresu,
    districtName: sidlo.nazevOkresu,
    municipalityCode: sidlo.kodObce,
    municipalityName: sidlo.nazevObce,
    administrativeDistrictCode: sidlo.kodSpravnihoObvodu,
    administrativeDistrictName: sidlo.nazevSpravnihoObvodu,
    cityDistrictCode: sidlo.kodMestskehoObvodu,
    cityDistrictName: sidlo.nazevMestskehoObvodu,
    cityPartCode: sidlo.kodMestskeCastiObvodu,
    cityPartName: sidlo.nazevMestskeCastiObvodu,
    streetCode: sidlo.kodUlice,
    streetName: sidlo.nazevUlice,
    buildingNumber: sidlo.cisloDomovni,
    addressSupplement: sidlo.doplnekAdresy,
    municipalityPartCode: sidlo.kodCastiObce,
    orientationNumber: sidlo.cisloOrientacni,
    orientationNumberLetter: sidlo.cisloOrientacniPismeno,
    municipalityPartName: sidlo.nazevCastiObce,
    addressPointCode: sidlo.kodAdresnihoMista,
    postalCode: sidlo.psc,
    textAddress: sidlo.textovaAdresa,
    addressNumberTo: sidlo.cisloDoAdresy,
    addressStandardized: sidlo.standardizaceAdresy,
    postalCodeText: sidlo.pscTxt,
    buildingNumberType: sidlo.typCisloDomovni,
  };
}

/**
 * Parse delivery address from Czech API format to English entity
 */
function parseDeliveryAddress(
  adresa: AresApiAdresaDorucovaci | undefined
): AresDeliveryAddress | undefined {
  if (!adresa) return undefined;

  return {
    addressLine1: adresa.radekAdresy1,
    addressLine2: adresa.radekAdresy2,
    addressLine3: adresa.radekAdresy3,
  };
}

/**
 * Parse registration statuses from Czech API format to English entity
 */
function parseRegistrationStatuses(
  seznam: AresApiSeznamRegistraci | undefined
): AresRegistrationStatuses | undefined {
  if (!seznam) return undefined;

  return {
    rosStatus: seznam.stavZdrojeRos,
    businessRegisterStatus: seznam.stavZdrojeVr,
    resStatus: seznam.stavZdrojeRes,
    tradeRegisterStatus: seznam.stavZdrojeRzp,
    nrpzsStatus: seznam.stavZdrojeNrpzs,
    rpshStatus: seznam.stavZdrojeRpsh,
    rcnsStatus: seznam.stavZdrojeRcns,
    szrStatus: seznam.stavZdrojeSzr,
    vatStatus: seznam.stavZdrojeDph,
    slovakVatStatus: seznam.stavZdrojeSkDph,
    sdStatus: seznam.stavZdrojeSd,
    irStatus: seznam.stavZdrojeIr,
    ceuStatus: seznam.stavZdrojeCeu,
    rsStatus: seznam.stavZdrojeRs,
    redStatus: seznam.stavZdrojeRed,
    monitorStatus: seznam.stavZdrojeMonitor,
  };
}

/**
 * Parse economic subject from flat Czech API format to English entity
 * Creates a single-element records array for backwards compatibility with UI
 */
function parseEconomicSubject(subject: AresApiEkonomickySubjekt): AresEconomicSubject {
  const record: AresBusinessRecord = {
    ico: subject.ico,
    businessName: subject.obchodniJmeno,
    headquarters: parseHeadquarters(subject.sidlo),
    legalForm: subject.pravniForma,
    legalFormRos: subject.pravniFormaRos,
    taxOffice: subject.financniUrad,
    foundationDate: parseDate(subject.datumVzniku),
    terminationDate: parseDate(subject.datumZaniku),
    updateDate: parseDate(subject.datumAktualizace),
    vatId: subject.dic,
    slovakVatId: subject.dicSkDph,
    naceActivities: subject.czNace,
    naceActivities2008: subject.czNace2008,
    deliveryAddress: parseDeliveryAddress(subject.adresaDorucovaci),
    registrationStatuses: parseRegistrationStatuses(subject.seznamRegistraci),
    primarySource: subject.primarniZdroj,
    subRegisterSzr: subject.subRegistrSzr,
    isPrimaryRecord: true,
  };

  return {
    icoId: subject.icoId ?? subject.ico,
    records: [record],
  };
}

/**
 * ARES Parser - transforms between API and Entity formats
 */
export const aresParser = {
  /**
   * Transform search API response to search result entity
   */
  toSearchResult(response: AresApiSearchResponse): AresSearchResult {
    return {
      totalCount: response.pocetCelkem,
      economicSubjects: response.ekonomickeSubjekty.map(parseEconomicSubject),
    };
  },

  /**
   * Transform single economic subject API response to entity
   */
  toEconomicSubject(response: AresApiEkonomickySubjekt): AresEconomicSubject {
    return parseEconomicSubject(response);
  },

  /**
   * Transform search params (English) to API request body (Czech)
   */
  toSearchRequest(params: AresSearchParams): AresApiSearchRequest {
    return {
      start: params.start,
      pocet: params.count,
      razeni: params.sorting,
      ico: params.ico,
      obchodniJmeno: params.businessName,
      pravniForma: params.legalForm,
      sidlo: params.sidlo,
    };
  },
};
