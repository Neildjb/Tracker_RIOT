// Validation du format Riot ID « Pseudo#TAG ».
// Règles Riot : pseudo de 3 à 16 caractères, tag de 3 à 5 caractères alphanumériques.

export interface RiotId {
  gameName: string;
  tagLine: string;
}

export type RiotIdParseResult = { ok: true; value: RiotId } | { ok: false; error: string };

export function parseRiotId(input: string): RiotIdParseResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Saisissez un Riot ID au format Pseudo#TAG." };
  const hash = raw.lastIndexOf("#");
  if (hash === -1) return { ok: false, error: "Il manque le tag : utilisez le format Pseudo#TAG (ex : Faker#KR1)." };
  const gameName = raw.slice(0, hash).trim();
  const tagLine = raw.slice(hash + 1).trim();
  return validateRiotId(gameName, tagLine);
}

export function validateRiotId(gameName: string, tagLine: string): RiotIdParseResult {
  // Pas de caractères de contrôle ni de séparateurs de chemin (/ \ # ? %) dans un pseudo.
  if (/[\p{Cc}\p{Cf}/\\#?%<>"'`&{}|^]/u.test(gameName)) {
    return { ok: false, error: "Le pseudo contient des caractères non autorisés." };
  }
  if (gameName.length < 3 || gameName.length > 16) {
    return { ok: false, error: "Le pseudo doit contenir entre 3 et 16 caractères." };
  }
  if (!/^[\p{L}\p{N}]{3,5}$/u.test(tagLine)) {
    return { ok: false, error: "Le tag doit contenir entre 3 et 5 caractères alphanumériques (sans #)." };
  }
  return { ok: true, value: { gameName, tagLine } };
}
