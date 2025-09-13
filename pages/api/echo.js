// pages/api/echo.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { castId } = req.body;

    if (!castId) {
      return res.status(400).json({ error: "Missing castId" });
    }

    // Call Neynar API to recast
    const resp = await fetch("https://api.neynar.com/v2/farcaster/cast/recast", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api_key": process.env.NEYNAR_API_KEY, // Store in .env.local
      },
      body: JSON.stringify({
        recaster_fid: process.env.FARCASTER_FID, // your Farcaster account ID
        target_cast_hash: castId,
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.message || "Echo failed");
    }

    res.status(200).json({ ok: true, result: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
