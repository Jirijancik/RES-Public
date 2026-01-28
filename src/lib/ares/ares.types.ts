/**
 * Address structure from ARES API (Czech)
 */
export interface AresApiSidlo {
  kodStatu: string;
  nazevStatu: string;
  kodKraje: number;
  nazevKraje: string;
  kodOkresu: number;
  nazevOkresu: string;
  kodObce: number;
  nazevObce: string;
  kodSpravnihoObvodu?: number;
  nazevSpravnihoObvodu?: string;
  kodMestskehoObvodu?: number;
  nazevMestskehoObvodu?: string;
  kodMestskeCastiObvodu?: number;
  nazevMestskeCastiObvodu?: string;
  kodUlice?: number;
  nazevUlice?: string;
  cisloDomovni?: number;
  doplnekAdresy?: string;
  kodCastiObce?: number;
  cisloOrientacni?: number;
  cisloOrientacniPismeno?: string;
  nazevCastiObce?: string;
  kodAdresnihoMista?: number;
  psc?: number;
  textovaAdresa?: string;
  cisloDoAdresy?: string;
  standardizaceAdresy?: boolean;
  pscTxt?: string;
  typCisloDomovni?: number;
}

/**
 * Statistical data from ARES API (Czech)
 */
export interface AresApiStatistickeUdaje {
  institucionalniSektor2010?: string;
  kategoriePoctuPracovniku?: string;
}

/**
 * Delivery address from ARES API (Czech)
 */
export interface AresApiAdresaDorucovaci {
  radekAdresy1?: string;
  radekAdresy2?: string;
  radekAdresy3?: string;
}

/**
 * Registration statuses in various registries (Czech)
 */
export interface AresApiSeznamRegistraci {
  stavZdrojeRos?: string;
  stavZdrojeVr?: string;
  stavZdrojeRes?: string;
  stavZdrojeRzp?: string;
  stavZdrojeNrpzs?: string;
  stavZdrojeRpsh?: string;
  stavZdrojeRcns?: string;
  stavZdrojeSzr?: string;
  stavZdrojeDph?: string;
  stavZdrojeSkDph?: string;
  stavZdrojeSd?: string;
  stavZdrojeIr?: string;
  stavZdrojeCeu?: string;
  stavZdrojeRs?: string;
  stavZdrojeRed?: string;
  stavZdrojeMonitor?: string;
}

/**
 * Historical business name record (Czech)
 */
export interface AresApiObchodniJmenoUdaj {
  platnostOd?: string;
  platnostDo?: string;
  obchodniJmeno?: string;
  primarniZaznam?: boolean;
}

/**
 * Historical address record (Czech)
 */
export interface AresApiSidloUdaj {
  sidlo?: AresApiSidlo;
  primarniZaznam?: boolean;
  platnostOd?: string;
  platnostDo?: string;
}

/**
 * Historical/additional data record (Czech)
 */
export interface AresApiDalsiUdaj {
  obchodniJmeno?: AresApiObchodniJmenoUdaj[];
  sidlo?: AresApiSidloUdaj[];
  pravniForma?: string;
  pravniFormaRos?: string;
  spisovaZnacka?: string;
  datovyZdroj?: string;
}

/**
 * Economic subject from ARES API (Czech) - flat structure
 * All fields are directly on the subject (no zaznamy wrapper)
 */
export interface AresApiEkonomickySubjekt {
  ico: string;
  icoId?: string;
  obchodniJmeno: string;
  sidlo?: AresApiSidlo;
  pravniForma?: string;
  pravniFormaRos?: string;
  financniUrad?: string;
  datumVzniku?: string;
  datumZaniku?: string;
  datumAktualizace?: string;
  dic?: string;
  dicSkDph?: string;
  adresaDorucovaci?: AresApiAdresaDorucovaci;
  czNace?: string[];
  czNace2008?: string[];
  seznamRegistraci?: AresApiSeznamRegistraci;
  primarniZdroj?: string;
  dalsiUdaje?: AresApiDalsiUdaj[];
  subRegistrSzr?: string;
}

/**
 * Search response from POST /vyhledat (Czech)
 */
export interface AresApiSearchResponse {
  pocetCelkem: number;
  ekonomickeSubjekty: AresApiEkonomickySubjekt[];
}

/**
 * Headquarters filter for API search request (Czech)
 */
export interface AresApiSidloFilter {
  kodObce?: number;
  kodKraje?: number;
  kodOkresu?: number;
}

/**
 * Search request body for POST /vyhledat (Czech)
 */
export interface AresApiSearchRequest {
  start?: number;
  pocet?: number;
  razeni?: string[];
  ico?: string[];
  obchodniJmeno?: string;
  pravniForma?: string[];
  sidlo?: AresApiSidloFilter;
}

/**
 * GET /{ico} response is the same as AresApiEkonomickySubjekt
 */
export type AresApiGetByIcoResponse = AresApiEkonomickySubjekt;

// ============================================
// Entity Types (English - for application use)
// ============================================

/**
 * Headquarters/Address entity (English)
 */
export interface AresHeadquarters {
  countryCode: string;
  countryName: string;
  regionCode: number;
  regionName: string;
  districtCode: number;
  districtName: string;
  municipalityCode: number;
  municipalityName: string;
  administrativeDistrictCode?: number;
  administrativeDistrictName?: string;
  cityDistrictCode?: number;
  cityDistrictName?: string;
  cityPartCode?: number;
  cityPartName?: string;
  streetCode?: number;
  streetName?: string;
  buildingNumber?: number;
  addressSupplement?: string;
  municipalityPartCode?: number;
  orientationNumber?: number;
  orientationNumberLetter?: string;
  municipalityPartName?: string;
  addressPointCode?: number;
  postalCode?: number;
  textAddress?: string;
  addressNumberTo?: string;
  addressStandardized?: boolean;
  postalCodeText?: string;
  buildingNumberType?: number;
}

/**
 * Statistical data entity (English)
 */
export interface AresStatisticalData {
  institutionalSector2010?: string;
  employeeCountCategory?: string;
}

/**
 * Delivery address entity (English)
 */
export interface AresDeliveryAddress {
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
}

/**
 * Registration statuses entity (English)
 */
export interface AresRegistrationStatuses {
  rosStatus?: string;
  businessRegisterStatus?: string;
  resStatus?: string;
  tradeRegisterStatus?: string;
  nrpzsStatus?: string;
  rpshStatus?: string;
  rcnsStatus?: string;
  szrStatus?: string;
  vatStatus?: string;
  slovakVatStatus?: string;
  sdStatus?: string;
  irStatus?: string;
  ceuStatus?: string;
  rsStatus?: string;
  redStatus?: string;
  monitorStatus?: string;
}

/**
 * Business record entity (English)
 */
export interface AresBusinessRecord {
  ico: string;
  businessName: string;
  headquarters?: AresHeadquarters;
  legalForm?: string;
  legalFormRos?: string;
  taxOffice?: string;
  foundationDate?: Date;
  terminationDate?: Date;
  updateDate?: Date;
  vatId?: string;
  slovakVatId?: string;
  naceActivities?: string[];
  naceActivities2008?: string[];
  deliveryAddress?: AresDeliveryAddress;
  registrationStatuses?: AresRegistrationStatuses;
  primarySource?: string;
  subRegisterSzr?: string;
  isPrimaryRecord?: boolean;
}

/**
 * Economic subject entity (English)
 */
export interface AresEconomicSubject {
  icoId: string;
  records: AresBusinessRecord[];
}

/**
 * Search result entity (English)
 */
export interface AresSearchResult {
  totalCount: number;
  economicSubjects: AresEconomicSubject[];
}

/**
 * Headquarters filter for search
 */
export interface AresSearchSidlo {
  kodObce?: number;
  kodKraje?: number;
  kodOkresu?: number;
}

/**
 * Search parameters for the search mutation
 */
export interface AresSearchParams {
  start?: number;
  count?: number;
  sorting?: string[];
  ico?: string[];
  businessName?: string;
  legalForm?: string[];
  sidlo?: AresSearchSidlo;
}



