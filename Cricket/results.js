// Cricket API Data Filter - Extract Essential Match Information Only
// Usage: Replace 'apiResponse' with your actual API response data

function filterCricketData(apiResponse) {
    const filteredMatches = apiResponse.result_summary.map(match => {
        // Essential Match Information (Must Have)
        const essentialInfo = {
            match_date: match.match_date,
            home_club_name: match.home_club_name,
            away_club_name: match.away_club_name,
            home_team_name: match.home_team_name,
            away_team_name: match.away_team_name,
            ground_name: match.ground_name,
            result_description: match.result_description,
            competition_name: match.competition_name,
            competition_type: match.competition_type
        };

        // Match Format & Context
        const matchFormat = {
            match_type: match.match_type,
            game_type: match.game_type,
            no_of_overs: match.no_of_overs,
            season: "2025" // From your API URL parameter
        };

        // Key Result Data from innings array
        const inningsData = match.innings.map(innings => ({
            team_batting_id: innings.team_batting_id,
            innings_number: innings.innings_number,
            runs: innings.runs,
            wickets: innings.wickets,
            overs: innings.overs,
            total_extras: innings.total_extras
        }));

        // Match Status
        const matchStatus = {
            status: match.status,
            last_updated: match.last_updated,
            toss: match.toss
        };

        // Combine all filtered data
        return {
            // Unique match identifier (helpful for tracking)
            match_id: match.id,
            
            // Essential Match Information
            ...essentialInfo,
            
            // Match Format & Context
            ...matchFormat,
            
            // Match Status
            ...matchStatus,
            
            // Key Result Data
            innings: inningsData
        };
    });

    return {
        total_matches: filteredMatches.length,
        matches: filteredMatches
    };
}

// Example usage with your API endpoint
async function getCricketData() {
    try {
        const response = await fetch(
            'http://play-cricket.com/api/v2/result_summary.json?site_id=1786&season=2025&api_token=8786d7c44061b7d624367d32177420e0'
        );
        const data = await response.json();
        
        // Filter the data to include only essential information
        const filteredData = filterCricketData(data);
        
        console.log('Filtered Cricket Data:', filteredData);
        return filteredData;
        
    } catch (error) {
        console.error('Error fetching cricket data:', error);
        return null;
    }
}

// Alternative: If you already have the API response data
// const filteredData = filterCricketData(yourApiResponseData);

// Example of what the filtered output structure looks like:
const exampleFilteredMatch = {
    match_id: 7157908,
    match_date: "28/05/2024",
    home_club_name: "Bancroft Lions CC",
    away_club_name: "Chelmsford CC",
    home_team_name: "Girls Under 13",
    away_team_name: "Girls Under 13",
    ground_name: "",
    result_description: "Bancroft Lions CC - Girls Under 13 - Won",
    competition_name: "Girls U13 ODS: Group A",
    competition_type: "League",
    match_type: "Limited Overs",
    game_type: "Junior",
    no_of_overs: "6",
    season: "2025",
    status: "New",
    last_updated: "07/08/2025",
    toss: "",
    innings: [] // Array of innings data with runs, wickets, overs, total_extras
};

// Call the function to get filtered data
// getCricketData();
