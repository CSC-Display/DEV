import fs from "fs/promises";

const API_TOKEN = process.env.PLAY_CRICKET_KEY;

if (!API_TOKEN) {
  throw new Error("Missing PLAY_CRICKET_KEY");
}

const SITE_ID = 1786;
const SEASON = "2026";
const OUTPUT_FILE = "data/cricket-league-tables-all.json";

// These are the seven tables required for the two league-table webpages.
// divisionId can be left as null: the script will try to infer the current season's
// division_id from Play-Cricket result_summary for that team.
// If any team does not infer correctly, add the current season division_id here.
const TEAMS = [
  { label: "Sat 1st XI", id: 24293, divisionId: null },
  { label: "Sat 2nd XI", id: 24294, divisionId: null },
  { label: "Sat 3rd XI", id: 24295, divisionId: null },
  { label: "Sat 4th XI", id: 30461, divisionId: null },
  { label: "Sat 5th XI", id: 45348, divisionId: null },
  { label: "NECL 1st XI", id: 324716, divisionId: null },
  { label: "Womens 1st XI", id: 213007, divisionId: null }
];

function parseDMY(dmy) {
  const m = String(dmy || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return 0;

  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);

  return new Date(yyyy, mm - 1, dd).getTime();
}

function sortMatchesNewestFirst(list) {
  return (list || []).slice().sort((a, b) => {
    const ad = parseDMY(a.match_date) || parseDMY(a.last_updated) || 0;
    const bd = parseDMY(b.match_date) || parseDMY(b.last_updated) || 0;

    if (bd !== ad) return bd - ad;

    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
}

function pickList(json) {
  return json?.result_summary || [];
}

function firstTruthy(...values) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== "") || null;
}

function extractDivisionId(match) {
  if (!match) return null;

  // Play-Cricket fields can vary slightly between endpoints/competitions,
  // so check several plausible division id field names.
  return firstTruthy(
    match.division_id,
    match.league_division_id,
    match.competition_division_id,
    match.competition?.division_id,
    match.division?.id
  );
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${url}`);
  }

  return await res.json();
}

async function fetchResultSummaryForTeam(teamId) {
  const url =
    `https://play-cricket.com/api/v2/result_summary.json` +
    `?site_id=${encodeURIComponent(SITE_ID)}` +
    `&season=${encodeURIComponent(SEASON)}` +
    `&team_id=${encodeURIComponent(teamId)}` +
    `&api_token=${encodeURIComponent(API_TOKEN)}`;

  return await fetchJson(url);
}

async function inferDivisionIdForTeam(team) {
  if (team.divisionId) {
    return String(team.divisionId);
  }

  const json = await fetchResultSummaryForTeam(team.id);
  const matches = sortMatchesNewestFirst(pickList(json));

  for (const match of matches) {
    const divisionId = extractDivisionId(match);
    if (divisionId) {
      return String(divisionId);
    }
  }

  throw new Error(
    `Could not infer division_id for ${team.label}. ` +
    `Add the current season divisionId to the TEAMS array in this script.`
  );
}

async function fetchLeagueTable(divisionId) {
  const url =
    `https://play-cricket.com/api/v2/league_table.json` +
    `?division_id=${encodeURIComponent(divisionId)}` +
    `&api_token=${encodeURIComponent(API_TOKEN)}`;

  const json = await fetchJson(url);
  const table = json?.league_table?.[0] || null;

  if (!table) {
    throw new Error(`No league_table returned for division_id ${divisionId}`);
  }

  return table;
}

const output = [];

for (const team of TEAMS) {
  const fetchedAt = new Date().toISOString();

  try {
    console.log(`Fetching league table for ${team.label}`);

    const divisionId = await inferDivisionIdForTeam(team);
    const table = await fetchLeagueTable(divisionId);

    output.push({
      config: {
        label: team.label,
        team_id: team.id,
        division_id: divisionId,
        season: SEASON,
        fetched_at: fetchedAt
      },
      data: table
    });

    console.log(`Fetched ${team.label} division_id=${divisionId}`);

  } catch (error) {
    console.error(`League table fetch failed for ${team.label}`, error);

    // Keep the object in the JSON so the HTML can show a helpful message
    // rather than silently losing a table box.
    output.push({
      config: {
        label: team.label,
        team_id: team.id,
        division_id: team.divisionId || null,
        season: SEASON,
        fetched_at: fetchedAt
      },
      data: null,
      error: String(error?.message || error)
    });
  }
}

await fs.mkdir("data", { recursive: true });

await fs.writeFile(
  OUTPUT_FILE,
  JSON.stringify(output, null, 2),
  "utf8"
);

console.log(`Cricket league tables updated: ${OUTPUT_FILE}`);
