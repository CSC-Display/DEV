const PLAY_CRICKET_BASE_URL = "https://play-cricket.com/api/v2";

exports.handler = async function(event) {
    try {
        const apiToken = process.env.PLAYCRICKET_API_TOKEN;

        if (!apiToken) {
            return {
                statusCode: 500,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error: "PLAYCRICKET_API_TOKEN environment variable is not set."
                })
            };
        }

        const endpoint = event.queryStringParameters?.endpoint;

        if (!endpoint) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error: "Missing endpoint query parameter."
                })
            };
        }

        /*
            Prevent this function being used as a general open proxy.
            Only allow the specific Play-Cricket JSON endpoints needed by the site.
        */
        if (
            endpoint.includes("://") ||
            endpoint.startsWith("/") ||
            endpoint.includes("..")
        ) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error: "Invalid endpoint."
                })
            };
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
            return {
                statusCode: 403,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error: "Endpoint is not allowed."
                })
            };
        }

        const separator = endpoint.includes("?") ? "&" : "?";
        const playCricketUrl =
            `${PLAY_CRICKET_BASE_URL}/${endpoint}${separator}api_token=${encodeURIComponent(apiToken)}`;

        const playCricketResponse = await fetch(playCricketUrl);
        const responseText = await playCricketResponse.text();

        return {
            statusCode: playCricketResponse.status,
            headers: {
                "Content-Type": playCricketResponse.headers.get("content-type") || "application/json",
                "Cache-Control": "public, max-age=300, s-maxage=300"
            },
            body: responseText
        };

    } catch (error) {
        console.error("Play-Cricket proxy error:", error);

        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error: "Failed to fetch data from Play-Cricket."
            })
        };
    }
};