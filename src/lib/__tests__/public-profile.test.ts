import { describe, it, expect } from "vitest";
import { buildPublicProfileView } from "../public-profile";

const base = {
  displayName: "Arafat Islam",
  photoAssetId: "media1",
  bloodGroup: "O+",
  allergies: "penicillin",
  medicalNotes: "asthma",
  emergencyMessage: "Please call my brother",
  contactMode: "RELAY" as const,
  phonePublic: "+880123",
  photoPublic: false,
  namePublic: false,
  messagePublic: false,
  bloodGroupPublic: false,
  allergiesPublic: false,
  medicalNotesPublic: false,
  contactsPublic: false,
  showPhone: false,
};

const contact = {
  name: "Rahim",
  relation: "Brother",
  phone: "+880999",
  email: null,
  isPublic: true,
  sortOrder: 0,
};

describe("buildPublicProfileView", () => {
  it("hides everything when all flags are false", () => {
    const v = buildPublicProfileView(base, [contact], { lost: false });
    expect(v.displayName).toBe("Someone's belongings");
    expect(v.photoUrl).toBeNull();
    expect(v.hasPhoto).toBe(false);
    expect(v.emergencyMessage).toBeNull();
    expect(v.bloodGroup).toBeNull();
    expect(v.allergies).toBeNull();
    expect(v.medicalNotes).toBeNull();
    expect(v.phonePublic).toBeNull();
    expect(v.contacts).toEqual([]);
  });

  it("never leaks the real name when namePublic is false", () => {
    const v = buildPublicProfileView({ ...base, messagePublic: true }, [], { lost: false });
    expect(JSON.stringify(v)).not.toContain("Arafat");
  });

  it("publishes only the enabled fields", () => {
    const v = buildPublicProfileView(
      { ...base, namePublic: true, photoPublic: true, bloodGroupPublic: true },
      [],
      { lost: true },
    );
    expect(v.displayName).toBe("Arafat Islam");
    expect(v.photoUrl).toBe("/media/media1");
    expect(v.hasPhoto).toBe(true);
    expect(v.bloodGroup).toBe("O+");
    expect(v.allergies).toBeNull();
    expect(v.lost).toBe(true);
  });

  it("phonePublic requires showPhone AND DIRECT_CALL", () => {
    expect(
      buildPublicProfileView({ ...base, showPhone: true, contactMode: "RELAY" }, [], { lost: false }).phonePublic,
    ).toBeNull();
    expect(
      buildPublicProfileView({ ...base, showPhone: true, contactMode: "DIRECT_CALL" }, [], { lost: false })
        .phonePublic,
    ).toBe("+880123");
  });

  it("excludes a non-public contact even when contactsPublic is true", () => {
    const v = buildPublicProfileView(
      { ...base, contactsPublic: true },
      [contact, { ...contact, name: "Secret", isPublic: false }],
      { lost: false },
    );
    expect(v.contacts.map((c) => c.name)).toEqual(["Rahim"]);
  });

  it("orders public contacts by sortOrder", () => {
    const v = buildPublicProfileView(
      { ...base, contactsPublic: true },
      [
        { ...contact, name: "Second", sortOrder: 2 },
        { ...contact, name: "First", sortOrder: 1 },
      ],
      { lost: false },
    );
    expect(v.contacts.map((c) => c.name)).toEqual(["First", "Second"]);
  });

  it("emits a fixed key set with no account internals", () => {
    const v = buildPublicProfileView(base, [], { lost: false });
    expect(Object.keys(v).sort()).toEqual(
      [
        "allergies",
        "bloodGroup",
        "contactMode",
        "contacts",
        "displayName",
        "emergencyMessage",
        "hasPhoto",
        "lost",
        "medicalNotes",
        "phonePublic",
        "photoUrl",
      ].sort(),
    );
  });
});
