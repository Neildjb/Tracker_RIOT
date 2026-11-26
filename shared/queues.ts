// Libellés des files de jeu (queueId Match-V5). Source : constantes publiques Riot (queues.json).
const QUEUES: Record<number, string> = {
  0: "Partie personnalisée",
  400: "Normale (Draft)",
  420: "Classée Solo/Duo",
  430: "Normale (Aveugle)",
  440: "Classée Flex",
  450: "ARAM",
  480: "Swiftplay",
  490: "Partie rapide",
  700: "Clash",
  720: "Clash ARAM",
  830: "Coop vs IA",
  840: "Coop vs IA",
  850: "Coop vs IA",
  870: "Coop vs IA",
  880: "Coop vs IA",
  890: "Coop vs IA",
  900: "ARURF",
  1700: "Arena",
  1710: "Arena",
  1900: "URF",
};

export function queueName(queueId: number, gameMode: string): string {
  return QUEUES[queueId] ?? (gameMode ? gameMode.charAt(0) + gameMode.slice(1).toLowerCase() : `File ${queueId}`);
}
