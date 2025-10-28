import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const tenantId = process.env.AZURE_TENANT_ID!;
const audienceUri = process.env.API_AUDIENCE;
const audienceClientId = process.env.API_CLIENT_ID; // Optional: API app's Application (client) ID (GUID)
const explicitJwks = process.env.MICROSOFT_JWKS_URI;
const jwksCandidates: string[] = [
  explicitJwks,
  `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
  `https://login.microsoftonline.com/common/discovery/v2.0/keys`,
  `https://login.microsoftonline.com/${tenantId}/discovery/keys`,
  `https://login.microsoftonline.com/common/discovery/keys`
].filter(Boolean) as string[];

async function verifyWithAnyJwks(token: string): Promise<JWTPayload> {
  let lastError: unknown;
  for (const uri of jwksCandidates) {
    try {
      const jwks = createRemoteJWKSet(new URL(uri));
      const { payload } = await jwtVerify(token, jwks);
      return payload;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError as Error;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload & { roles?: string[] };
}

export function authGuard(requiredRoles: string[] = []) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers["authorization"] as string | undefined;
      if (!authHeader?.startsWith("Bearer ")) return res.sendStatus(401);
      const token = authHeader.slice(7);
      const payload = await verifyWithAnyJwks(token);
      const aud = (payload.aud || payload["audience"]) as string | string[] | undefined;
      const allowed = [audienceUri, audienceClientId].filter(Boolean) as string[];
      const audOk = Array.isArray(aud)
        ? aud.some((a) => allowed.includes(a))
        : typeof aud === "string"
          ? allowed.includes(aud)
          : false;
      if (allowed.length && !audOk) return res.sendStatus(401);
      // Effective roles: require explicit app roles. No role => no access to role-gated endpoints
      const tokenRoles = (payload["roles"] as string[] | undefined) || [];
      const effectiveRoles: string[] = tokenRoles;
      req.user = { ...(payload as object), roles: effectiveRoles } as AuthenticatedRequest["user"];
      if (requiredRoles.length && !requiredRoles.some(r => effectiveRoles.includes(r))) {
        return res.sendStatus(403);
      }
      next();
    } catch (err) {
      console.error("authGuard error", err);
      res.sendStatus(401);
    }
  };
}
