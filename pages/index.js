import { useEffect, useState } from "react";

export default function Home() {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trending")
      .then((r) => r.json())
      .then((data) => setTrends(data.casts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 720, margin: "20px auto", padding: 12 }}>
      <h1>🔥 EchoEcho</h1>
      <p>Breaking echo chambers — see trending casts + echo them!</p>
      {trends.slice(0, 10).map((c, i) => (
        <div
          key={i}
          style={{
            border: "1px solid #ddd",
            padding: 12,
            marginTop: 12,
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 8 }}>
            {c.text || c.body || "No text"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={async () => {
                const resp = await fetch("/api/echo", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ castId: c.hash || c.id }),
                });
                const j = await resp.json();
                alert(j.ok ? "✅ Echoed!" : "❌ Error: " + (j.error || ""));
              }}
            >
              Echo It
            </button>
            <button
              onClick={() =>
                navigator.share?.({ text: c.text || "Check this out!" })
              }
            >
              Share
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
