import type { PublicProfileView } from "@/lib/public-profile";

/**
 * The made-up person on the demo scan page and the home page phone. Every
 * sample QR code (theme previews, shop cards) opens this, never a real
 * profile. The number is a placeholder and is never rendered as a link.
 */
export const DEMO_VIEW: PublicProfileView = {
  active: true,
  relayOpen: true,
  lost: false,
  displayName: "Rafi (sample)",
  hasPhoto: false,
  photoUrl: null,
  emergencyMessage:
    "I ride this bike to work every day. If I've had an accident, please call my sister first.",
  bloodGroup: "B+",
  allergies: "Penicillin",
  medicalNotes: "Mild asthma — inhaler in the left pocket of my bag.",
  contactMode: "RELAY",
  phonePublic: null,
  contacts: [{ name: "Nadia", relation: "Sister", phone: "01X-XXXX-XXXX", email: null }],
  bio: "Cyclist, maths teacher, tea enthusiast.",
  links: [],
};
