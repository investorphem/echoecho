// pages/api/trending.js

export default async function handler(req, res) {
  try {
    // Example: fetch trending casts from Neynar
    const resp = await fetch("https://api.neynar.com/v2/farcaster/feed/trending", {
      headers: {
        "api_key": process.env.NEYNAR_API_KEY, // Store your key in .env.local
      },
    });

    if (!resp.ok) {
      throw new Error(`Failed to fetch trending: ${resp.status}`);
    }

    const data = await resp.json();

    // Normalize structure for frontend
    res.status(200).json({
      casts: data.casts || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch trending" });
  }
}
