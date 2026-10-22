import "server-only";
import { randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";

// Mots de passe d'influenceurs : générés par l'admin, jamais stockés en clair (scrypt + sel aléatoire)
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const derive = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 32, (err, key) => (err ? reject(err) : resolve(key))));

export function generatePassword() {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("base64")}$${(await derive(normalize(password), salt)).toString("base64")}`;
}

// Tolère minuscules et espaces : le mot de passe est recopié depuis un message
const normalize = (p: string) => p.trim().toUpperCase();

// Un faux hash est vérifié quand l'identifiant n'existe pas, pour que la durée de réponse ne révèle rien
const DUMMY = `scrypt$${Buffer.alloc(16).toString("base64")}$${Buffer.alloc(32).toString("base64")}`;

export async function verifyPassword(password: string, hash: string | null | undefined) {
  const [scheme, salt, key] = (hash ?? DUMMY).split("$");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = await derive(normalize(password), Buffer.from(salt, "base64"));
  return Boolean(hash) && expected.length === actual.length && timingSafeEqual(expected, actual);
}
