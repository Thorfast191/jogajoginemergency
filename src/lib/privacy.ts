// Per-field visibility for the public emergency profile. The booleans are the
// source of truth (stored as columns on EmergencyProfile); a preset is just a
// convenient way to set them all at once. Editing any single flag away from a
// preset makes the profile "CUSTOM".

export type VisibilityFlags = {
  photoPublic: boolean;
  namePublic: boolean;
  messagePublic: boolean;
  bloodGroupPublic: boolean;
  allergiesPublic: boolean;
  medicalNotesPublic: boolean;
  contactsPublic: boolean;
  showPhone: boolean;
};

export const FLAG_NAMES: readonly (keyof VisibilityFlags)[] = [
  "photoPublic",
  "namePublic",
  "messagePublic",
  "bloodGroupPublic",
  "allergiesPublic",
  "medicalNotesPublic",
  "contactsPublic",
  "showPhone",
];

/** How each switch is labelled in the dashboard. */
export const FIELD_LABELS: Record<keyof VisibilityFlags, string> = {
  photoPublic: "Profile photo",
  namePublic: "Display name",
  messagePublic: "Emergency message",
  bloodGroupPublic: "Blood group",
  allergiesPublic: "Allergies",
  medicalNotesPublic: "Medical notes",
  contactsPublic: "Emergency contacts",
  showPhone: "Public phone number",
};


export type Preset = "MINIMAL" | "STANDARD" | "FULL";

export const PRESET_FLAGS: Record<Preset, VisibilityFlags> = {
  MINIMAL: {
    photoPublic: false,
    namePublic: false,
    messagePublic: true,
    bloodGroupPublic: false,
    allergiesPublic: false,
    medicalNotesPublic: false,
    contactsPublic: false,
    showPhone: false,
  },
  STANDARD: {
    photoPublic: true,
    namePublic: true,
    messagePublic: true,
    bloodGroupPublic: false,
    allergiesPublic: false,
    medicalNotesPublic: false,
    contactsPublic: true,
    showPhone: false,
  },
  FULL: {
    photoPublic: true,
    namePublic: true,
    messagePublic: true,
    bloodGroupPublic: true,
    allergiesPublic: true,
    medicalNotesPublic: true,
    contactsPublic: true,
    showPhone: true,
  },
};

export function applyPreset(preset: Preset): VisibilityFlags {
  return { ...PRESET_FLAGS[preset] };
}

function flagsEqual(a: VisibilityFlags, b: VisibilityFlags): boolean {
  return FLAG_NAMES.every((k) => a[k] === b[k]);
}

export function detectPreset(flags: VisibilityFlags): Preset | "CUSTOM" {
  for (const p of ["MINIMAL", "STANDARD", "FULL"] as const) {
    if (flagsEqual(flags, PRESET_FLAGS[p])) return p;
  }
  return "CUSTOM";
}

/**
 * What a brand-new profile publishes. Private by default: the emergency message
 * and nothing else, until the owner chooses more.
 */
export const DEFAULT_PRESET: Preset = "MINIMAL";

/**
 * Fields that need the owner's explicit consent before they go public: other
 * people's phone numbers, health information, and a number to call. Name and
 * photo are the owner's own and only need the switch.
 */
export const CONSENT_FLAGS: readonly (keyof VisibilityFlags)[] = [
  "contactsPublic",
  "bloodGroupPublic",
  "allergiesPublic",
  "medicalNotesPublic",
  "showPhone",
];

/** True when these flags would publish a consent-sensitive field the owner hasn't consented to. */
export function needsConsent(flags: VisibilityFlags, hasConsent: boolean): boolean {
  return !hasConsent && CONSENT_FLAGS.some((k) => flags[k]);
}

/** True when switching this one field to `value` needs consent the owner hasn't given. */
export function fieldNeedsConsent(
  field: keyof VisibilityFlags,
  value: boolean,
  hasConsent: boolean,
): boolean {
  return value && !hasConsent && CONSENT_FLAGS.includes(field);
}

/**
 * What the owner agrees to before publishing consent-sensitive fields. Bump the
 * version when the wording changes; the version agreed to is stored with the
 * time (EmergencyProfile.consentVersion).
 */
export const CONSENT_VERSION = "2026-10-18";
export const CONSENT_TEXT =
  "Anyone who scans my QR code will see the fields I make public. I have permission from each emergency contact I publish, and I understand medical details are shown as I enter them, without being verified.";
