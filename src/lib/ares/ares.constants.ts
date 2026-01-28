/**
 * ARES API Base URL
 * REST API for economic subjects in the business registry
 */
export const ARES_BASE_URL =
  "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty";

/**
 * Default pagination settings
 */
export const ARES_DEFAULT_PAGE_SIZE = 10;
export const ARES_MAX_PAGE_SIZE = 100;

/**
 * Request timeout in milliseconds
 */
export const ARES_REQUEST_TIMEOUT = 15000;

/**
 * Czech Regions (Kraje)
 * Source: Czech Statistical Office (CSU) classification
 */
export const REGION_CODES = [
  { code: 19, name: "Hlavní město Praha" },
  { code: 27, name: "Středočeský" },
  { code: 35, name: "Jihočeský" },
  { code: 43, name: "Plzeňský" },
  { code: 51, name: "Karlovarský" },
  { code: 60, name: "Ústecký" },
  { code: 78, name: "Liberecký" },
  { code: 86, name: "Královéhradecký" },
  { code: 94, name: "Pardubický" },
  { code: 108, name: "Vysočina" },
  { code: 116, name: "Jihomoravský" },
  { code: 124, name: "Olomoucký" },
  { code: 132, name: "Moravskoslezský" },
  { code: 141, name: "Zlínský" },
] as const;

/**
 * Czech Districts (Okresy)
 * Source: Czech Statistical Office (CSU) classification
 */
export const DISTRICT_CODES = [
  // Hlavní město Praha (19)
  { code: 3100, name: "Hlavní město Praha", region: 19 },
  // Středočeský kraj (27)
  { code: 3201, name: "Benešov", region: 27 },
  { code: 3202, name: "Beroun", region: 27 },
  { code: 3203, name: "Kladno", region: 27 },
  { code: 3204, name: "Kolín", region: 27 },
  { code: 3205, name: "Kutná Hora", region: 27 },
  { code: 3206, name: "Mělník", region: 27 },
  { code: 3207, name: "Mladá Boleslav", region: 27 },
  { code: 3208, name: "Nymburk", region: 27 },
  { code: 3209, name: "Praha-východ", region: 27 },
  { code: 3210, name: "Praha-západ", region: 27 },
  { code: 3211, name: "Příbram", region: 27 },
  { code: 3212, name: "Rakovník", region: 27 },
  // Jihočeský kraj (35)
  { code: 3301, name: "České Budějovice", region: 35 },
  { code: 3302, name: "Český Krumlov", region: 35 },
  { code: 3303, name: "Jindřichův Hradec", region: 35 },
  { code: 3304, name: "Pelhřimov", region: 35 },
  { code: 3305, name: "Písek", region: 35 },
  { code: 3306, name: "Prachatice", region: 35 },
  { code: 3307, name: "Strakonice", region: 35 },
  { code: 3308, name: "Tábor", region: 35 },
  // Plzeňský kraj (43)
  { code: 3401, name: "Domažlice", region: 43 },
  { code: 3404, name: "Klatovy", region: 43 },
  { code: 3405, name: "Plzeň-město", region: 43 },
  { code: 3406, name: "Plzeň-jih", region: 43 },
  { code: 3407, name: "Plzeň-sever", region: 43 },
  { code: 3408, name: "Rokycany", region: 43 },
  { code: 3410, name: "Tachov", region: 43 },
  // Karlovarský kraj (51)
  { code: 3402, name: "Cheb", region: 51 },
  { code: 3403, name: "Karlovy Vary", region: 51 },
  { code: 3409, name: "Sokolov", region: 51 },
  // Ústecký kraj (60)
  { code: 3502, name: "Děčín", region: 60 },
  { code: 3503, name: "Chomutov", region: 60 },
  { code: 3506, name: "Litoměřice", region: 60 },
  { code: 3507, name: "Louny", region: 60 },
  { code: 3508, name: "Most", region: 60 },
  { code: 3509, name: "Teplice", region: 60 },
  { code: 3510, name: "Ústí nad Labem", region: 60 },
  // Liberecký kraj (78)
  { code: 3501, name: "Česká Lípa", region: 78 },
  { code: 3504, name: "Jablonec nad Nisou", region: 78 },
  { code: 3505, name: "Liberec", region: 78 },
  { code: 3608, name: "Semily", region: 78 },
  // Královéhradecký kraj (86)
  { code: 3602, name: "Hradec Králové", region: 86 },
  { code: 3604, name: "Jičín", region: 86 },
  { code: 3605, name: "Náchod", region: 86 },
  { code: 3607, name: "Rychnov nad Kněžnou", region: 86 },
  { code: 3610, name: "Trutnov", region: 86 },
  // Pardubický kraj (94)
  { code: 3603, name: "Chrudim", region: 94 },
  { code: 3606, name: "Pardubice", region: 94 },
  { code: 3609, name: "Svitavy", region: 94 },
  { code: 3611, name: "Ústí nad Orlicí", region: 94 },
  // Vysočina (108)
  { code: 3601, name: "Havlíčkův Brod", region: 108 },
  { code: 3707, name: "Jihlava", region: 108 },
  { code: 3710, name: "Třebíč", region: 108 },
  { code: 3714, name: "Žďár nad Sázavou", region: 108 },
  // Jihomoravský kraj (116)
  { code: 3701, name: "Blansko", region: 116 },
  { code: 3702, name: "Brno-město", region: 116 },
  { code: 3703, name: "Brno-venkov", region: 116 },
  { code: 3704, name: "Břeclav", region: 116 },
  { code: 3706, name: "Hodonín", region: 116 },
  { code: 3712, name: "Vyškov", region: 116 },
  { code: 3713, name: "Znojmo", region: 116 },
  // Olomoucký kraj (124)
  { code: 3709, name: "Prostějov", region: 124 },
  { code: 3805, name: "Olomouc", region: 124 },
  { code: 3808, name: "Přerov", region: 124 },
  { code: 3809, name: "Šumperk", region: 124 },
  { code: 3811, name: "Jeseník", region: 124 },
  // Moravskoslezský kraj (132)
  { code: 3801, name: "Bruntál", region: 132 },
  { code: 3802, name: "Frýdek-Místek", region: 132 },
  { code: 3803, name: "Karviná", region: 132 },
  { code: 3804, name: "Nový Jičín", region: 132 },
  { code: 3806, name: "Opava", region: 132 },
  { code: 3807, name: "Ostrava-město", region: 132 },
  // Zlínský kraj (141)
  { code: 3705, name: "Zlín", region: 141 },
  { code: 3708, name: "Kroměříž", region: 141 },
  { code: 3711, name: "Uherské Hradiště", region: 141 },
  { code: 3810, name: "Vsetín", region: 141 },
] as const;
