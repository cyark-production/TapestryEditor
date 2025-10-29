"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/settings/home", label: "Home Page", icon: "🏠" },
  { href: "/settings/language", label: "Language", icon: "🌐" },
  { href: "/settings/call-to-action", label: "Call to Action", icon: "📣" },
  { href: "/settings/sky-settings", label: "Sky Settings", icon: "🌌" },
];

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <li style={{ marginBottom: 4 }}>
      <Link
        href={href}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 8,
          textDecoration: "none",
          background: active ? "linear-gradient(135deg, #FF5C5C 0%, #FF2D79 100%)" : "transparent",
          color: active ? "white" : "var(--text-secondary)",
          fontWeight: active ? 600 : 500,
          fontSize: 14,
          transition: "all 0.2s ease",
          border: active ? "none" : "1px solid transparent",
          boxShadow: active ? "var(--shadow-sm)" : "none",
        }}
      >
        <span>{icon}</span>
        {label}
      </Link>
    </li>
  );
}

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 0, minHeight: "calc(100vh - 69px)" }}>
      <aside
        style={{
          background: "white",
          borderRight: "1px solid var(--border)",
          padding: "24px 16px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
            margin: "0 0 16px",
            paddingLeft: 4,
          }}
        >
          Global Settings
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} active={pathname === item.href} />
          ))}
        </ul>
      </aside>
      <section style={{ padding: 32, background: "var(--bg-secondary)" }}>{children}</section>
    </div>
  );
}


