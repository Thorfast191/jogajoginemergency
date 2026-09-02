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
};

export type EmergencyContactInput = {
  name: string;
  relation: string | null;
  phone: string | null;
  email: string | null;
  isPublic: boolean;
  sortOrder: number;
};

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
};

const ANON_NAME = "Someone's belongings";

export function buildPublicProfileView(
  profile: EmergencyProfileInput,
  contacts: EmergencyContactInput[],
  opts: { lost: boolean },
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
  };
}
