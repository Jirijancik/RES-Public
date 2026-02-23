import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import csCommon from "./cs/common.json";
import csErrors from "./cs/errors.json";
import csForms from "./cs/forms.json";
import enCommon from "./en/common.json";
import enErrors from "./en/errors.json";
import enForms from "./en/forms.json";

export const SUPPORTED_LANGUAGES = ["cs", "en"] as const;
export const DEFAULT_LNG = "cs";

const resources = {
  cs: {
    common: csCommon,
    forms: csForms,
    errors: csErrors,
  },
  en: {
    common: enCommon,
    forms: enForms,
    errors: enErrors,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LNG,
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18n;
