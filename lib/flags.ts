// Flag emoji for each FIFA 3-letter code used in the 2026 World Cup.
// Most flags are derived from the ISO 3166-1 alpha-2 code (two regional
// indicator letters). England and Scotland use Unicode tag sequences.

// Keys MUST match the canonical codes in lib/teams.ts (TEAMS_2026).
const FLAGS: Record<string, string> = {
  // Hosts
  USA: "🇺🇸",
  CAN: "🇨🇦",
  MEX: "🇲🇽",

  // UEFA (16)
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  FRA: "🇫🇷",
  GER: "🇩🇪",
  ESP: "🇪🇸",
  POR: "🇵🇹",
  NED: "🇳🇱",
  BEL: "🇧🇪",
  CRO: "🇭🇷",
  SUI: "🇨🇭",
  AUT: "🇦🇹",
  TUR: "🇹🇷",
  SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  BIH: "🇧🇦",
  CZE: "🇨🇿",
  NOR: "🇳🇴",
  SWE: "🇸🇪",

  // CONMEBOL (6)
  ARG: "🇦🇷",
  BRA: "🇧🇷",
  URU: "🇺🇾",
  COL: "🇨🇴",
  ECU: "🇪🇨",
  PAR: "🇵🇾",

  // CAF (9)
  MAR: "🇲🇦",
  SEN: "🇸🇳",
  TUN: "🇹🇳",
  EGY: "🇪🇬",
  ALG: "🇩🇿",
  CIV: "🇨🇮",
  GHA: "🇬🇭",
  RSA: "🇿🇦",
  CPV: "🇨🇻",

  // AFC (8)
  JPN: "🇯🇵",
  KOR: "🇰🇷",
  AUS: "🇦🇺",
  IRN: "🇮🇷",
  KSA: "🇸🇦",
  QAT: "🇶🇦",
  UZB: "🇺🇿",
  IRQ: "🇮🇶",

  // CONCACAF (3, excl. hosts)
  PAN: "🇵🇦",
  CUW: "🇨🇼",
  HAI: "🇭🇹",

  // OFC (1)
  NZL: "🇳🇿",

  // Other (2)
  JOR: "🇯🇴",
  COD: "🇨🇩",
};

export function flag(code: string): string {
  // Return empty string for unknown codes — TBD knockout slots synthesise
  // single-letter codes like "A", "W", "L" that have no meaningful flag.
  return FLAGS[code] ?? "";
}
