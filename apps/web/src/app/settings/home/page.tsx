"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureSignedIn, api } from "../../../lib/api";

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
    <main style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ 
        marginBottom: 32,
        paddingBottom: 24,
        borderBottom: "2px solid var(--border)"
      }}>
        <h2 style={{ 
          marginBottom: 8, 
          fontSize: 28, 
          fontWeight: 700,
          background: "linear-gradient(135deg, #FF5C5C 0%, #FF2D79 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text"
        }}>
          🏠 Home Page Settings
        </h2>
        <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: 15 }}>
          Manage hero imagery, introductory content, and site-wide messaging that appear on the public home page.
        </p>
      </div>

      {error && (
        <div style={{
          padding: "16px 20px",
          marginBottom: 24,
          borderRadius: 8,
          background: "#FEE",
          border: "1px solid #FCC",
          color: "#C00",
          fontSize: 14
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {success && (
        <div style={{
          padding: "16px 20px",
          marginBottom: 24,
          borderRadius: 8,
          background: "#E8F5E9",
          border: "1px solid #A5D6A7",
          color: "#2E7D32",
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <span>✓</span> <strong>{success}</strong>
        </div>
      )}

      {loading && (
        <div style={{ 
          textAlign: "center", 
          padding: 60,
          color: "var(--text-secondary)",
          fontSize: 15
        }}>
          Loading settings…
        </div>
      )}

      {!loading && (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <Section 
            icon="🎨" 
            title="Hero Section" 
            description="Primary visual elements and messaging displayed on the landing page"
            disabled={saving}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <LabelInput 
                label="Cover Image URL" 
                value={form.coverImage} 
                onChange={(v) => updateField("coverImage", v)}
                placeholder="https://..."
              />
              <LabelInput 
                label="Secondary Cover Image URL" 
                value={form.coverImage2} 
                onChange={(v) => updateField("coverImage2", v)}
                placeholder="https://..."
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <LabelInput 
                label="Cover Image Alt Text" 
                value={form.coverImageAlt} 
                onChange={(v) => updateField("coverImageAlt", v)}
                placeholder="Descriptive alt text"
              />
              <LabelInput 
                label="Footer Image URL" 
                value={form.footerImage} 
                onChange={(v) => updateField("footerImage", v)}
                placeholder="https://..."
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <LabelInput 
                label="Cover Tagline" 
                value={form.coverTagline} 
                onChange={(v) => updateField("coverTagline", v)}
                placeholder="Main headline"
              />
              <LabelInput 
                label="Cover Tagline Subtext" 
                value={form.coverTaglineSubtext} 
                onChange={(v) => updateField("coverTaglineSubtext", v)}
                placeholder="Supporting text"
              />
            </div>
            <LabelInput 
              label="Hero Video URL" 
              value={form.videoLink} 
              onChange={(v) => updateField("videoLink", v)}
              placeholder="https://..."
            />
          </Section>

          <Section 
            icon="📖" 
            title="About Section" 
            description="Informational content describing the project and community"
            disabled={saving}
          >
            <div style={{ marginBottom: 20 }}>
              <LabelInput 
                label="Section Title" 
                value={form.aboutTitle} 
                onChange={(v) => updateField("aboutTitle", v)}
                placeholder="About This Project"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <LabelTextarea 
                label="Primary About Text" 
                value={form.aboutText} 
                onChange={(v) => updateField("aboutText", v)} 
                rows={6}
                placeholder="Main descriptive content"
              />
              <LabelTextarea 
                label="Secondary About Text" 
                value={form.aboutText2} 
                onChange={(v) => updateField("aboutText2", v)} 
                rows={6}
                placeholder="Additional context or details"
              />
            </div>
            <div style={{ marginTop: 20 }}>
              <LabelTextarea 
                label="Community Made Description" 
                value={form.communityMadeDescription} 
                onChange={(v) => updateField("communityMadeDescription", v)} 
                rows={4}
                placeholder="Describe community contributions"
              />
            </div>
          </Section>

          <Section 
            icon="🔍" 
            title="SEO & Metadata" 
            description="Search engine optimization and social sharing metadata"
            disabled={saving}
          >
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
              <LabelTextarea 
                label="Meta Description" 
                value={form.metaDescription} 
                onChange={(v) => updateField("metaDescription", v)} 
                rows={4}
                placeholder="Brief summary for search results (150-160 characters)"
              />
              <LabelInput 
                label="Social Share Image URL" 
                value={form.metaImage} 
                onChange={(v) => updateField("metaImage", v)}
                placeholder="https://... (1200x630px)"
              />
            </div>
          </Section>

          <Section 
            icon="⚖️" 
            title="Legal & Accessibility" 
            description="Policies, statements, and compliance information"
            disabled={saving}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
              <LabelTextarea 
                label="Accessibility Statement" 
                value={form.accessibilityStatement} 
                onChange={(v) => updateField("accessibilityStatement", v)} 
                rows={5}
                placeholder="Describe accessibility features and compliance"
              />
              <LabelTextarea 
                label="Privacy Policy" 
                value={form.privacyPolicy} 
                onChange={(v) => updateField("privacyPolicy", v)} 
                rows={7}
                placeholder="Data collection and usage policies"
              />
              <LabelTextarea 
                label="Content Use & Embed Policy" 
                value={form.contentUseEmbedPolicy} 
                onChange={(v) => updateField("contentUseEmbedPolicy", v)} 
                rows={6}
                placeholder="Terms for embedding and reusing content"
              />
            </div>
          </Section>

          <div style={{ 
            position: "sticky",
            bottom: 0,
            padding: "20px 0",
            marginTop: 8,
            background: "var(--bg-secondary)",
            borderTop: "2px solid var(--border)",
            display: "flex", 
            justifyContent: "flex-end", 
            gap: 12,
            zIndex: 10
          }}>
            {hasChanges && (
              <span style={{ 
                display: "flex", 
                alignItems: "center", 
                marginRight: "auto",
                color: "var(--text-secondary)",
                fontSize: 14,
                fontStyle: "italic"
              }}>
                ● Unsaved changes
              </span>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !hasChanges}
              style={{ 
                minWidth: 160,
                fontSize: 15,
                fontWeight: 600,
                padding: "12px 24px"
              }}
            >
              {saving ? "💾 Saving…" : "💾 Save All Changes"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

function Section({ 
  icon, 
  title, 
  description, 
  children, 
  disabled 
}: { 
  icon: string; 
  title: string; 
  description: string; 
  children: React.ReactNode; 
  disabled: boolean;
}) {
  return (
    <fieldset 
      style={{ 
        border: "1px solid var(--border)", 
        borderRadius: 12, 
        padding: 28,
        background: "white",
        boxShadow: "var(--shadow-sm)",
        transition: "all 0.2s ease"
      }} 
      disabled={disabled}
    >
      <legend style={{ 
        padding: "0 12px", 
        fontWeight: 700, 
        fontSize: 18,
        display: "flex",
        alignItems: "center",
        gap: 8
      }}>
        <span>{icon}</span> {title}
      </legend>
      <p style={{ 
        margin: "0 0 24px", 
        color: "var(--text-secondary)", 
        fontSize: 14,
        lineHeight: 1.5
      }}>
        {description}
      </p>
      {children}
    </fieldset>
  );
}

function LabelInput({ 
  label, 
  value, 
  onChange, 
  placeholder 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ 
        fontWeight: 600, 
        fontSize: 13,
        color: "var(--text-primary)",
        textTransform: "uppercase",
        letterSpacing: "0.05em"
      }}>
        {label}
      </span>
      <input 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          padding: "10px 12px",
          fontSize: 14,
          borderRadius: 6,
          border: "1px solid var(--border)",
          transition: "all 0.2s ease"
        }}
      />
    </label>
  );
}

function LabelTextarea({ 
  label, 
  value, 
  onChange, 
  rows = 3,
  placeholder
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ 
        fontWeight: 600, 
        fontSize: 13,
        color: "var(--text-primary)",
        textTransform: "uppercase",
        letterSpacing: "0.05em"
      }}>
        {label}
      </span>
      <textarea 
        rows={rows} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder}
        style={{ 
          resize: "vertical",
          padding: "10px 12px",
          fontSize: 14,
          borderRadius: 6,
          border: "1px solid var(--border)",
          lineHeight: 1.5,
          fontFamily: "inherit",
          transition: "all 0.2s ease"
        }} 
      />
    </label>
  );
}


