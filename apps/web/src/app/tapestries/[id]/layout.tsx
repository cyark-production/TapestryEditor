"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { setSelectedTapestryId } from "../../../lib/api";
import { useEffect } from "react";

export default function TapestryEditorLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const id = params?.id as string | undefined;

  useEffect(() => {
    const num = id ? Number(id) : NaN;
    if (Number.isFinite(num)) setSelectedTapestryId(num);
  }, [id]);

  function Item({ href, label, icon }: { href: string; label: string; icon?: string }) {
    const active = pathname?.endsWith(href);
    return (
      <li style={{ marginBottom: 4 }}>
        <Link href={`/tapestries/${id}/${href}`} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px', 
          borderRadius: 8,
          textDecoration: 'none',
          background: active ? 'linear-gradient(135deg, #FF5C5C 0%, #FF2D79 100%)' : 'transparent', 
          color: active ? 'white' : 'var(--text-secondary)',
          fontWeight: active ? 600 : 500,
          fontSize: 14,
          transition: 'all 0.2s ease',
          border: active ? 'none' : '1px solid transparent',
          boxShadow: active ? 'var(--shadow-sm)' : 'none'
        }}>{icon && <span>{icon}</span>}{label}</Link>
      </li>
    );
  }

  function SectionHeader({ children }: { children: string }) {
    return (
      <div style={{ 
        fontWeight: 700, 
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--text-muted)',
        margin: '24px 0 12px',
        paddingLeft: 4
      }}>{children}</div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 0, minHeight: 'calc(100vh - 69px)' }}>
      <aside style={{ 
        background: 'white',
        borderRight: '1px solid var(--border)', 
        padding: '24px 16px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <SectionHeader>General</SectionHeader>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <Item href="general" label="General Info" icon="📝" />
          <Item href="splash" label="Splash Page" icon="🌊" />
          <Item href="overview" label="Overview" icon="🗺️" />
          <Item href="cta" label="Call to Action" icon="📢" />
          <Item href="publishing" label="Publishing" icon="🚀" />
        </ul>
        <SectionHeader>Content</SectionHeader>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <Item href="scenes" label="Scenes" icon="🎬" />
          <Item href="sets" label="Sets" icon="🧩" />
          <Item href="markers" label="Markers" icon="📍" />
          <Item href="voices" label="Voices" icon="🎤" />
          <Item href="voice-clips" label="Voice Clips" icon="🗣️" />
        </ul>
        <SectionHeader>Assets</SectionHeader>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <Item href="resources" label="Resources" icon="📚" />
          <Item href="media-items" label="Media Items" icon="🖼️" />
        </ul>
        <SectionHeader>Interactive</SectionHeader>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <Item href="interactives" label="Interactives" icon="🎮" />
          <Item href="scene-highlights" label="Scene Highlights" icon="✨" />
        </ul>
        <SectionHeader>System</SectionHeader>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <Item href="audit" label="Audit" icon="📋" />
        </ul>
      </aside>
      <section style={{ padding: 32, background: 'var(--bg-secondary)' }}>
        {children}
      </section>
    </div>
  );
}


