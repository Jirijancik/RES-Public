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
 * Location filter for search
 */
export interface AresSearchLocation {
  municipalityCode?: number;
  regionCode?: number;
  districtCode?: number;
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
  location?: AresSearchLocation;
}



