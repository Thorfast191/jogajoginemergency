// The single source of truth for what the public scan page (and the dashboard
// privacy preview) may show. Nothing else builds a "public" view of a profile.
//
// It takes the full profile + contacts and returns a plain DTO containing ONLY
// the fields whose visibility flag is set. The owner's real name, account
// phone, and any non-public medical data never enter the returned object — not
// as a value, not as a key.

export type ContactMode = "RELAY" | "DIRECT_CALL";

export type EmergencyProfileInput = {
  displayName: string | null;
  photoAssetId: string | null;
  bloodGroup: string | null;
  allergies: string | null;
  medicalNotes: string | null;
  emergencyMessage: string | null;
  contactMode: ContactMode | "MASKED_PHONE";
  phonePublic: string | null;
  photoPublic: boolean;
  namePublic: boolean;
  messagePublic: boolean;
  bloodGroupPublic: boolean;
  allergiesPublic: boolean;
  medicalNotesPublic: boolean;
  contactsPublic: boolean;
  showPhone: boolean;
  bio?: string | null;
  bioPublic?: boolean;
  linksPublic?: boolean;
};

export type EmergencyContactInput = {
  name: string;
  relation: string | null;
  phone: string | null;
  email: string | null;
  isPublic: boolean;
  sortOrder: number;
};

export type ProfileLinkInput = {
  label: string;
  url: string;
  isPublic: boolean;
  sortOrder: number;
};

export type PublicLink = { label: string; url: string };

export type PublicContact = {
  name: string;
  relation: string | null;
  phone: string | null;
  email: string | null;
};

export type PublicProfileView = {
  lost: boolean;
  displayName: string;
  hasPhoto: boolean;
  photoUrl: string | null;
  emergencyMessage: string | null;
  bloodGroup: string | null;
  allergies: string | null;
  medicalNotes: string | null;
  contactMode: ContactMode;
  phonePublic: string | null;
  contacts: PublicContact[];
  bio: string | null;
  links: PublicLink[];
};

const ANON_NAME = "Someone's belongings";

// Link URLs are typed by the owner and rendered as href on a page strangers
// open. Only http(s) is ever emitted — `javascript:` and `data:` would both be
// script execution in a finder's browser.
const SAFE_SCHEMES = new Set(["http:", "https:"]);

export function isSafeLinkUrl(raw: string): boolean {
  try {
    return SAFE_SCHEMES.has(new URL(raw.trim()).protocol);
  } catch {
    return false;
  }
}

export function buildPublicProfileView(
  profile: EmergencyProfileInput,
  contacts: EmergencyContactInput[],
  links: ProfileLinkInput[],
  opts: { lost: boolean; entitled: boolean },
): PublicProfileView {
  const contactMode: ContactMode = profile.contactMode === "DIRECT_CALL" ? "DIRECT_CALL" : "RELAY";

  const displayName =
    profile.namePublic && profile.displayName ? profile.displayName : ANON_NAME;

  const photoUrl =
    profile.photoPublic && profile.photoAssetId ? `/media/${profile.photoAssetId}` : null;

  const publicContacts: PublicContact[] = profile.contactsPublic
    ? [...contacts]
        .filter((c) => c.isPublic)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => ({ name: c.name, relation: c.relation, phone: c.phone, email: c.email }))
    : [];

  // The portfolio layer is the only part of this view a subscription gates.
  // Everything below it — name, photo, message, medical fields, contacts — is
  // free forever, so a lapsed card never hides anything a responder needs.
  const publicLinks: PublicLink[] =
    opts.entitled && profile.linksPublic !== false
      ? [...links]
          .filter((l) => l.isPublic && isSafeLinkUrl(l.url))
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((l) => ({ label: l.label, url: l.url.trim() }))
      : [];

  return {
    lost: opts.lost,
    displayName,
    hasPhoto: photoUrl !== null,
    photoUrl,
    emergencyMessage: profile.messagePublic ? profile.emergencyMessage : null,
    bloodGroup: profile.bloodGroupPublic ? profile.bloodGroup : null,
    allergies: profile.allergiesPublic ? profile.allergies : null,
    medicalNotes: profile.medicalNotesPublic ? profile.medicalNotes : null,
    contactMode,
    phonePublic:
      profile.showPhone && contactMode === "DIRECT_CALL" ? profile.phonePublic : null,
    contacts: publicContacts,
    bio: opts.entitled && profile.bioPublic ? (profile.bio ?? null) : null,
    links: publicLinks,
  };
}
