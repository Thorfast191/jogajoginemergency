import { describe, it, expect } from "vitest";
import { PRESET_FLAGS, applyPreset, detectPreset } from "../privacy";

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
