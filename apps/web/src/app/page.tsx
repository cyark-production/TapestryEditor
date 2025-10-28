"use client";
import { useState } from "react";
import { ensureSignedIn, api } from "../lib/api";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function signInAndGo() {
    setLoading(true);
    setError(null);
    try {
      await ensureSignedIn();
      try {
        const me = await api.get('/auth/me');
        const roles: string[] = (me.data?.roles || []) as string[];
        if (!roles || roles.length === 0) {
          setError("Your account is signed in but has no role assigned for the Tapestry Editor. Please contact an administrator to be added as Viewer, Editor, or Admin.");
          return;
        }
      } catch {}
      router.push("/tapestries");
    } catch (e: any) {
      const code = e?.errorCode || e?.code;
      if (code === "interaction_in_progress") {
        setError("A sign-in is already in progress. Please complete the open sign-in window or refresh this page and try again.");
      } else if (code === "access_denied") {
        setError("Access denied. Your account does not have permission to use the Tapestry Editor. If you believe this is an error, contact an administrator.");
      } else {
        const message = e?.message || "Failed to sign in";
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ 
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--gradient-tapestry)',
      padding: 24
    }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        padding: 48,
        maxWidth: 480,
        width: '100%',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: 32, position: 'relative', height: 40 }}>
          <Image 
            src="/tapestry_logo_black.png" 
            alt="Tapestry Logo" 
            width={200}
            height={40}
            style={{ 
              height: 40,
              width: 'auto'
            }}
            priority
          />
        </div>
        <h1 style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: '0 0 12px 0'
        }}>Editor</h1>
        <p style={{
          fontSize: 16,
          color: 'var(--text-secondary)',
          margin: '0 0 32px 0'
        }}>Sign in to create and manage immersive story experiences.</p>
        <button 
          className="btn btn-primary"
          onClick={signInAndGo} 
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 24px',
            fontSize: 16,
            fontWeight: 600
          }}
        >
          {loading ? '🔄 Signing in…' : '🔐 Sign in with Azure AD'}
        </button>
        {error && (
          <div className="error" style={{ marginTop: 20, textAlign: 'left' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </main>
  );
}
