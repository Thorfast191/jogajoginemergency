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
