import { describe, it, expect } from "vitest";
import { PRESET_FLAGS, applyPreset, detectPreset, DEFAULT_PRESET, CONSENT_FLAGS, needsConsent, fieldNeedsConsent } from "../privacy";

describe("privacy presets", () => {
  it("STANDARD publishes name/photo/message/contacts, hides medical + phone", () => {
    expect(PRESET_FLAGS.STANDARD).toEqual({
      photoPublic: true,
      namePublic: true,
      messagePublic: true,
      contactsPublic: true,
      bloodGroupPublic: false,
      allergiesPublic: false,
      medicalNotesPublic: false,
      showPhone: false,
    });
  });

  it("MINIMAL only publishes the message", () => {
    expect(PRESET_FLAGS.MINIMAL.messagePublic).toBe(true);
    expect(PRESET_FLAGS.MINIMAL.namePublic).toBe(false);
    expect(PRESET_FLAGS.MINIMAL.photoPublic).toBe(false);
    expect(PRESET_FLAGS.MINIMAL.contactsPublic).toBe(false);
  });

  it("FULL publishes everything", () => {
    expect(Object.values(PRESET_FLAGS.FULL).every(Boolean)).toBe(true);
  });

  it("round-trips preset -> flags -> preset", () => {
    for (const p of ["MINIMAL", "STANDARD", "FULL"] as const) {
      expect(detectPreset(applyPreset(p))).toBe(p);
    }
  });

  it("a single manual change reads as CUSTOM", () => {
    expect(detectPreset({ ...PRESET_FLAGS.STANDARD, bloodGroupPublic: true })).toBe("CUSTOM");
  });
});

describe("privacy defaults", () => {
  // A new profile starts private: a stranger scanning a sticker sees the
  // owner's emergency message and nothing else until the owner chooses more.
  it("starts a new profile on MINIMAL", () => {
    expect(DEFAULT_PRESET).toBe("MINIMAL");
  });

  it("publishes no contact, medical detail or phone number by default", () => {
    const flags = PRESET_FLAGS[DEFAULT_PRESET];
    for (const field of CONSENT_FLAGS) {
      expect(flags[field]).toBe(false);
    }
  });
});

describe("needsConsent", () => {
  const off = PRESET_FLAGS.MINIMAL;

  it("asks for nothing while every consent-sensitive field is private", () => {
    expect(needsConsent(off, false)).toBe(false);
  });

  it("asks before contacts, medical details or a phone number go public", () => {
    for (const field of CONSENT_FLAGS) {
      expect(needsConsent({ ...off, [field]: true }, false)).toBe(true);
    }
  });

  it("covers emergency contacts, blood group, allergies, medical notes and the phone", () => {
    expect([...CONSENT_FLAGS].sort()).toEqual(
      ["allergiesPublic", "bloodGroupPublic", "contactsPublic", "medicalNotesPublic", "showPhone"].sort(),
    );
  });

  it("is satisfied once consent has been given", () => {
    expect(needsConsent(PRESET_FLAGS.FULL, true)).toBe(false);
  });

  it("never asks to make something private", () => {
    expect(needsConsent({ ...off, namePublic: true, photoPublic: true }, false)).toBe(false);
  });
});

describe("fieldNeedsConsent", () => {
  it("asks before switching a consent-sensitive field on", () => {
    expect(fieldNeedsConsent("bloodGroupPublic", true, false)).toBe(true);
  });

  it("never asks to switch a field off", () => {
    expect(fieldNeedsConsent("contactsPublic", false, false)).toBe(false);
  });

  // An owner who published contacts before consent was recorded can still
  // change their name or photo without being stopped.
  it("doesn't ask for the owner's own name or photo", () => {
    expect(fieldNeedsConsent("namePublic", true, false)).toBe(false);
    expect(fieldNeedsConsent("photoPublic", true, false)).toBe(false);
  });

  it("doesn't ask again once consent is recorded", () => {
    expect(fieldNeedsConsent("medicalNotesPublic", true, true)).toBe(false);
  });
});
