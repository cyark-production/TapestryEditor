/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: { esmExternals: true },
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_API_SCOPE: 'api://4ab7cd1e-f5f3-4bf0-af8b-5f8f07fcedec/tapestry-editor/access_as_user',
    NEXT_PUBLIC_TENANT_ID: 'e198ebc5-1079-4833-9342-3d2def5cb851',
    NEXT_PUBLIC_AUTHORITY: 'https://login.microsoftonline.com/e198ebc5-1079-4833-9342-3d2def5cb851',
    NEXT_PUBLIC_AZURE_CLIENT_ID: 'ed5cd98b-de61-4358-a3ec-037652985e90'
  }
};

module.exports = nextConfig;

