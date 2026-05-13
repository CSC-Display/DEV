import fs from "fs/promises";

const API_TOKEN = process.env.PLAY_CRICKET_KEY;

if (!API_TOKEN) {
  throw new Error("Missing PLAY_CRICKET_KEY");
}

const SITE_ID = 1786;
const SEASON = "2026";
const CLUB_MATCH_TEXT = "chelmsford";
const OUTPUT_FILE = "data/cricket-club-statistics.json";
const TOP_N = 20;

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function firstValue(obj, keys, fallback = "") {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
      return obj[key];
    }
  }
  return fallback;
}

function normaliseName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseOversToBalls(value) {
  if (value === null || value === undefined || value === "") return 0;

  const text = String(value).trim();
  const [oversText, ballsText = "0"] = text.split(".");
  const overs = asNumber(oversText, 0);
  const balls = asNumber(ballsText, 0);

  return overs * 6 + balls;
}

function ballsToOvers(balls) {
  const fullOvers = Math.floor(balls / 6);
  const remainingBalls = balls % 6;
  return Number(`${fullOvers}.${remainingBalls}`);
}

function isNotOut(howOut) {
  const text = String(howOut || "").toLowerCase();
  return text.includes("not out") || text === "no" || text === "retired not out";
}

function isChelmsfordInnings(innings) {
  const teamName = String(firstValue(innings, ["team_batting_name", "batting_team_name", "team_name"], "")).toLowerCase();
  return teamName.includes(CLUB_MATCH_TEXT);
}

function getTeamLabel(innings) {
  return normaliseName(firstValue(innings, ["team_batting_name", "team_name"], "Chelmsford"));
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${url}`);
  }

  return await res.json();
}

async function fetchMatches() {
  const url =
    `https://play-cricket.com/api/v2/matches.json` +
    `?site_id=${encodeURIComponent(SITE_ID)}` +
    `&season=${encodeURIComponent(SEASON)}` +
    `&api_token=${encodeURIComponent(API_TOKEN)}`;

  const json = await fetchJson(url);
  return json.matches || [];
}

async function fetchMatchDetail(matchId) {
  const url =
    `https://play-cricket.com/api/v2/match_detail.json` +
    `?match_id=${encodeURIComponent(matchId)}` +
    `&api_token=${encodeURIComponent(API_TOKEN)}`;

  const json = await fetchJson(url);
  return json.match_details?.[0] || null;
}

function addBatting(battingMap, innings, match) {
  const teamLabel = getTeamLabel(innings);

  for (const bat of innings.bat || []) {
    const player = normaliseName(firstValue(bat, ["batsman_name", "player_name", "name"], ""));
    if (!player) continue;

    const runs = asNumber(firstValue(bat, ["runs", "runs_scored"], 0));
    const balls = asNumber(firstValue(bat, ["balls", "balls_faced"], 0));
    const fours = asNumber(firstValue(bat, ["fours", "4s", "four"], 0));
    const sixes = asNumber(firstValue(bat, ["sixes", "6s", "six"], 0));
    const howOut = firstValue(bat, ["how_out", "dismissal"], "");
    const notOut = isNotOut(howOut);

    if (!battingMap.has(player)) {
      battingMap.set(player, {
        player,
        teams: new Set(),
        matches: new Set(),
        innings: 0,
        not_outs: 0,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        high_score: 0,
        high_score_not_out: false,
        fifties: 0,
        hundreds: 0
      });
    }

    const row = battingMap.get(player);
    row.teams.add(teamLabel);
    row.matches.add(String(match.id));
    row.innings += 1;
    row.not_outs += notOut ? 1 : 0;
    row.runs += runs;
    row.balls += balls;
    row.fours += fours;
    row.sixes += sixes;
    row.fifties += runs >= 50 && runs < 100 ? 1 : 0;
    row.hundreds += runs >= 100 ? 1 : 0;

    if (runs > row.high_score || (runs === row.high_score && notOut && !row.high_score_not_out)) {
      row.high_score = runs;
      row.high_score_not_out = notOut;
    }
  }
}

function addBowling(bowlingMap, innings, match) {
  const bowlingTeamLabel = String(firstValue(innings, ["team_bowling_name", "bowling_team_name"], "Chelmsford"));
  const battingTeamIsChelmsford = isChelmsfordInnings(innings);

  // Chelmsford bowling figures appear in the innings where the opposition is batting.
  // Some Play-Cricket responses include team_bowling_name, some do not, so use both checks.
  const bowlingTeamLooksChelmsford = bowlingTeamLabel.toLowerCase().includes(CLUB_MATCH_TEXT);
  if (battingTeamIsChelmsford && !bowlingTeamLooksChelmsford) return;

  const teamLabel = normaliseName(bowlingTeamLooksChelmsford ? bowlingTeamLabel : "Chelmsford CC");

  for (const bowl of innings.bowl || []) {
    const player = normaliseName(firstValue(bowl, ["bowler_name", "player_name", "name"], ""));
    if (!player) continue;

    const wickets = asNumber(firstValue(bowl, ["wickets", "w"], 0));
    const runs = asNumber(firstValue(bowl, ["runs", "runs_conceded", "r"], 0));
    const maidens = asNumber(firstValue(bowl, ["maidens", "m"], 0));
    const balls = parseOversToBalls(firstValue(bowl, ["overs", "o"], 0));
    const wides = asNumber(firstValue(bowl, ["wides", "wd"], 0));
    const no_balls = asNumber(firstValue(bowl, ["no_balls", "nb"], 0));

    if (!bowlingMap.has(player)) {
      bowlingMap.set(player, {
        player,
        teams: new Set(),
        matches: new Set(),
        innings: 0,
        balls: 0,
        maidens: 0,
        runs: 0,
        wickets: 0,
        wides: 0,
        no_balls: 0,
        best_wickets: 0,
        best_runs: 0,
        three_wickets: 0,
        five_wickets: 0
      });
    }

    const row = bowlingMap.get(player);
    row.teams.add(teamLabel);
    row.matches.add(String(match.id));
    row.innings += 1;
    row.balls += balls;
    row.maidens += maidens;
    row.runs += runs;
    row.wickets += wickets;
    row.wides += wides;
    row.no_balls += no_balls;
    row.three_wickets += wickets >= 3 ? 1 : 0;
    row.five_wickets += wickets >= 5 ? 1 : 0;

    if (
      wickets > row.best_wickets ||
      (wickets === row.best_wickets && wickets > 0 && runs < row.best_runs)
    ) {
      row.best_wickets = wickets;
      row.best_runs = runs;
    }
  }
}

function finaliseBatting(battingMap) {
  return [...battingMap.values()]
    .map(row => {
      const outs = row.innings - row.not_outs;
      const average = outs > 0 ? row.runs / outs : null;
      const strike_rate = row.balls > 0 ? (row.runs / row.balls) * 100 : null;

      return {
        player: row.player,
        teams: [...row.teams].sort().join(", "),
        matches: row.matches.size,
        innings: row.innings,
        not_outs: row.not_outs,
        runs: row.runs,
        balls: row.balls,
        fours: row.fours,
        sixes: row.sixes,
        high_score: row.high_score,
        high_score_display: `${row.high_score}${row.high_score_not_out ? "*" : ""}`,
        average,
        strike_rate,
        fifties: row.fifties,
        hundreds: row.hundreds
      };
    })
    .sort((a, b) => b.runs - a.runs || b.high_score - a.high_score || a.player.localeCompare(b.player))
    .slice(0, TOP_N);
}

function finaliseBowling(bowlingMap) {
  return [...bowlingMap.values()]
    .map(row => {
      const overs = ballsToOvers(row.balls);
      const average = row.wickets > 0 ? row.runs / row.wickets : null;
      const economy = row.balls > 0 ? row.runs / (row.balls / 6) : null;
      const strike_rate = row.wickets > 0 ? row.balls / row.wickets : null;

      return {
        player: row.player,
        teams: [...row.teams].sort().join(", "),
        matches: row.matches.size,
        innings: row.innings,
        balls: row.balls,
        overs,
        maidens: row.maidens,
        runs: row.runs,
        wickets: row.wickets,
        wides: row.wides,
        no_balls: row.no_balls,
        best: row.best_wickets > 0 ? `${row.best_wickets}-${row.best_runs}` : "—",
        average,
        economy,
        strike_rate,
        three_wickets: row.three_wickets,
        five_wickets: row.five_wickets
      };
    })
    .sort((a, b) => b.wickets - a.wickets || a.average - b.average || a.economy - b.economy || a.player.localeCompare(b.player))
    .slice(0, TOP_N);
}

const matches = await fetchMatches();
const completedMatches = matches
  .filter(match => match.id && (match.result || match.result_description || match.result_locked === "true"));

const uniqueMatches = [...new Map(completedMatches.map(match => [String(match.id), match])).values()];

const battingMap = new Map();
const bowlingMap = new Map();

for (const match of uniqueMatches) {
  console.log(`Fetching scorecard for match ${match.id}`);

  try {
    const detail = await fetchMatchDetail(match.id);
    if (!detail || !Array.isArray(detail.innings)) continue;

    for (const innings of detail.innings) {
      if (isChelmsfordInnings(innings)) {
        addBatting(battingMap, innings, match);
      }
      addBowling(bowlingMap, innings, match);
    }
  } catch (err) {
    console.error(`Failed to process match ${match.id}`, err);
  }
}

const output = {
  site_id: SITE_ID,
  season: SEASON,
  generated_at: new Date().toISOString(),
  match_count: uniqueMatches.length,
  batting: finaliseBatting(battingMap),
  bowling: finaliseBowling(bowlingMap)
};

await fs.mkdir("data", { recursive: true });
await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8");

console.log(`Club statistics updated: ${OUTPUT_FILE}`);
