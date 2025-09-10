import fetch from "node-fetch";

export default async function handler(req, res) {
  const NEYNAR = process.env.NEYNAR_API_KEY;
  if (!NEYNAR) return res.status(500).json({ error: "NEYNAR_API_KEY missing" });

  try {
    const r = await fetch("https://api.neynar.com/v2/farcaster/trending_casts", {
      headers: { accept: "application/json", api_key: NEYNAR },
    });
    const data = await r.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
