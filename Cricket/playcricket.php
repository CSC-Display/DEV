<?php
header('Content-Type: application/json');

$apiToken = getenv('PLAY_CRICKET_API_TOKEN');

if (!$apiToken) {
    http_response_code(500);
    echo json_encode(["error" => "API token not configured"]);
    exit;
}

$endpoint = $_GET['endpoint'] ?? '';

if (!$endpoint) {
    http_response_code(400);
    echo json_encode(["error" => "Missing endpoint"]);
    exit;
}

// Prevent this from becoming an open proxy
$allowedEndpoints = [
    "matches.json",
    "league_table.json",
    "result_summary.json",
    "match_detail.json"
];

$endpointName = explode("?", $endpoint)[0];

if (!in_array($endpointName, $allowedEndpoints, true)) {
    http_response_code(400);
    echo json_encode(["error" => "Endpoint not allowed"]);
    exit;
}

$separator = strpos($endpoint, "?") !== false ? "&" : "?";

$url = "https://play-cricket.com/api/v2/" . $endpoint . $separator . "api_token=" . urlencode($apiToken);

$response = file_get_contents($url);

if ($response === false) {
    http_response_code(502);
    echo json_encode(["error" => "Play-Cricket API request failed"]);
    exit;
}

echo $response;
