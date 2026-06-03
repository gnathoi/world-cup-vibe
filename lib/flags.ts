// Flag emoji for each FIFA 3-letter code used in the 2026 World Cup.
// Most flags are derived from the ISO 3166-1 alpha-2 code (two regional
// indicator letters). England and Scotland use Unicode tag sequences.

const FLAGS: Record<string, string> = {
  // Hosts
  USA: "🇺🇸",
  CAN: "🇨🇦",
  MEX: "🇲🇽",

  // UEFA
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  FRA: "🇫🇷",
  GER: "🇩🇪",
  ESP: "🇪🇸",
  POR: "🇵🇹",
  NED: "🇳🇱",
  ITA: "🇮🇹",
  BEL: "🇧🇪",
  CRO: "🇭🇷",
  DEN: "🇩🇰",
  SUI: "🇨🇭",
  AUT: "🇦🇹",
  POL: "🇵🇱",
  SRB: "🇷🇸",
  TUR: "🇹🇷",

  // CONMEBOL
  ARG: "🇦🇷",
  BRA: "🇧🇷",
  URU: "🇺🇾",
  COL: "🇨🇴",
  ECU: "🇪🇨",
  PAR: "🇵🇾",

  // CAF
  MAR: "🇲🇦",
  SEN: "🇸🇳",
  TUN: "🇹🇳",
  EGY: "🇪🇬",
  ALG: "🇩🇿",
  NGA: "🇳🇬",
  CIV: "🇨🇮",
  CMR: "🇨🇲",
  GHA: "🇬🇭",

  // AFC
  JPN: "🇯🇵",
  KOR: "🇰🇷",
  AUS: "🇦🇺",
  IRN: "🇮🇷",
  KSA: "🇸🇦",
  QAT: "🇶🇦",
  UZB: "🇺🇿",
  JOR: "🇯🇴",

  // CONCACAF
  CRC: "🇨🇷",
  PAN: "🇵🇦",
  JAM: "🇯🇲",

  // OFC
  NZL: "🇳🇿",

  // Inter-confederation playoff
  BOL: "🇧🇴",
  IRQ: "🇮🇶",

  // Extra teams in openfootball qualifying/playoff data.
  // Codes are synthesised by the adapter (first 3 alpha chars of country name).
  NOR: "🇳🇴", // Norway
  SWE: "🇸🇪", // Sweden
  CZE: "🇨🇿", // Czech Republic
  HAI: "🇭🇹", // Haiti
  BOS: "🇧🇦", // Bosnia & Herzegovina
  CAP: "🇨🇻", // Cape Verde
  CUR: "🇨🇼", // Curaçao
  DRC: "🇨🇩", // DR Congo
  SOU: "🇿🇦", // South Africa
};

export function flag(code: string): string {
  // Return empty string for unknown codes — TBD knockout slots synthesise
  // single-letter codes like "A", "W", "L" that have no meaningful flag.
  return FLAGS[code] ?? "";
}
