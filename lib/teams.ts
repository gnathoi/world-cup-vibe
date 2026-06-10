// The 48 teams in the 2026 World Cup. Source of truth:
// https://raw.githubusercontent.com/openfootball/worldcup.json/refs/heads/master/2026/worldcup.teams.json
//
// Codes are FIFA 3-letter. Hosts guard in allocator uses HOST_NATIONS.

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
  { code: "BEL", name: "Belgium" },
  { code: "CRO", name: "Croatia" },
  { code: "SUI", name: "Switzerland" },
  { code: "AUT", name: "Austria" },
  { code: "TUR", name: "Türkiye" },
  { code: "SCO", name: "Scotland" },
  { code: "BIH", name: "Bosnia & Herzegovina" },
  { code: "CZE", name: "Czech Republic" },
  { code: "NOR", name: "Norway" },
  { code: "SWE", name: "Sweden" },

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
  { code: "CIV", name: "Ivory Coast" },
  { code: "GHA", name: "Ghana" },
  { code: "RSA", name: "South Africa" },
  { code: "CPV", name: "Cape Verde" },

  // AFC (8)
  { code: "JPN", name: "Japan" },
  { code: "KOR", name: "South Korea" },
  { code: "AUS", name: "Australia" },
  { code: "IRN", name: "Iran" },
  { code: "KSA", name: "Saudi Arabia" },
  { code: "QAT", name: "Qatar" },
  { code: "UZB", name: "Uzbekistan" },
  { code: "IRQ", name: "Iraq" },

  // CONCACAF (3, excluding hosts)
  { code: "PAN", name: "Panama" },
  { code: "CUW", name: "Curaçao" },
  { code: "HAI", name: "Haiti" },

  // OFC (1)
  { code: "NZL", name: "New Zealand" },

  // Other (2)
  { code: "JOR", name: "Jordan" },
  { code: "COD", name: "DR Congo" },
];

if (TEAMS_2026.length !== 48) {
  throw new Error(
    `TEAMS_2026 must have 48 entries, has ${TEAMS_2026.length}. Update before allocation.`,
  );
}
