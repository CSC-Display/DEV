const PLAY_CRICKET_BASE_URL = "https://play-cricket.com/api/v2";

function sendJson(res, statusCode, data) {
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
    try {
        const apiToken = process.env.PLAYCRICKET_API_TOKEN;

        if (!apiToken) {
            return sendJson(res, 500, {
                error: "PLAYCRICKET_API_TOKEN environment variable is not set."
            });
        }

        const endpoint = req.query.endpoint;

        if (!endpoint || typeof endpoint !== "string") {
            return sendJson(res, 400, {
                error: "Missing endpoint query parameter."
            });
        }

        /*
            Basic safety checks.

            This prevents the function being used as a general open proxy.
            Only allow relative Play-Cricket JSON endpoints used by this site.
        */

        if (
            endpoint.includes("://") ||
            endpoint.startsWith("/") ||
            endpoint.includes("..")
        ) {
            return sendJson(res, 400, {
                error: "Invalid endpoint."
            });
        }

        const allowedEndpointPrefixes = [
            "matches.json",
            "league_table.json",
            "match_detail.json"
        ];

        const isAllowed = allowedEndpointPrefixes.some(prefix =>
            endpoint.startsWith(prefix)
        );

        if (!isAllowed) {
            return sendJson(res, 403, {
                error: "Endpoint is not allowed."
            });
        }

        const separator = endpoint.includes("?") ? "&" : "?";
        const playCricketUrl = `${PLAY_CRICKET_BASE_URL}/${endpoint}${separator}api_token=${encodeURIComponent(apiToken)}`;

        const playCricketResponse = await fetch(playCricketUrl);

        const responseText = await playCricketResponse.text();

        res.statusCode = playCricketResponse.status;
        res.setHeader("Content-Type", playCricketResponse.headers.get("content-type") || "application/json; charset=utf-8");

        /*
            Optional short cache.
            This reduces repeated calls while still keeping the tables fairly current.
        */
        res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=300");

        res.end(responseText);

    } catch (error) {
        console.error("Play-Cricket proxy error:", error);

        return sendJson(res, 500, {
            error: "Failed to fetch data from Play-Cricket."
        });
    }
};