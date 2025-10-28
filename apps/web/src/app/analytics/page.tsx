"use client";
import { useEffect, useState } from "react";
import { api, ensureSignedIn } from "../../lib/api";

export default function AnalyticsPage() {
  return (
    <main style={{ padding: 24 }}>
      <h2>Analytics</h2>
      <Leaderboard />
    </main>
  );
}

function Leaderboard() {
  const [data, setData] = useState<{ configured: boolean; items: any[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      try {
        await ensureSignedIn();
        const res = await api.get('/analytics/leaderboard');
        setData(res.data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load leaderboard');
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (!data?.configured) return <p className="legacy-muted">Google Analytics is not configured. Provide GA4_PROPERTY_ID and service account credentials to enable the leaderboard.</p>;
  if (!data.items?.length) return <p>No data yet.</p>;
  return (
    <div style={{ marginTop: 16 }}>
      <table className="legacy-table">
        <thead>
          <tr>
            <th className="legacy-th" style={{ width: '60px' }}>Rank</th>
            <th className="legacy-th">Tapestry</th>
            <th className="legacy-th" style={{ width: '120px' }}>Views</th>
            <th className="legacy-th" style={{ width: '120px' }}>Users</th>
            <th className="legacy-th" style={{ width: '140px' }}>Avg Time</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((it: any, idx: number) => (
            <tr key={it.id}>
              <td className="legacy-td">{idx + 1}</td>
              <td className="legacy-td">{it.title || it.prettyId || `#${it.id}`}</td>
              <td className="legacy-td">{it.views}</td>
              <td className="legacy-td">{it.users}</td>
              <td className="legacy-td">{formatDuration(it.avgTimeSec)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDuration(totalSec: number) {
  const s = Number(totalSec || 0);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}



