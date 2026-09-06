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
    const v = buildPublicProfileView(base, [contact], [], { lost: false, entitled: true });
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
    const v = buildPublicProfileView({ ...base, messagePublic: true }, [], [], { lost: false, entitled: true });
    expect(JSON.stringify(v)).not.toContain("Arafat");
  });

  it("publishes only the enabled fields", () => {
    const v = buildPublicProfileView(
      { ...base, namePublic: true, photoPublic: true, bloodGroupPublic: true },
      [],
      [],
      { lost: true, entitled: true },
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
      buildPublicProfileView({ ...base, showPhone: true, contactMode: "RELAY" }, [], [], { lost: false, entitled: true }).phonePublic,
    ).toBeNull();
    expect(
      buildPublicProfileView({ ...base, showPhone: true, contactMode: "DIRECT_CALL" }, [], [], { lost: false, entitled: true })
        .phonePublic,
    ).toBe("+880123");
  });

  it("excludes a non-public contact even when contactsPublic is true", () => {
    const v = buildPublicProfileView(
      { ...base, contactsPublic: true },
      [contact, { ...contact, name: "Secret", isPublic: false }],
      [],
      { lost: false, entitled: true },
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
      [],
      { lost: false, entitled: true },
    );
    expect(v.contacts.map((c) => c.name)).toEqual(["First", "Second"]);
  });

  it("emits a fixed key set with no account internals", () => {
    const v = buildPublicProfileView(base, [], [], { lost: false, entitled: true });
    expect(Object.keys(v).sort()).toEqual(
      [
        "active",
        "relayOpen",
        "allergies",
        "bio",
        "bloodGroup",
        "contactMode",
        "contacts",
        "displayName",
        "emergencyMessage",
        "hasPhoto",
        "links",
        "lost",
        "medicalNotes",
        "phonePublic",
        "photoUrl",
      ].sort(),
    );
  });
});

// --- Portfolio layer (subscription-gated) --------------------------------

const link = { label: "Portfolio", url: "https://example.com", isPublic: true, sortOrder: 0 };
const withBio = { ...base, bio: "Product designer in Dhaka", bioPublic: true, linksPublic: true };

describe("buildPublicProfileView — portfolio", () => {
  it("shows bio and links to an entitled owner who published them", () => {
    const v = buildPublicProfileView(withBio, [], [link], { lost: false, entitled: true });
    expect(v.bio).toBe("Product designer in Dhaka");
    expect(v.links).toEqual([{ label: "Portfolio", url: "https://example.com" }]);
  });

  it("omits the portfolio entirely when the subscription has lapsed", () => {
    const v = buildPublicProfileView(withBio, [], [link], { lost: false, entitled: false });
    expect(v.bio).toBeNull();
    expect(v.links).toEqual([]);
  });

  it("still respects the per-field flags even when entitled", () => {
    const v = buildPublicProfileView(
      { ...withBio, bioPublic: false, linksPublic: false },
      [],
      [link],
      { lost: false, entitled: true },
    );
    expect(v.bio).toBeNull();
    expect(v.links).toEqual([]);
  });

  it("drops individually private links", () => {
    const v = buildPublicProfileView(
      withBio,
      [],
      [link, { ...link, label: "Secret", url: "https://secret.example", isPublic: false }],
      { lost: false, entitled: true },
    );
    expect(v.links.map((l) => l.label)).toEqual(["Portfolio"]);
  });

  it("orders links by sortOrder", () => {
    const v = buildPublicProfileView(
      withBio,
      [],
      [
        { ...link, label: "Second", sortOrder: 2 },
        { ...link, label: "First", sortOrder: 1 },
      ],
      { lost: false, entitled: true },
    );
    expect(v.links.map((l) => l.label)).toEqual(["First", "Second"]);
  });
});

describe("buildPublicProfileView — link URLs are attacker-influenced", () => {
  const publish = (url: string) =>
    buildPublicProfileView(withBio, [], [{ ...link, url }], { lost: false, entitled: true }).links;

  it("allows http and https", () => {
    expect(publish("https://example.com")).toHaveLength(1);
    expect(publish("http://example.com")).toHaveLength(1);
  });

  it("drops javascript:, data: and every other scheme", () => {
    for (const url of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "  javascript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "not a url at all",
    ]) {
      expect(publish(url)).toEqual([]);
    }
  });
});

describe("a lapsed subscription closes the page", () => {
  const everythingPublic = {
    ...base,
    bio: "Designer in Dhaka",
    bloodGroupPublic: true,
    allergiesPublic: true,
    medicalNotesPublic: true,
    messagePublic: true,
    namePublic: true,
    photoPublic: true,
    contactsPublic: true,
    bioPublic: true,
    linksPublic: true,
  };

  const dormant = () =>
    buildPublicProfileView(everythingPublic, [contact], [link], {
      lost: false,
      entitled: false,
    });

  it("marks the view inactive", () => {
    expect(dormant().active).toBe(false);
  });

  it("withholds every field the owner had published", () => {
    const v = dormant();
    expect(v.displayName).toBe("Someone's belongings");
    expect(v.photoUrl).toBeNull();
    expect(v.hasPhoto).toBe(false);
    expect(v.emergencyMessage).toBeNull();
    expect(v.bloodGroup).toBeNull();
    expect(v.allergies).toBeNull();
    expect(v.medicalNotes).toBeNull();
    expect(v.phonePublic).toBeNull();
    expect(v.bio).toBeNull();
    expect(v.contacts).toEqual([]);
    expect(v.links).toEqual([]);
  });

  it("leaks nothing through any string value in the view", () => {
    const serialised = JSON.stringify(dormant());
    for (const secret of [
      "Arafat Islam",
      "O+",
      "penicillin",
      "asthma",
      "Rahim",
      "+880999",
      "+880123",
      "media1",
      "Designer in Dhaka",
      "example.com",
    ]) {
      expect(serialised).not.toContain(secret);
    }
  });

  it("keeps the relay open so a found item can still be returned", () => {
    expect(dormant().relayOpen).toBe(true);
    expect(dormant().contactMode).toBe("RELAY");
  });

  it("still reports a lost flag, which is not owner information", () => {
    const v = buildPublicProfileView(everythingPublic, [], [], { lost: true, entitled: false });
    expect(v.lost).toBe(true);
  });

  it("publishes everything again once the subscription is active", () => {
    const live = buildPublicProfileView(everythingPublic, [contact], [link], {
      lost: false,
      entitled: true,
    });
    expect(live.active).toBe(true);
    expect(live.bloodGroup).toBe("O+");
    expect(live.displayName).toBe("Arafat Islam");
    expect(live.contacts).toHaveLength(1);
    expect(live.links).toHaveLength(1);
  });
});
