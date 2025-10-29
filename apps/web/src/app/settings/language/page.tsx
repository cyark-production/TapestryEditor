"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureSignedIn, api } from "../../../lib/api";

type LanguageRow = {
  code: string;
  englishName: string;
  nativeName: string | null;
  gmapsCode: string | null;
  rightToLeft: boolean;
};

export default function SettingsLanguagePage() {
  const [rows, setRows] = useState<LanguageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await ensureSignedIn();
        const res = await api.get(`/languages`);
        setRows(res.data || []);
      } catch (e: any) {
        const status = e?.response?.status;
        const message = e?.response?.data || e?.message || "Unable to load languages.";
        setError(`Failed to load languages (${status ?? ""}) ${typeof message === "string" ? message : ""}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const q = filter.trim().toLowerCase();
    return rows.filter((row) =>
      [row.code, row.englishName, row.nativeName, row.gmapsCode]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q))
    );
  }, [rows, filter]);

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>🌐 Language Catalog</h2>
          <p style={{ maxWidth: 760, color: "var(--text-secondary)", margin: "8px 0 0" }}>
            Reference the available locales surfaced throughout the editor. These values map to the `language` table and
            power language dropdowns across the application.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Search by code, English name, or native name"
            style={{
              flex: "0 0 340px",
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              fontSize: 14
            }}
          />
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Showing {filtered.length} of {rows.length} languages
          </span>
        </div>
      </header>

      {error && (
        <div
          style={{
            border: "1px solid #FCC",
            background: "#FFF5F5",
            color: "#C53030",
            padding: "14px 18px",
            borderRadius: 10,
            fontSize: 14
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "white",
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden"
        }}
      >
        <header
          style={{
            display: "grid",
            gridTemplateColumns: "120px 1fr 1fr 140px 120px",
            gap: 12,
            padding: "16px 20px",
            background: "var(--bg-secondary)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}
        >
          <span>Code</span>
          <span>English Name</span>
          <span>Native Name</span>
          <span>Maps Code</span>
          <span style={{ textAlign: "center" }}>Right-to-Left</span>
        </header>

        <div>
          {loading ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-secondary)" }}>Loading languages…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-secondary)" }}>No languages found.</div>
          ) : (
            filtered.map((row) => (
              <article
                key={row.code}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 1fr 140px 120px",
                  gap: 12,
                  padding: "14px 20px",
                  borderTop: "1px solid var(--border)",
                  alignItems: "center",
                  fontSize: 14
                }}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{row.code}</span>
                <span style={{ fontWeight: 600 }}>{row.englishName}</span>
                <span style={{ color: row.nativeName ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {row.nativeName || "—"}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: row.gmapsCode ? "inherit" : "var(--text-muted)" }}>
                  {row.gmapsCode || "—"}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: row.rightToLeft ? "#C05621" : "var(--text-muted)",
                    fontWeight: row.rightToLeft ? 600 : 500
                  }}
                >
                  {row.rightToLeft ? "Yes" : "No"}
                </span>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
