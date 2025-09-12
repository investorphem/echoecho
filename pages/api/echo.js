import fetch from "node-fetch";

export default async function handler(req, res) {
  const NEYNAR = process.env.NEYNAR_API_KEY;
  if (!NEYNAR) return res.status(500).json({ error: "NEYNAR_API_KEY missing" });
  if (req.method !== "POST") return res.status(405).end();

  const { castId } = req.body;
  try {
    const r = await fetch("https://api.neynar.com/v2/farcaster/reaction", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        api_key: NEYNAR,
      },
      body: JSON.stringify({
        cast_id: castId,
        reaction_type: "recast",
      }),
    });
    const j = await r.json();
    res.status(200).json(j);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}