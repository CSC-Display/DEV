import fs from "fs/promises";

const API_TOKEN = process.env.PLAY_CRICKET_KEY;

if (!API_TOKEN) {
  throw new Error("Missing PLAY_CRICKET_KEY");
}

const TARGET_TEAMS = [
  {
    label: "NECL 1st XI",
    division_id: 134513
  },
  {
    label: "Women's 1st XI",
    division_id: 137056
  }
];

async function fetchLeagueTable(divisionId) {
  const url =
    `https://play-cricket.com/api/v2/league_table.json?division_id=${divisionId}&api_token=${API_TOKEN}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Play-Cricket API failed for division ${divisionId}: ${response.status}`);
  }

  const json = await response.json();

  if (!json.league_table || !json.league_table[0]) {
    throw new Error(`No league table returned for division ${divisionId}`);
  }

  return json.league_table[0];
}

const output = [];

for (const team of TARGET_TEAMS) {
  const table = await fetchLeagueTable(team.division_id);

  output.push({
    config: {
      label: team.label,
      division_id: team.division_id,
      fetched_at: new Date().toISOString()
    },
    data: table
  });
}

await fs.mkdir("data", { recursive: true });
await fs.writeFile(
  "data/cricket-league-tables-3.json",
  JSON.stringify(output, null, 2),
  "utf8"
);

console.log("League tables updated.");
