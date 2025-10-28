"use client";
import { ReactNode, useMemo } from "react";
import { PublicClientApplication, type Configuration } from "@azure/msal-browser";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || "e198ebc5-1079-4833-9342-3d2def5cb851";
const authority = process.env.NEXT_PUBLIC_AUTHORITY || `https://login.microsoftonline.com/${tenantId}`;

const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "",
    authority,
    redirectUri: "/"
  },
  cache: { cacheLocation: "localStorage" }
};

export const msalInstance = new PublicClientApplication(msalConfig);
// Default scopes for silent token if none provided later
export const defaultScopes = [process.env.NEXT_PUBLIC_API_SCOPE || "user.read"];

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = useMemo(() => new QueryClient(), []);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

