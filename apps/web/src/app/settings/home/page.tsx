"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureSignedIn, api } from "../../../../lib/api";

type HomeSettings = {
  coverImage: string;
  coverImage2: string;
  coverImageAlt: string;
  coverTagline: string;
  coverTaglineSubtext: string;
  aboutTitle: string;
  aboutText: string;
  aboutText2: string;
  metaDescription: string;
  metaImage: string;
  videoLink: string;
  footerImage: string;
  communityMadeDescription: string;
  accessibilityStatement: string;
  privacyPolicy: string;
  contentUseEmbedPolicy: string;
};

const emptySettings: HomeSettings = {
  coverImage: "",
  coverImage2: "",
  coverImageAlt: "",
  coverTagline: "",
  coverTaglineSubtext: "",
  aboutTitle: "",
  aboutText: "",
  aboutText2: "",
  metaDescription: "",
  metaImage: "",
  videoLink: "",
  footerImage: "",
  communityMadeDescription: "",
  accessibilityStatement: "",
  privacyPolicy: "",
  contentUseEmbedPolicy: "",
};

function normalizeSettings(payload: Partial<Record<keyof HomeSettings, string | null>> | null | undefined): HomeSettings {
  const merged: Partial<HomeSettings> = {};
  for (const key of Object.keys(emptySettings) as (keyof HomeSettings)[]) {
    const value = payload?.[key];
    merged[key] = (typeof value === "string" ? value : value ?? "") || "";
  }
  return merged as HomeSettings;
}

export default function SettingsHomePage() {
  const [form, setForm] = useState<HomeSettings>(emptySettings);
  const [initial, setInitial] = useState<HomeSettings>(emptySettings);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await ensureSignedIn();
        const res = await api.get(`/settings/home`);
        const normalized = normalizeSettings(res.data);
        setForm(normalized);
        setInitial(normalized);
      } catch (e: any) {
        const status = e?.response?.status;
        const message = e?.response?.data || e?.message || "Unable to load home page settings.";
        setError(`Failed to load settings (${status ?? ""}) ${typeof message === "string" ? message : ""}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);

  const updateField = (key: keyof HomeSettings, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await ensureSignedIn();
      const payload: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(form)) {
        if (typeof value === "string") {
          const trimmed = value.trim();
          payload[key] = trimmed === "" ? null : value;
        } else {
          payload[key] = value as any;
        }
      }
      const res = await api.put(`/settings/home`, payload);
      const normalized = normalizeSettings(res.data);
      setForm(normalized);
      setInitial(normalized);
      setSuccess("Home page settings saved.");
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data || e?.message || "Unable to save home page settings.";
      setError(`Failed to save settings (${status ?? ""}) ${typeof message === "string" ? message : ""}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h2 style={{ marginBottom: 8 }}>Home Page Settings</h2>
        <p style={{ maxWidth: 720, color: "var(--text-secondary)", margin: 0 }}>
          Manage hero imagery, introductory content, and site-wide messaging that appear on the public home page.
        </p>
      </div>

      {error && (
        <div className="error" style={{ maxWidth: 720 }}>
          {error}
        </div>
      )}
      {success && (
        <div className="success" style={{ maxWidth: 720 }}>
          {success}
        </div>
      )}

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 24, opacity: loading ? 0.6 : 1 }}>
        <fieldset style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 20, background: "white" }} disabled={loading || saving}>
          <legend style={{ padding: "0 8px", fontWeight: 600 }}>Hero</legend>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
            <LabelInput label="Cover Image" value={form.coverImage} onChange={(v) => updateField("coverImage", v)} />
            <LabelInput label="Secondary Cover Image" value={form.coverImage2} onChange={(v) => updateField("coverImage2", v)} />
            <LabelInput label="Cover Image Alt" value={form.coverImageAlt} onChange={(v) => updateField("coverImageAlt", v)} />
            <LabelInput label="Footer Image" value={form.footerImage} onChange={(v) => updateField("footerImage", v)} />
            <LabelInput label="Video Link" value={form.videoLink} onChange={(v) => updateField("videoLink", v)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16, marginTop: 16 }}>
            <LabelInput label="Cover Tagline" value={form.coverTagline} onChange={(v) => updateField("coverTagline", v)} />
            <LabelInput label="Cover Tagline Subtext" value={form.coverTaglineSubtext} onChange={(v) => updateField("coverTaglineSubtext", v)} />
          </div>
        </fieldset>

        <fieldset style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 20, background: "white" }} disabled={loading || saving}>
          <legend style={{ padding: "0 8px", fontWeight: 600 }}>About Section</legend>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
            <LabelInput label="About Title" value={form.aboutTitle} onChange={(v) => updateField("aboutTitle", v)} />
            <LabelTextarea label="About Text" value={form.aboutText} onChange={(v) => updateField("aboutText", v)} rows={4} />
            <LabelTextarea label="Secondary About Text" value={form.aboutText2} onChange={(v) => updateField("aboutText2", v)} rows={4} />
            <LabelTextarea label="Community Made Description" value={form.communityMadeDescription} onChange={(v) => updateField("communityMadeDescription", v)} rows={3} />
          </div>
        </fieldset>

        <fieldset style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 20, background: "white" }} disabled={loading || saving}>
          <legend style={{ padding: "0 8px", fontWeight: 600 }}>Meta &amp; SEO</legend>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
            <LabelTextarea label="Meta Description" value={form.metaDescription} onChange={(v) => updateField("metaDescription", v)} rows={3} />
            <LabelInput label="Meta Image" value={form.metaImage} onChange={(v) => updateField("metaImage", v)} />
          </div>
        </fieldset>

        <fieldset style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 20, background: "white" }} disabled={loading || saving}>
          <legend style={{ padding: "0 8px", fontWeight: 600 }}>Policies &amp; Accessibility</legend>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
            <LabelTextarea label="Accessibility Statement" value={form.accessibilityStatement} onChange={(v) => updateField("accessibilityStatement", v)} rows={4} />
            <LabelTextarea label="Privacy Policy" value={form.privacyPolicy} onChange={(v) => updateField("privacyPolicy", v)} rows={6} />
            <LabelTextarea label="Content Use & Embed Policy" value={form.contentUseEmbedPolicy} onChange={(v) => updateField("contentUseEmbedPolicy", v)} rows={5} />
          </div>
        </fieldset>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || saving || !hasChanges}
            style={{ minWidth: 140 }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}

function LabelInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function LabelTextarea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} style={{ resize: "vertical" }} />
    </label>
  );
}


