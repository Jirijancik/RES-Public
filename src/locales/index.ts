import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import csCommon from "./cs/common.json";
import csErrors from "./cs/errors.json";
import csForms from "./cs/forms.json";
import enCommon from "./en/common.json";
import enErrors from "./en/errors.json";
import enForms from "./en/forms.json";

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

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export default i18n;
