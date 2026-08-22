import { customAlphabet } from "nanoid";

// Unambiguous alphabet (no 0/O/1/I/l) since codes may be read off a printed sticker.
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

export const generateShortCode = customAlphabet(alphabet, 8);
