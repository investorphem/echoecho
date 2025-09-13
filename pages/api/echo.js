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

    const resp = await fetch("https://api.neynar.com/v2/farcaster/cast/recast", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api_key": process.env.NEYNAR_API_KEY,
      },
      body: JSON.stringify({
        recaster_fid: parseInt(process.env.FARCASTER_FID, 10), // your Farcaster ID
        target_cast_hash: castId,
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.message || "Echo failed");
    }

    res.status(200).json({ ok: true, result: data });
  } catch (err) {
    console.error("Echo error:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
}
