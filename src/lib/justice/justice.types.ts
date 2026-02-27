/**
 * TypeScript interfaces for Justice API responses.
 * Field names match backend serializers (camelCase).
 */

// --- Core entity types ---

export interface JusticeEntitySummary {
  ico: string;
  name: string;
  legalFormCode: string;
  legalFormName: string;
  courtName: string;
  fileReference: string;
  registrationDate: string | null;
  deletionDate: string | null;
  isActive: boolean;
}

export interface JusticeEntityDetail extends JusticeEntitySummary {
  courtCode: string;
  fileSection: string;
  fileNumber: number | null;
  facts: JusticeFact[];
}

// --- Nested structures ---

export interface JusticeFact {
  header: string;
  factTypeCode: string;
  factTypeName: string;
  valueText: string;
  valueData: unknown;
  registrationDate: string | null;
  deletionDate: string | null;
  functionName?: string;
  functionFrom?: string | null;
  functionTo?: string | null;
  person: JusticePerson | null;
  addresses: JusticeAddress[];
  subFacts: JusticeFact[];
}

export interface JusticePerson {
  isNaturalPerson: boolean;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  titleBefore: string;
  titleAfter: string;
  entityName: string;
  entityIco: string;
}

export interface JusticePersonWithFact extends JusticePerson {
  functionName: string;
  functionFrom: string | null;
  functionTo: string | null;
  membershipFrom: string | null;
  membershipTo: string | null;
  registrationDate: string | null;
  deletionDate: string | null;
}

export interface JusticeAddress {
  addressType: string;
  country: string;
  municipality: string;
  cityPart: string;
  street: string;
  houseNumber: string;
  orientationNumber: string;
  postalCode: string;
  district: string;
  fullAddress: string;
}

// --- Search ---

export interface JusticeSearchResult {
  totalCount: number;
  offset: number;
  limit: number;
  entities: JusticeEntitySummary[];
}

export interface JusticeSearchParams {
  ico?: string;
  name?: string;
  legalForm?: string;
  location?: string;
  status?: string;
  offset?: number;
  limit?: number;
}

// --- Sbírka listin (document collection) ---

export interface JusticeDocumentFile {
  downloadId: string;
  filename: string;
  sizeKb: number | null;
  pageCount: number | null;
  isXml: boolean;
  isPdf: boolean;
}

export interface JusticeFinancialRow {
  row: number;
  label: string;
  brutto?: number | null;
  korekce?: number | null;
  netto?: number | null;
  nettoMin?: number | null;
  current?: number | null;
  previous?: number | null;
}

export interface JusticeFinancialMetadata {
  periodFrom: string;
  periodTo: string;
  currency: string;
  unit: string;
  rozsahRozvaha: string;
  rozsahVzz: string;
}

export interface JusticeFinancialData {
  metadata: JusticeFinancialMetadata;
  aktiva: JusticeFinancialRow[];
  pasiva: JusticeFinancialRow[];
  vzz: JusticeFinancialRow[];
}

export interface JusticeDocument {
  documentId: string;
  subjektId: string;
  spisId: string;
  documentNumber: string;
  documentType: string;
  files: JusticeDocumentFile[];
  financialData: JusticeFinancialData | null;
}

export interface JusticeDocumentList {
  subjektId: string;
  documents: JusticeDocument[];
}

// --- History ---

export interface JusticeHistoryEntry {
  date: string;
  action: string;
  factTypeCode: string;
  factTypeName: string;
  header: string;
  valueText: string;
}
