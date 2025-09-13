// pages/api/trending.js
export default async function handler(req, res) {
  try {
    const resp = await fetch("https://api.neynar.com/v2/farcaster/feed/trending", {
      headers: {
        "accept": "application/json",
        "api_key": process.env.NEYNAR_API_KEY, // load from .env.local
      },
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Trending API failed: ${resp.status} - ${text}`);
    }

    const data = await resp.json();

    // Normalize response for frontend
    res.status(200).json({
      casts: data.casts || [],
    });
  } catch (err) {
    console.error("Trending error:", err.message);
    res.status(500).json({ error: "Failed to fetch trending" });
  }
}
