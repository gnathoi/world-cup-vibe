// The 48 teams in the 2026 World Cup. Source of truth lives in openfootball;
// this is the static fallback so the allocator can run before/without the
// openfootball fetch (e.g. local dev, allocation ceremony).
//
// Codes are FIFA 3-letter. Update with any qualifier surprises before kickoff.

import type { Team } from "./allocator";

export const HOST_NATIONS = ["USA", "CAN", "MEX"];

export const TEAMS_2026: Team[] = [
  // Hosts (3)
  { code: "USA", name: "United States" },
  { code: "CAN", name: "Canada" },
  { code: "MEX", name: "Mexico" },

  // UEFA (16)
  { code: "ENG", name: "England" },
  { code: "FRA", name: "France" },
  { code: "GER", name: "Germany" },
  { code: "ESP", name: "Spain" },
  { code: "POR", name: "Portugal" },
  { code: "NED", name: "Netherlands" },
  { code: "ITA", name: "Italy" },
  { code: "BEL", name: "Belgium" },
  { code: "CRO", name: "Croatia" },
  { code: "DEN", name: "Denmark" },
  { code: "SUI", name: "Switzerland" },
  { code: "AUT", name: "Austria" },
  { code: "POL", name: "Poland" },
  { code: "SRB", name: "Serbia" },
  { code: "TUR", name: "Türkiye" },
  { code: "SCO", name: "Scotland" },

  // CONMEBOL (6)
  { code: "ARG", name: "Argentina" },
  { code: "BRA", name: "Brazil" },
  { code: "URU", name: "Uruguay" },
  { code: "COL", name: "Colombia" },
  { code: "ECU", name: "Ecuador" },
  { code: "PAR", name: "Paraguay" },

  // CAF (9)
  { code: "MAR", name: "Morocco" },
  { code: "SEN", name: "Senegal" },
  { code: "TUN", name: "Tunisia" },
  { code: "EGY", name: "Egypt" },
  { code: "ALG", name: "Algeria" },
  { code: "NGA", name: "Nigeria" },
  { code: "CIV", name: "Ivory Coast" },
  { code: "CMR", name: "Cameroon" },
  { code: "GHA", name: "Ghana" },

  // AFC (8)
  { code: "JPN", name: "Japan" },
  { code: "KOR", name: "South Korea" },
  { code: "AUS", name: "Australia" },
  { code: "IRN", name: "Iran" },
  { code: "KSA", name: "Saudi Arabia" },
  { code: "QAT", name: "Qatar" },
  { code: "UZB", name: "Uzbekistan" },
  { code: "JOR", name: "Jordan" },

  // CONCACAF (3 from CFU/CONCACAF qualifiers, in addition to hosts)
  { code: "CRC", name: "Costa Rica" },
  { code: "PAN", name: "Panama" },
  { code: "JAM", name: "Jamaica" },

  // OFC (1)
  { code: "NZL", name: "New Zealand" },

  // Inter-confederation playoff winners (2 placeholders, refine post-qualifying)
  { code: "BOL", name: "Bolivia" },
  { code: "IRQ", name: "Iraq" },
];

if (TEAMS_2026.length !== 48) {
  throw new Error(
    `TEAMS_2026 must have 48 entries, has ${TEAMS_2026.length}. Update before allocation.`,
  );
}
