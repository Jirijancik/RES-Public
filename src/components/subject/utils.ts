import type { AresRegistrationStatuses } from "@/lib/ares";

export function formatAddress(headquarters?: {
  streetName?: string;
  buildingNumber?: number;
  orientationNumber?: number;
  orientationNumberLetter?: string;
  municipalityName?: string;
  postalCode?: number;
}): string | null {
  if (!headquarters) return null;

  const parts: string[] = [];

  if (headquarters.streetName) {
    let street = headquarters.streetName;
    if (headquarters.buildingNumber) {
      street += ` ${headquarters.buildingNumber}`;
      if (headquarters.orientationNumber) {
        street += `/${headquarters.orientationNumber}`;
        if (headquarters.orientationNumberLetter) {
          street += headquarters.orientationNumberLetter;
        }
      }
    }
    parts.push(street);
  }

  if (headquarters.municipalityName) {
    if (headquarters.postalCode) {
      parts.push(`${headquarters.postalCode} ${headquarters.municipalityName}`);
    } else {
      parts.push(headquarters.municipalityName);
    }
  }

  return parts.length > 0 ? parts.join(", ") : null;
}

export function formatDate(date?: Date): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("cs-CZ").format(date);
}

export const REGISTRATION_LABELS: Record<keyof AresRegistrationStatuses, string> = {
  rosStatus: "ROS",
  businessRegisterStatus: "VR",
  resStatus: "RES",
  tradeRegisterStatus: "RZP",
  nrpzsStatus: "NRPZS",
  rpshStatus: "RPSH",
  rcnsStatus: "RCNS",
  szrStatus: "SZR",
  vatStatus: "DPH",
  slovakVatStatus: "SK DPH",
  sdStatus: "SD",
  irStatus: "IR",
  ceuStatus: "CEU",
  rsStatus: "RS",
  redStatus: "RED",
  monitorStatus: "Monitor",
};
