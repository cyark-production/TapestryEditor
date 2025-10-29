import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();
if (!process.env.DATABASE_URL) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const devEnvPath = path.join(__dirname, '..', 'dev.env');
  dotenv.config({ path: devEnvPath });
}
import express from "express";
import { BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters } from "@azure/storage-blob";
import nodeUrl from "node:url";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import pino from "pino";
import prisma from "@tapestry/db";
import { createRequire } from "module";
const localRequire = createRequire(import.meta.url);
// Optional GA4 client
let analyticsDataClient: any = null;
try {
  // Ensure GOOGLE_APPLICATION_CREDENTIALS is absolute if provided as relative
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const pathMod = localRequire('path');
  // Resolve relative service account key path against this file directory
  const hereFileGa = fileURLToPath(import.meta.url);
  const hereDirGa = pathMod.dirname(hereFileGa);
  if (gac && !pathMod.isAbsolute(gac)) {
    const abs = pathMod.join(hereDirGa, '..', gac);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = abs;
  }
  // Lazy require to avoid breaking dev if not installed
  const { BetaAnalyticsDataClient } = localRequire("@google-analytics/data");
  analyticsDataClient = new BetaAnalyticsDataClient({});
} catch {
  // ignore if not present / not configured
}
// Temporary type loosening for newly added Prisma models during migration
const db: any = prisma as any;
import { authGuard, type AuthenticatedRequest } from "./auth.js";
import { z } from "zod";

const log = pino({ level: process.env.LOG_LEVEL || "info" });
const app = express();

// Harden process against unexpected crashes in dev
process.on('unhandledRejection', (reason: any) => {
  try { log.error({ err: reason }, 'unhandledRejection'); } catch {}
});
process.on('uncaughtException', (err: any) => {
  try { log.error({ err }, 'uncaughtException'); } catch {}
});

app.use(helmet());
app.use(express.json({ limit: "2mb" }));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const corsOptions: cors.CorsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["authorization", "content-type"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(morgan("dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));
// Avoid noisy 404/503 from browsers auto-requesting a favicon from the API host
app.get("/favicon.ico", (_req, res) => res.status(204).end());

// Azure Blob SAS for text editing (restricted to Admin/Editor)
const AZ_BLOB_ACCOUNT = process.env.AZURE_STORAGE_ACCOUNT || "tapestrystorage";
const AZ_BLOB_KEY = process.env.AZURE_STORAGE_KEY || ""; // required for SAS generation
let blobCred: StorageSharedKeyCredential | null = null;
let blobService: BlobServiceClient | null = null;
try {
  if (AZ_BLOB_ACCOUNT && AZ_BLOB_KEY) {
    blobCred = new StorageSharedKeyCredential(AZ_BLOB_ACCOUNT, AZ_BLOB_KEY);
    blobService = new BlobServiceClient(`https://${AZ_BLOB_ACCOUNT}.blob.core.windows.net`, blobCred);
  }
} catch {}

function parseBlobUrl(raw: string) {
  const u = new URL(raw);
  if (!u.hostname.endsWith(".blob.core.windows.net")) throw new Error("Not an Azure Blob URL");
  const account = u.hostname.split(".")[0];
  const [container, ...rest] = u.pathname.replace(/^\//, "").split("/");
  const blob = rest.join("/");
  return { account, container, blob };
}

app.get("/blobs/sas", authGuard(["Admin", "Editor"]), async (req, res) => {
  try {
    if (!blobCred) return res.status(500).json({ error: "Blob credentials not configured" });
    const rawUrl = String(req.query.url || "");
    if (!rawUrl) return res.status(400).json({ error: "url required" });
    const { account, container, blob } = parseBlobUrl(rawUrl);
    // Decode once for signing; re-encode path segments for the URL output
    const blobName = decodeURIComponent(blob);
    if (account !== (AZ_BLOB_ACCOUNT || "")) return res.status(400).json({ error: "Account not allowed" });
    const expiresOn = new Date(Date.now() + 10 * 60 * 1000);
    const perms = BlobSASPermissions.parse("rcw");
    const sas = generateBlobSASQueryParameters(
      { containerName: container, blobName, permissions: perms, expiresOn },
      blobCred
    ).toString();
    const encodedPath = blobName.split('/').map(encodeURIComponent).join('/');
    const sasUrl = `https://${account}.blob.core.windows.net/${container}/${encodedPath}?${sas}`;
    res.json({ sasUrl, expiresAt: expiresOn.toISOString() });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Invalid URL" });
  }
});

// Analytics Leaderboard (Top 10 by page_view)
app.get("/analytics/leaderboard", authGuard(["Admin", "Editor", "Viewer"]), async (_req, res) => {
  try {
    const propertyId = process.env.GA4_PROPERTY_ID;
    if (!analyticsDataClient || !propertyId) {
      return res.status(200).json({ configured: false, items: [] });
    }
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      // Match GA UI "Last 28 days" which ends yesterday
      dateRanges: [{ startDate: "28daysAgo", endDate: "yesterday" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "activeUsers" },
        { name: "userEngagementDuration" }
      ],
      limit: 10000,
    });
    const rows = (response?.rows || []).map((r: any) => ({
      path: r.dimensionValues?.[0]?.value || "",
      views: Number(r.metricValues?.[0]?.value || 0),
      users: Number(r.metricValues?.[1]?.value || 0),
      engagementSec: Number(r.metricValues?.[2]?.value || 0)
    }));
    // Aggregate ONLY base paths like /content/:prettyId (exclude /content/:prettyId/...)
    const slugMap = new Map<string, { prettyId: string; views: number; users: number; engagementSec: number }>();
    for (const r of rows) {
      const pathOnly = (r.path || "")
        .split("?")[0]
        .replace(/[#].*$/, "")
        .replace(/\/+$/, (tail: string) => (tail.length > 1 ? "/" : ""));
      // Accept "/content/:id" or "/content/:id/" only
      const m = pathOnly.match(/^\/content\/([^\/?#]+)\/?$/i);
      if (!m) continue;
      const prettyId = decodeURIComponent(m[1]);
      const cur = slugMap.get(prettyId) || { prettyId, views: 0, users: 0, engagementSec: 0 };
      cur.views += r.views;
      cur.users += r.users;
      cur.engagementSec += r.engagementSec;
      slugMap.set(prettyId, cur);
    }
    const baseItems = Array.from(slugMap.values()).sort((a, b) => b.views - a.views).slice(0, 10);
    let resultItems: any[] = baseItems;
    if (baseItems.length) {
      const details = await prisma.tapestry.findMany({ where: { prettyId: { in: baseItems.map(i => i.prettyId) } }, select: { id: true, title: true, prettyId: true } });
      const dmap = new Map(details.map(d => [d.prettyId, d] as const));
      resultItems = baseItems.map(i => ({
        id: dmap.get(i.prettyId)?.id || null,
        title: dmap.get(i.prettyId)?.title || null,
        prettyId: i.prettyId,
        views: i.views,
        users: i.users,
        avgTimeSec: i.users ? Math.round(i.engagementSec / i.users) : 0
      }));
    }
    res.json({ configured: true, items: resultItems });
  } catch (e: any) {
    // Surface error details to help diagnose GA configuration mismatches
    const msg = e?.message || String(e);
    const code = e?.code || e?.status || undefined;
    res.status(200).json({ configured: false, error: msg, code });
  }
});

// GA diagnostics helper
// No auth for diagnostics to simplify setup troubleshooting
app.get("/analytics/diagnostics", async (_req, res) => {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const pathMod = localRequire('path');
  const fs = localRequire('fs');
  const hereFile = fileURLToPath(import.meta.url);
  const hereDir = pathMod.dirname(hereFile);
  const resolvedPath = gac && !pathMod.isAbsolute(gac) ? pathMod.join(hereDir, '..', gac) : gac;
  const keyExists = resolvedPath ? fs.existsSync(resolvedPath) : false;
  let keyEmail: string | null = null;
  try {
    if (keyExists && resolvedPath) {
      const raw = fs.readFileSync(resolvedPath, 'utf8');
      const json = JSON.parse(raw);
      keyEmail = json.client_email || null;
    }
  } catch {}
  const clientLoaded = !!analyticsDataClient;
  const result: any = {
    propertyId,
    credentialsPath: gac,
    resolvedCredentialsPath: resolvedPath,
    keyExists,
    keyEmail,
    clientLoaded,
    configured: !!(propertyId && keyExists && clientLoaded)
  };
  // Try a tiny probe call if configured
  if (result.configured) {
    try {
      const [resp] = await analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: "yesterday", endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "screenPageViews" }],
        limit: 1,
      });
      result.probe = { ok: true, rowCount: (resp?.rows || []).length };
    } catch (e: any) {
      result.probe = { ok: false, error: e?.message || String(e) };
    }
  }
  res.json(result);
});

// Who am I
app.get("/auth/me", authGuard(), (req: AuthenticatedRequest, res) => {
  res.json({
    sub: req.user?.sub,
    name: req.user?.name,
    roles: req.user?.roles || []
  });
});

// Tapestries - minimal CRUD
app.get("/tapestries", authGuard(["Admin", "Editor", "Viewer"]), async (_req, res) => {
  // Pull base tapestries, then annotate with isThreeJS by checking legacy threejs tables
  const items = await prisma.tapestry.findMany({ orderBy: { id: "desc" } });
  try {
    // Use raw query for speed; mark any tapestry that has a row in threejs_sets or threejs
    const ids = items.map((t) => t.id).filter((id) => Number.isFinite(id));
    let threeRows: any[] = [];
    if (ids.length) {
      const idList = ids.join(",");
      const q = `
        SELECT DISTINCT t.tapestry_id AS id
        FROM tapestry t
        LEFT JOIN threejs_sets s ON s.tapestry_id = t.tapestry_id
        LEFT JOIN threejs tj ON tj.tapestry_id = t.tapestry_id
        WHERE t.tapestry_id IN (${idList})
          AND (s.tapestry_id IS NOT NULL OR tj.tapestry_id IS NOT NULL)
      `;
      threeRows = await (db as any).$queryRawUnsafe(q);
    }
    const threeSet = new Set((Array.isArray(threeRows) ? threeRows : []).map((r: any) => Number(r.id)));
    const withFlag = items.map((t: any) => ({ ...t, isThreeJS: threeSet.has(t.id) }));
    res.json(withFlag);
  } catch {
    // If the legacy tables are missing, still return items without flag
    res.json(items);
  }
});

app.get("/tapestries/:id", authGuard(["Admin", "Editor", "Viewer"]), async (req, res) => {
  const id = Number(req.params.id);
  const item = await prisma.tapestry.findUnique({ where: { id } });
  if (!item) return res.sendStatus(404);
  // Load scenes with extended columns via raw SQL
  const scenes: any = await (db as any).$queryRawUnsafe(
    `SELECT 
        s.scene_id AS id,
        s.scene_sequence AS sequence,
        s.scene_title AS title,
        s.scene_title_alt_lang AS titleAltLang,
        s.scene_desciption AS description,
        s.scene_desciption_alt_lang AS descriptionAltLang,
        s.audio_narration_1 AS audioNarration1,
        s.audio_narration_2 AS audioNarration2,
        s.narration_cc_1 AS narrationCc1,
        s.narration_cc_2 AS narrationCc2,
        s.use_ambient_audio_alt AS useAmbientAudioAlt,
        s.pan_enable AS panEnable,
        s.start_camera_position AS startCameraPosition,
        s.start_camera_target AS startCameraTarget,
        s.zoom_camera_position AS zoomCameraPosition,
        s.zoom_camera_target AS zoomCameraTarget,
        s.camera_fov AS cameraFov,
        s.desaturate AS desaturate,
        s.instant_move AS instantMove,
        s.interactive_id AS interactiveId
      FROM scenes s
      WHERE s.tapestry_id = ${id}
      ORDER BY s.scene_sequence ASC, s.scene_id ASC`
  );
  try {
    const rows: any = await (db as any).$queryRawUnsafe(
      `SELECT 1 AS hasRow FROM threejs_sets WHERE tapestry_id = ${id} LIMIT 1`
    );
    const rows2: any = await (db as any).$queryRawUnsafe(
      `SELECT 1 AS hasRow FROM threejs WHERE tapestry_id = ${id} LIMIT 1`
    );
    const isThreeJS = (Array.isArray(rows) && rows.length > 0) || (Array.isArray(rows2) && rows2.length > 0);
    res.json({ ...item, scenes, isThreeJS });
  } catch {
    res.json({ ...item, scenes });
  }
});

app.post("/tapestries", authGuard(["Admin", "Editor"]), async (req, res) => {
  const created = await prisma.tapestry.create({ data: req.body });
  res.status(201).json(created);
});

app.put("/tapestries/:id", authGuard(["Admin", "Editor"]), async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.tapestry.update({ where: { id }, data: req.body });
  res.json(updated);
});

app.delete("/tapestries/:id", authGuard(["Admin"]), async (req, res) => {
  const id = Number(req.params.id);
  await prisma.tapestry.delete({ where: { id } });
  res.sendStatus(204);
});

// Scenes CRUD
const sceneCreateSchema = z.object({
  sequence: z.string().min(1).max(255),
  title: z.string().max(255).optional().nullable(),
  titleAltLang: z.string().max(255).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  descriptionAltLang: z.string().max(1000).optional().nullable(),
});

const sceneUpdateSchema = z.object({
  sequence: z.string().max(255).optional().nullable(),
  title: z.string().max(255).optional().nullable(),
  titleAltLang: z.string().max(255).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  descriptionAltLang: z.string().max(1000).optional().nullable(),
  audioNarration1: z.string().max(255).optional().nullable(),
  audioNarration2: z.string().max(255).optional().nullable(),
  narrationCc1: z.string().max(255).optional().nullable(),
  narrationCc2: z.string().max(255).optional().nullable(),
  useAmbientAudioAlt: z.union([z.number().int(), z.boolean()]).optional().nullable(),
  panEnable: z.string().max(10).optional().nullable(),
  startCameraPosition: z.string().max(255).optional().nullable(),
  startCameraTarget: z.string().max(255).optional().nullable(),
  zoomCameraPosition: z.string().max(255).optional().nullable(),
  zoomCameraTarget: z.string().max(255).optional().nullable(),
  cameraFov: z.number().optional().nullable(),
  desaturate: z.union([z.number().int(), z.boolean()]).optional().nullable(),
  instantMove: z.union([z.number().int(), z.boolean()]).optional().nullable(),
  interactiveId: z.number().int().optional().nullable(),
}).partial();

app.post("/tapestries/:id/scenes", authGuard(["Admin", "Editor"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const parsed = sceneCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { sequence, title, titleAltLang, description, descriptionAltLang } = parsed.data;
  const created = await prisma.scene.create({
    data: {
      tapestryId,
      sequence,
      title: title ?? null,
      titleAltLang: titleAltLang ?? null,
      description: description ?? null,
      descriptionAltLang: descriptionAltLang ?? null,
    },
  });
  res.status(201).json(created);
});

app.put("/scenes/:sceneId", authGuard(["Admin", "Editor"]), async (req, res) => {
  const sceneId = Number(req.params.sceneId);
  const parsed = sceneUpdateSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const entries = Object.entries(parsed.data);
  if (!entries.length) return res.json({ ok: true });
  const map: Record<string, string> = {
    sequence: 'scene_sequence',
    title: 'scene_title',
    titleAltLang: 'scene_title_alt_lang',
    description: 'scene_desciption',
    descriptionAltLang: 'scene_desciption_alt_lang',
    audioNarration1: 'audio_narration_1',
    audioNarration2: 'audio_narration_2',
    narrationCc1: 'narration_cc_1',
    narrationCc2: 'narration_cc_2',
    useAmbientAudioAlt: 'use_ambient_audio_alt',
    panEnable: 'pan_enable',
    startCameraPosition: 'start_camera_position',
    startCameraTarget: 'start_camera_target',
    zoomCameraPosition: 'zoom_camera_position',
    zoomCameraTarget: 'zoom_camera_target',
    cameraFov: 'camera_fov',
    desaturate: 'desaturate',
    instantMove: 'instant_move',
    interactiveId: 'interactive_id',
  };
  // Normalize boolean-like fields to 0/1
  const normalize = (k: string, v: any) => {
    if (k === 'useAmbientAudioAlt' || k === 'desaturate' || k === 'instantMove') return v == null ? null : (v ? 1 : 0);
    return v;
  };
  const sets = entries.map(([k, v]) => `${map[k]} = ${v == null ? 'NULL' : '?'}`).join(', ');
  const values = entries.filter(([, v]) => v != null).map(([k, v]) => normalize(k, v) as any);
  await (db as any).$executeRawUnsafe(`UPDATE scenes SET ${sets} WHERE scene_id = ${sceneId}`, ...values as any);
  res.json({ ok: true });
});

app.delete("/scenes/:sceneId", authGuard(["Admin", "Editor"]), async (req, res) => {
  const sceneId = Number(req.params.sceneId);
  await prisma.scene.delete({ where: { id: sceneId } });
  res.sendStatus(204);
});

// Reorder scenes by updating sequence strings
app.patch("/tapestries/:id/scenes/reorder", authGuard(["Admin", "Editor"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const arr = z.array(z.object({ id: z.number(), sequence: z.string().min(1).max(255) })).safeParse(req.body);
  if (!arr.success) return res.status(400).json(arr.error.flatten());
  const updates = arr.data;
  const existing = await prisma.scene.findMany({ where: { tapestryId }, select: { id: true } });
  const existingIds = new Set(existing.map((s) => s.id));
  const filtered = updates.filter((u) => existingIds.has(u.id));
  await Promise.all(filtered.map((u) => prisma.scene.update({ where: { id: u.id }, data: { sequence: u.sequence } })));
  res.sendStatus(204);
});

// Voice Clips CRUD (subset to cover legacy editor fields)
const voiceClipCreateSchema = z.object({
  voiceVideo: z.string().url().max(1000).optional().nullable(),
  voiceVideoCc1: z.string().max(255).optional().nullable(),
  voiceVideoCc2: z.string().max(255).optional().nullable(),
  voiceBubbleText: z.string().max(255).optional().nullable(),
  voiceBubbleTextAlt: z.string().max(255).optional().nullable(),
  voiceId: z.number().optional().nullable(),
  sceneId: z.number()
});
const voiceClipUpdateSchema = voiceClipCreateSchema.partial();

app.get("/tapestries/:id/voice-clips", authGuard(["Admin", "Editor", "Viewer"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const clips = await db.voiceClip.findMany({
    where: { scene: { tapestryId } },
    orderBy: [{ sceneId: "asc" }, { id: "asc" }],
    include: { voice: true, scene: { select: { id: true, sequence: true } } }
  });
  res.json(clips);
});

// Voices CRUD
const voiceCreateSchema = z.object({
  name: z.string().max(255),
  nameAltLang: z.string().max(255).optional().nullable(),
  title: z.string().max(255).optional().nullable(),
  titleAltLang: z.string().max(255).optional().nullable(),
  affiliation: z.string().max(255).optional().nullable(),
  affiliationAltLang: z.string().max(255).optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  bioAltLang: z.string().max(1000).optional().nullable(),
  introVideo: z.string().url().max(1000).optional().nullable(),
  introVideoCc1: z.string().max(255).optional().nullable(),
  introVideoCc2: z.string().max(255).optional().nullable(),
  headshot: z.string().max(255).optional().nullable(),
  headshotAltDesc: z.string().max(255).optional().nullable(),
  headshotLarge: z.string().max(255).optional().nullable(),
  headshotLargeAltDesc: z.string().max(255).optional().nullable(),
  order: z.number().int().optional().nullable(),
  tapestryId: z.number().int()
});
const voiceUpdateSchema = voiceCreateSchema.partial();

app.get("/tapestries/:id/voices", authGuard(["Admin", "Editor", "Viewer"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const voices = await db.voice.findMany({ where: { tapestryId }, orderBy: [{ order: "asc" }, { id: "asc" }] });
  res.json(voices);
});

app.post("/tapestries/:id/voices", authGuard(["Admin", "Editor"]), async (req, res) => {
  const parsed = voiceCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const created = await db.voice.create({ data: parsed.data });
  res.status(201).json(created);
});

app.put("/voices/:voiceId", authGuard(["Admin", "Editor"]), async (req, res) => {
  const voiceId = Number(req.params.voiceId);
  const parsed = voiceUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const updated = await db.voice.update({ where: { id: voiceId }, data: parsed.data });
  res.json(updated);
});

app.delete("/voices/:voiceId", authGuard(["Admin", "Editor"]), async (req, res) => {
  const voiceId = Number(req.params.voiceId);
  await db.voice.delete({ where: { id: voiceId } });
  res.sendStatus(204);
});

app.post("/tapestries/:id/voice-clips", authGuard(["Admin", "Editor"]), async (req, res) => {
  const parsed = voiceClipCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const created = await db.voiceClip.create({ data: parsed.data });
  res.status(201).json(created);
});

app.put("/voice-clips/:clipId", authGuard(["Admin", "Editor"]), async (req, res) => {
  const clipId = Number(req.params.clipId);
  const parsed = voiceClipUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const updated = await db.voiceClip.update({ where: { id: clipId }, data: parsed.data });
  res.json(updated);
});

app.delete("/voice-clips/:clipId", authGuard(["Admin", "Editor"]), async (req, res) => {
  const clipId = Number(req.params.clipId);
  await db.voiceClip.delete({ where: { id: clipId } });
  res.sendStatus(204);
});

// Media Items list by tapestry via scenes
app.get("/tapestries/:id/media-items", authGuard(["Admin", "Editor", "Viewer"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const items = await db.mediaItem.findMany({
    where: { scene: { tapestryId } },
    orderBy: [{ sceneId: "asc" }, { order: "asc" }, { id: "asc" }],
    include: { scene: { select: { id: true, sequence: true } } }
  });
  res.json(items);
});

// ThreeJS Sets for a tapestry
app.get("/tapestries/:id/sets", authGuard(["Admin", "Editor", "Viewer"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  try {
    const rows = await (db as any).$queryRawUnsafe(
      `SELECT 
         set_id      AS id,
         tapestry_id AS tapestryId,
         type,
         asset,
         hdr_link    AS hdrLink,
         hdr_rotation AS hdrRotation,
         fog_color   AS fogColor,
         fog_density AS fogDensity,
         tjs_settings AS tjsSettings,
         thought_interval AS thoughtInterval
       FROM threejs_sets
       WHERE tapestry_id = ${tapestryId}
       ORDER BY set_id ASC`
    );
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Create ThreeJS Set
app.post("/tapestries/:id/sets", authGuard(["Admin", "Editor"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const body = req.body || {};
  const schema = z.object({
    type: z.string().max(255).optional().nullable(),
    asset: z.string().max(1000).optional().nullable(),
    hdrLink: z.string().max(1000).optional().nullable(),
    hdrRotation: z.number().optional().nullable(),
    fogColor: z.string().max(255).optional().nullable(),
    fogDensity: z.number().optional().nullable(),
    tjsSettings: z.string().optional().nullable(),
    thoughtInterval: z.number().optional().nullable(),
  }).safeParse(body);
  if (!schema.success) return res.status(400).json(schema.error.flatten());
  const payload = schema.data as any;
  const cols: string[] = ["tapestry_id"]; const vals: any[] = [tapestryId]; const placeholders: string[] = ["?"];
  const map: Record<string, string> = { type: "type", asset: "asset", hdrLink: "hdr_link", hdrRotation: "hdr_rotation", fogColor: "fog_color", fogDensity: "fog_density", tjsSettings: "tjs_settings", thoughtInterval: "thought_interval" };
  for (const [k, v] of Object.entries(payload)) {
    cols.push(map[k]); placeholders.push(v == null ? "NULL" : "?"); if (v != null) vals.push(v);
  }
  const sql = `INSERT INTO threejs_sets (${cols.join(',')}) VALUES (${placeholders.join(',')})`;
  await (db as any).$executeRawUnsafe(sql, ...vals as any);
  const row: any = await (db as any).$queryRawUnsafe(`SELECT set_id AS id FROM threejs_sets WHERE tapestry_id = ${tapestryId} ORDER BY set_id DESC LIMIT 1`);
  res.status(201).json({ id: Array.isArray(row) && row[0]?.id ? row[0].id : null });
});

// Update ThreeJS Set
app.put("/sets/:setId", authGuard(["Admin", "Editor"]), async (req, res) => {
  const setId = Number(req.params.setId);
  const body = req.body || {};
  const schema = z.object({
    type: z.string().max(255).optional().nullable(),
    asset: z.string().max(1000).optional().nullable(),
    hdrLink: z.string().max(1000).optional().nullable(),
    hdrRotation: z.number().optional().nullable(),
    fogColor: z.string().max(255).optional().nullable(),
    fogDensity: z.number().optional().nullable(),
    tjsSettings: z.string().optional().nullable(),
    thoughtInterval: z.number().optional().nullable(),
  }).safeParse(body);
  if (!schema.success) return res.status(400).json(schema.error.flatten());
  const entries = Object.entries(schema.data);
  if (!entries.length) return res.json({ ok: true });
  const map: Record<string, string> = { type: "type", asset: "asset", hdrLink: "hdr_link", hdrRotation: "hdr_rotation", fogColor: "fog_color", fogDensity: "fog_density", tjsSettings: "tjs_settings", thoughtInterval: "thought_interval" };
  const sets = entries.map(([k, v]) => `${map[k]} = ${v == null ? 'NULL' : '?'}`).join(', ');
  const values = entries.filter(([, v]) => v != null).map(([, v]) => v as any);
  await (db as any).$executeRawUnsafe(`UPDATE threejs_sets SET ${sets} WHERE set_id = ${setId}`, ...values as any);
  res.json({ ok: true });
});

// Delete ThreeJS Set
app.delete("/sets/:setId", authGuard(["Admin", "Editor"]), async (req, res) => {
  const setId = Number(req.params.setId);
  await (db as any).$executeRawUnsafe(`DELETE FROM threejs_sets WHERE set_id = ${setId}`);
  res.sendStatus(204);
});

// ThreeJS Tile Markers for a tapestry
app.get("/tapestries/:id/markers", authGuard(["Admin", "Editor", "Viewer"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  try {
    // Markers can reference either a scene or an overview; filter by tapestry via join
    const rows = await (db as any).$queryRawUnsafe(
      `SELECT 
         tm.marker_id AS id,
         tm.scene_id AS sceneId,
         s.scene_sequence AS sceneSequence,
         tm.overview_id AS overviewId,
         tm.marker_label AS markerLabel,
         tm.lat,
         tm.lon,
         tm.marker_color AS markerColor,
         tm.font_color AS fontColor,
         tm.font_size AS fontSize,
         tm.start_time AS startTime,
         tm.end_time AS endTime,
         tm.interactive_id AS interactiveId,
         tm.interactive_highlight_id AS interactiveHighlightId
       FROM threejs_tile_markers tm
       LEFT JOIN scenes s ON s.scene_id = tm.scene_id
       WHERE (s.tapestry_id = ${tapestryId})
          OR (tm.overview_id IN (SELECT t.overview_id FROM tapestry t WHERE t.tapestry_id = ${tapestryId} AND t.overview_id IS NOT NULL))
       ORDER BY tm.marker_id ASC`
    );
    res.json(Array.isArray(rows) ? rows : []);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Create ThreeJS Marker
app.post("/tapestries/:id/markers", authGuard(["Admin", "Editor"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const schema = z.object({
    sceneId: z.number().int().optional().nullable(),
    overviewId: z.number().int().optional().nullable(),
    markerLabel: z.string().max(255).optional().nullable(),
    lat: z.number().optional().nullable(),
    lon: z.number().optional().nullable(),
    markerColor: z.string().max(32).optional().nullable(),
    fontColor: z.string().max(32).optional().nullable(),
    fontSize: z.string().max(32).optional().nullable(),
    startTime: z.number().optional().nullable(),
    endTime: z.number().optional().nullable(),
    interactiveId: z.number().int().optional().nullable(),
    interactiveHighlightId: z.number().int().optional().nullable(),
  }).safeParse(req.body || {});
  if (!schema.success) return res.status(400).json(schema.error.flatten());
  const payload: any = schema.data;
  const cols = ["scene_id", "overview_id", "marker_label", "lat", "lon", "marker_color", "font_color", "font_size", "start_time", "end_time", "interactive_id", "interactive_highlight_id"];
  const map: Record<string, string> = { sceneId: "scene_id", overviewId: "overview_id", markerLabel: "marker_label", lat: "lat", lon: "lon", markerColor: "marker_color", fontColor: "font_color", fontSize: "font_size", startTime: "start_time", endTime: "end_time", interactiveId: "interactive_id", interactiveHighlightId: "interactive_highlight_id" };
  const usedCols: string[] = []; const placeholders: string[] = []; const values: any[] = [];
  for (const [k, v] of Object.entries(payload)) {
    usedCols.push(map[k]); placeholders.push(v == null ? 'NULL' : '?'); if (v != null) values.push(v);
  }
  if (!usedCols.length) return res.status(400).json({ error: "No data provided" });
  await (db as any).$executeRawUnsafe(`INSERT INTO threejs_tile_markers (${usedCols.join(',')}) VALUES (${placeholders.join(',')})`, ...values as any);
  const row: any = await (db as any).$queryRawUnsafe(`SELECT marker_id AS id FROM threejs_tile_markers ORDER BY marker_id DESC LIMIT 1`);
  res.status(201).json({ id: Array.isArray(row) && row[0]?.id ? row[0].id : null });
});

// Update ThreeJS Marker
app.put("/markers/:markerId", authGuard(["Admin", "Editor"]), async (req, res) => {
  const markerId = Number(req.params.markerId);
  const schema = z.object({
    sceneId: z.number().int().optional().nullable(),
    overviewId: z.number().int().optional().nullable(),
    markerLabel: z.string().max(255).optional().nullable(),
    lat: z.number().optional().nullable(),
    lon: z.number().optional().nullable(),
    markerColor: z.string().max(32).optional().nullable(),
    fontColor: z.string().max(32).optional().nullable(),
    fontSize: z.string().max(32).optional().nullable(),
    startTime: z.number().optional().nullable(),
    endTime: z.number().optional().nullable(),
    interactiveId: z.number().int().optional().nullable(),
    interactiveHighlightId: z.number().int().optional().nullable(),
  }).safeParse(req.body || {});
  if (!schema.success) return res.status(400).json(schema.error.flatten());
  const entries = Object.entries(schema.data);
  if (!entries.length) return res.json({ ok: true });
  const map: Record<string, string> = { sceneId: "scene_id", overviewId: "overview_id", markerLabel: "marker_label", lat: "lat", lon: "lon", markerColor: "marker_color", fontColor: "font_color", fontSize: "font_size", startTime: "start_time", endTime: "end_time", interactiveId: "interactive_id", interactiveHighlightId: "interactive_highlight_id" };
  const sets = entries.map(([k, v]) => `${map[k]} = ${v == null ? 'NULL' : '?'}`).join(', ');
  const values = entries.filter(([, v]) => v != null).map(([, v]) => v as any);
  await (db as any).$executeRawUnsafe(`UPDATE threejs_tile_markers SET ${sets} WHERE marker_id = ${markerId}` , ...values as any);
  res.json({ ok: true });
});

// Delete ThreeJS Marker
app.delete("/markers/:markerId", authGuard(["Admin", "Editor"]), async (req, res) => {
  const markerId = Number(req.params.markerId);
  await (db as any).$executeRawUnsafe(`DELETE FROM threejs_tile_markers WHERE marker_id = ${markerId}`);
  res.sendStatus(204);
});

app.post("/tapestries/:id/media-items", authGuard(["Admin", "Editor"]), async (req, res) => {
  const parsed = z.object({
    title: z.string().max(255).optional().nullable(),
    titleAltLang: z.string().max(255).optional().nullable(),
    caption: z.string().max(500).optional().nullable(),
    captionAltLang: z.string().max(500).optional().nullable(),
    type: z.string().max(255).optional().nullable(),
    assetLink: z.string().url().max(1000).optional().nullable(),
    assetThumbLink: z.string().max(255).optional().nullable(),
    assetSecondaryLink: z.string().max(255).optional().nullable(),
    assetAltDesc: z.string().max(1000).optional().nullable(),
    assetCc: z.string().max(255).optional().nullable(),
    assetCcAlt: z.string().max(255).optional().nullable(),
    order: z.number().int().optional().nullable(),
    credit: z.string().max(500).optional().nullable(),
    creditAltLang: z.string().max(500).optional().nullable(),
    sceneId: z.number().int(),
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const created = await db.mediaItem.create({ data: parsed.data });
  res.status(201).json(created);
});

app.put("/media-items/:mediaId", authGuard(["Admin", "Editor"]), async (req, res) => {
  const mediaId = Number(req.params.mediaId);
  const parsed = z.object({
    title: z.string().max(255).optional().nullable(),
    titleAltLang: z.string().max(255).optional().nullable(),
    caption: z.string().max(500).optional().nullable(),
    captionAltLang: z.string().max(500).optional().nullable(),
    type: z.string().max(255).optional().nullable(),
    assetLink: z.string().max(1000).optional().nullable(),
    assetThumbLink: z.string().max(255).optional().nullable(),
    assetSecondaryLink: z.string().max(255).optional().nullable(),
    assetAltDesc: z.string().max(1000).optional().nullable(),
    assetCc: z.string().max(255).optional().nullable(),
    assetCcAlt: z.string().max(255).optional().nullable(),
    order: z.number().int().optional().nullable(),
    credit: z.string().max(500).optional().nullable(),
    creditAltLang: z.string().max(500).optional().nullable(),
    sceneId: z.number().int().optional().nullable(),
  }).partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const updated = await db.mediaItem.update({ where: { id: mediaId }, data: parsed.data });
  res.json(updated);
});

app.delete("/media-items/:mediaId", authGuard(["Admin", "Editor"]), async (req, res) => {
  const mediaId = Number(req.params.mediaId);
  await db.mediaItem.delete({ where: { id: mediaId } });
  res.sendStatus(204);
});

// Interactives (raw queries; not modelled in Prisma schema)
app.get("/tapestries/:id/interactives", authGuard(["Admin", "Editor", "Viewer"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  // Pull directly from interactives table joined to scenes for this tapestry
  const rows = await (db as any).$queryRawUnsafe(
    `SELECT i.interactive_id            AS id,
            i.intensity                 AS intensity,
            i.depth_of_field            AS depthOfField,
            i.camera_position           AS cameraPosition,
            i.camera_target             AS cameraTarget,
            i.camera_fov                AS cameraFov,
            i.dark_icons                AS darkIcons,
            i.desaturate                AS desaturate,
            i.instant_move              AS instantMove,
            s.scene_id                  AS sceneId,
            s.scene_sequence            AS sceneSequence
     FROM interactives i
     JOIN scenes s ON s.interactive_id = i.interactive_id
     WHERE s.tapestry_id = ${tapestryId}
     ORDER BY s.scene_id ASC, i.interactive_id ASC`
  );
  res.json(rows || []);
});

app.post("/tapestries/:id/interactives", authGuard(["Admin", "Editor"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const { intensity, depthOfField, desaturate, instantMove, sceneId } = req.body || {};
  if (!sceneId) return res.status(400).json("sceneId is required");
  // create interactive
  await (db as any).$executeRawUnsafe(
    `INSERT INTO interactives (intensity, depth_of_field, desaturate, instant_move) VALUES (${intensity ?? 'NULL'}, ${depthOfField ?? 'NULL'}, ${desaturate ? 1 : 0}, ${instantMove ? 1 : 0})`
  );
  const created = await (db as any).$queryRawUnsafe(`SELECT LAST_INSERT_ID() as id`);
  const newId = Array.isArray(created) ? created[0]?.id : created?.id;
  // link to scene (ensure it belongs to this tapestry)
  await (db as any).$executeRawUnsafe(`UPDATE scenes SET interactive_id = ${Number(newId)} WHERE scene_id = ${Number(sceneId)} AND tapestry_id = ${tapestryId}`);
  const row = await (db as any).$queryRawUnsafe(`SELECT interactive_id as id, intensity, depth_of_field as depthOfField, desaturate, instant_move as instantMove FROM interactives WHERE interactive_id = ${Number(newId)} LIMIT 1`);
  res.status(201).json(Array.isArray(row) ? row[0] : row);
});

app.put("/interactives/:interactiveId", authGuard(["Admin", "Editor"]), async (req, res) => {
  const interactiveId = Number(req.params.interactiveId);
  const { intensity, depthOfField, desaturate, instantMove } = req.body || {};
  const sets: string[] = [];
  if (intensity !== undefined) sets.push(`intensity = ${intensity == null ? 'NULL' : intensity}`);
  if (depthOfField !== undefined) sets.push(`depth_of_field = ${depthOfField == null ? 'NULL' : depthOfField}`);
  if (desaturate !== undefined) sets.push(`desaturate = ${desaturate ? 1 : 0}`);
  if (instantMove !== undefined) sets.push(`instant_move = ${instantMove ? 1 : 0}`);
  if (sets.length) await (db as any).$executeRawUnsafe(`UPDATE interactives SET ${sets.join(', ')} WHERE interactive_id = ${interactiveId}`);
  const row = await (db as any).$queryRawUnsafe(`SELECT interactive_id as id, intensity, depth_of_field as depthOfField, desaturate, instant_move as instantMove FROM interactives WHERE interactive_id = ${interactiveId} LIMIT 1`);
  res.json(Array.isArray(row) ? row[0] : row);
});

app.delete("/interactives/:interactiveId", authGuard(["Admin", "Editor"]), async (req, res) => {
  const interactiveId = Number(req.params.interactiveId);
  // unlink from scenes first
  await (db as any).$executeRawUnsafe(`UPDATE scenes SET interactive_id = NULL WHERE interactive_id = ${interactiveId}`);
  await (db as any).$executeRawUnsafe(`DELETE FROM interactives WHERE interactive_id = ${interactiveId}`);
  res.sendStatus(204);
});

// Publishing read - select explicit fields from tapestry
app.get("/tapestries/:id/publishing", authGuard(["Admin", "Editor", "Viewer"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const rows = await (db as any).$queryRawUnsafe(
    `SELECT t.tapestry_id               AS id,
            t.tapestry_headline         AS headline,
            t.tapestry_snippet          AS snippet,
            t.tapestry_hover_video      AS hoverVideo,
            t.tapestry_card_image       AS cardImage,
            t.published                 AS published,
            t.display_weight            AS displayWeight,
            t.community_made            AS communityMade,
            t.tapestry_map_zoom         AS mapZoom,
            t.theme                     AS theme,
            t.donate_button             AS donateButton,
            t.password_protect          AS passwordProtect,
            (SELECT p.password FROM passwords p WHERE p.tapestry_id = t.tapestry_id LIMIT 1) AS password,
            t.allow_white_label         AS allowWhiteLabel
     FROM tapestry t
     WHERE t.tapestry_id = ${tapestryId}
     LIMIT 1`
  );
  const row = Array.isArray(rows) ? rows[0] : rows;
  res.json(row || null);
});

// Publishing write - update any subset of fields
app.put("/tapestries/:id/publishing", authGuard(["Admin", "Editor"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const map: Record<string, string> = {
    headline: "tapestry_headline",
    snippet: "tapestry_snippet",
    hoverVideo: "tapestry_hover_video",
    cardImage: "tapestry_card_image",
    published: "published",
    displayWeight: "display_weight",
    communityMade: "community_made",
    mapZoom: "tapestry_map_zoom",
    theme: "theme",
    donateButton: "donate_button",
    passwordProtect: "password_protect",
    allowWhiteLabel: "allow_white_label",
  };
  const payload = req.body as Record<string, any>;
  const entries = Object.entries(payload).filter(([k]) => !!map[k] || k === 'password');
  if (!entries.length) return res.status(400).json("No valid fields provided");

  // Split updates: tapestry table fields vs password table
  const tpSets: string[] = []; const tpVals: any[] = [];
  let passwordVal: string | null | undefined = undefined;
  for (const [k, v] of entries) {
    if (k === 'password') { passwordVal = v as any; continue; }
    if (map[k]) {
      tpSets.push(`${map[k]} = ${v == null ? 'NULL' : '?'}`);
      if (v != null) tpVals.push(v);
    }
  }
  if (tpSets.length) await (db as any).$executeRawUnsafe(`UPDATE tapestry SET ${tpSets.join(', ')} WHERE tapestry_id = ${tapestryId}`, ...tpVals as any);

  if (passwordVal !== undefined) {
    // upsert into passwords table
    const exists = await (db as any).$queryRawUnsafe(`SELECT tapestry_id FROM passwords WHERE tapestry_id = ${tapestryId} LIMIT 1`);
    const has = Array.isArray(exists) ? !!exists[0] : !!exists;
    if (passwordVal == null || passwordVal === '') {
      await (db as any).$executeRawUnsafe(`DELETE FROM passwords WHERE tapestry_id = ${tapestryId}`);
    } else if (has) {
      await (db as any).$executeRawUnsafe(`UPDATE passwords SET password = ? WHERE tapestry_id = ${tapestryId}`, passwordVal);
    } else {
      await (db as any).$executeRawUnsafe(`INSERT INTO passwords (tapestry_id, password) VALUES (${tapestryId}, ?)`, passwordVal);
    }
  }
  const fresh = await (db as any).$queryRawUnsafe(
    `SELECT t.tapestry_id AS id,
            t.tapestry_headline AS headline,
            t.tapestry_snippet AS snippet,
            t.tapestry_hover_video AS hoverVideo,
            t.tapestry_card_image AS cardImage,
            t.published,
            t.display_weight AS displayWeight,
            t.community_made AS communityMade,
            t.tapestry_map_zoom AS mapZoom,
            t.theme,
            t.donate_button AS donateButton,
            t.password_protect AS passwordProtect,
            (SELECT p.password FROM passwords p WHERE p.tapestry_id = t.tapestry_id LIMIT 1) AS password,
            t.allow_white_label AS allowWhiteLabel
     FROM tapestry t
     WHERE t.tapestry_id = ${tapestryId}
     LIMIT 1`
  );
  res.json(Array.isArray(fresh) ? fresh[0] : fresh);
});

// Splash Page endpoints
app.get("/tapestries/:id/splash", authGuard(["Admin", "Editor", "Viewer"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const rows = await (db as any).$queryRawUnsafe(
    `SELECT tapestry_id AS id,
            tapestry_map_zoom AS mapZoom,
            tapestry_latitude AS latitude,
            tapestry_longitude AS longitude,
            splash_image AS splashImage,
            splash_image_alt_desc AS splashImageAltDesc,
            presented_by_logo AS presentedByLogo,
            display_map AS displayMap
     FROM tapestry WHERE tapestry_id = ${tapestryId} LIMIT 1`
  );
  res.json(Array.isArray(rows) ? rows[0] : rows);
});

app.put("/tapestries/:id/splash", authGuard(["Admin", "Editor"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const map: Record<string, string> = {
    mapZoom: "tapestry_map_zoom",
    latitude: "tapestry_latitude",
    longitude: "tapestry_longitude",
    splashImage: "splash_image",
    splashImageAltDesc: "splash_image_alt_desc",
    presentedByLogo: "presented_by_logo",
    displayMap: "display_map",
  };
  const payload = req.body as Record<string, any>;
  const entries = Object.entries(payload).filter(([k]) => !!map[k]);
  if (!entries.length) return res.status(400).json("No fields to update");
  const sets = entries.map(([k, v]) => `${map[k]} = ${v == null ? 'NULL' : '?'}`).join(', ');
  const values = entries.map(([, v]) => v).filter((v) => v != null);
  await (db as any).$executeRawUnsafe(`UPDATE tapestry SET ${sets} WHERE tapestry_id = ${tapestryId}`, ...values as any);
  const fresh = await (db as any).$queryRawUnsafe(`SELECT tapestry_id AS id, tapestry_map_zoom AS mapZoom, tapestry_latitude AS latitude, tapestry_longitude AS longitude, splash_image AS splashImage, splash_image_alt_desc AS splashImageAltDesc, presented_by_logo AS presentedByLogo, display_map AS displayMap FROM tapestry WHERE tapestry_id = ${tapestryId} LIMIT 1`);
  res.json(Array.isArray(fresh) ? fresh[0] : fresh);
});

// Scene Highlights (joined legacy + threejs tables)
app.get("/tapestries/:id/scene-highlights", authGuard(["Admin", "Editor", "Viewer"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const rows = await (db as any).$queryRawUnsafe(
    `SELECT sh.scene_highlight_id                                  AS id,
            sh.scene_id                                            AS sceneId,
            s.scene_sequence                                       AS sceneSequence,
            sh.sketchfab_material_id                               AS sketchfabMaterialId,
            sh.sketchfab_model_id                                  AS sketchfabModelId,
            sh.start_time                                          AS startTime,
            sh.end_time                                            AS endTime,
            sh.fade                                                AS fade,
            tjs.highlight_position                                 AS highlightPosition,
            tjs.highlight_rotation                                 AS highlightRotation,
            tjs.highlight_scale                                    AS highlightScale,
            tjs.highlight_model_url                                AS highlightModelUrl,
            tjs.shadow_enabled                                     AS shadowEnabled,
            tjs.animation_type                                     AS animationType,
            tjs.entrance_exit_animation                            AS entranceExitAnimation
     FROM scene_highlights sh
     JOIN scenes s ON s.scene_id = sh.scene_id
     LEFT JOIN threejs_scene_highlights tjs ON tjs.scene_highlight_id = sh.scene_highlight_id
     WHERE s.tapestry_id = ${tapestryId}
     ORDER BY sh.scene_id ASC, sh.scene_highlight_id ASC`
  );
  res.json(rows || []);
});

app.post("/tapestries/:id/scene-highlights", authGuard(["Admin", "Editor"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const {
    sceneId,
    sketchfabMaterialId,
    sketchfabModelId,
    startTime,
    endTime,
    fade,
    highlightPosition,
    highlightRotation,
    highlightScale,
    highlightModelUrl,
    shadowEnabled,
    animationType,
    entranceExitAnimation,
  } = req.body || {};

  if (!sceneId) return res.status(400).json("sceneId is required");
  // Ensure scene belongs to tapestry
  const scene = await (db as any).$queryRawUnsafe(`SELECT scene_id FROM scenes WHERE scene_id = ${Number(sceneId)} AND tapestry_id = ${tapestryId} LIMIT 1`);
  const ok = Array.isArray(scene) ? scene[0] : scene;
  if (!ok) return res.status(400).json("Scene does not belong to this tapestry");

  // Insert into base table
  await (db as any).$executeRawUnsafe(
    `INSERT INTO scene_highlights (sketchfab_material_id, sketchfab_model_id, start_time, end_time, fade, scene_id)
     VALUES (${sketchfabMaterialId ? '?' : 'NULL'}, ${sketchfabModelId ? '?' : 'NULL'}, ${startTime ?? 'NULL'}, ${endTime ?? 'NULL'}, ${fade ?? 'NULL'}, ${Number(sceneId)})`,
    ...(sketchfabMaterialId ? [sketchfabMaterialId] : []),
    ...(sketchfabModelId ? [sketchfabModelId] : [])
  );
  const created = await (db as any).$queryRawUnsafe(`SELECT LAST_INSERT_ID() as id`);
  const newId = Array.isArray(created) ? created[0]?.id : created?.id;

  const hasThree = [highlightPosition, highlightRotation, highlightScale, highlightModelUrl, shadowEnabled, animationType, entranceExitAnimation]
    .some((v) => v !== undefined && v !== null && v !== "");
  if (newId && hasThree) {
    await (db as any).$executeRawUnsafe(
      `INSERT INTO threejs_scene_highlights (scene_highlight_id, highlight_position, highlight_rotation, highlight_scale, highlight_model_url, shadow_enabled, animation_type, entrance_exit_animation)
       VALUES (${Number(newId)}, ${highlightPosition ? '?' : 'NULL'}, ${highlightRotation ? '?' : 'NULL'}, ${highlightScale ? '?' : 'NULL'}, ${highlightModelUrl ? '?' : 'NULL'}, ${shadowEnabled ? 1 : 0}, ${animationType ? '?' : 'NULL'}, ${entranceExitAnimation ? '?' : 'NULL'})`,
      ...(highlightPosition ? [highlightPosition] : []),
      ...(highlightRotation ? [highlightRotation] : []),
      ...(highlightScale ? [highlightScale] : []),
      ...(highlightModelUrl ? [highlightModelUrl] : []),
      ...(animationType ? [animationType] : []),
      ...(entranceExitAnimation ? [entranceExitAnimation] : [])
    );
  }

  const row = await (db as any).$queryRawUnsafe(
    `SELECT sh.scene_highlight_id AS id,
            sh.scene_id AS sceneId,
            sh.sketchfab_material_id AS sketchfabMaterialId,
            sh.sketchfab_model_id AS sketchfabModelId,
            sh.start_time AS startTime,
            sh.end_time AS endTime,
            sh.fade AS fade
     FROM scene_highlights sh WHERE sh.scene_highlight_id = ${Number(newId)} LIMIT 1`
  );
  res.status(201).json(Array.isArray(row) ? row[0] : row);
});

app.put("/scene-highlights/:id", authGuard(["Admin", "Editor"]), async (req, res) => {
  const id = Number(req.params.id);
  const payload = req.body as Record<string, any>;
  const baseMap: Record<string, string> = {
    sketchfabMaterialId: "sketchfab_material_id",
    sketchfabModelId: "sketchfab_model_id",
    startTime: "start_time",
    endTime: "end_time",
    fade: "fade",
    sceneId: "scene_id",
  };
  const threeMap: Record<string, string> = {
    highlightPosition: "highlight_position",
    highlightRotation: "highlight_rotation",
    highlightScale: "highlight_scale",
    highlightModelUrl: "highlight_model_url",
    shadowEnabled: "shadow_enabled",
    animationType: "animation_type",
    entranceExitAnimation: "entrance_exit_animation",
  };

  const baseSets: string[] = [];
  const baseVals: any[] = [];
  const threeSets: string[] = [];
  const threeVals: any[] = [];

  Object.entries(payload).forEach(([k, v]) => {
    if (baseMap[k]) {
      baseSets.push(`${baseMap[k]} = ${v == null ? 'NULL' : '?'}`);
      if (v != null) baseVals.push(v);
    } else if (threeMap[k]) {
      if (threeMap[k] === 'shadow_enabled') {
        threeSets.push(`${threeMap[k]} = ${v ? 1 : 0}`);
      } else {
        threeSets.push(`${threeMap[k]} = ${v == null ? 'NULL' : '?'}`);
        if (v != null) threeVals.push(v);
      }
    }
  });

  if (baseSets.length) {
    await (db as any).$executeRawUnsafe(`UPDATE scene_highlights SET ${baseSets.join(', ')} WHERE scene_highlight_id = ${id}`, ...baseVals as any);
  }

  if (threeSets.length) {
    // Upsert into threejs table
    const existing = await (db as any).$queryRawUnsafe(`SELECT scene_highlight_id FROM threejs_scene_highlights WHERE scene_highlight_id = ${id} LIMIT 1`);
    const exists = Array.isArray(existing) ? !!existing[0] : !!existing;
    if (exists) {
      await (db as any).$executeRawUnsafe(`UPDATE threejs_scene_highlights SET ${threeSets.join(', ')} WHERE scene_highlight_id = ${id}`, ...threeVals as any);
    } else {
      await (db as any).$executeRawUnsafe(
        `INSERT INTO threejs_scene_highlights (scene_highlight_id${threeSets.length ? ', ' + threeSets.map(s => s.split(' = ')[0]).join(', ') : ''})
         VALUES (${id}${threeSets.length ? ', ' + threeSets.map((s) => s.includes('NULL') || s.includes('shadow_enabled') ? s.split(' = ')[1] : '?').join(', ') : ''})`,
        ...threeVals as any
      );
    }
  }

  const fresh = await (db as any).$queryRawUnsafe(
    `SELECT sh.scene_highlight_id AS id,
            sh.scene_id AS sceneId,
            sh.sketchfab_material_id AS sketchfabMaterialId,
            sh.sketchfab_model_id AS sketchfabModelId,
            sh.start_time AS startTime,
            sh.end_time AS endTime,
            sh.fade AS fade
     FROM scene_highlights sh WHERE sh.scene_highlight_id = ${id} LIMIT 1`
  );
  res.json(Array.isArray(fresh) ? fresh[0] : fresh);
});

app.delete("/scene-highlights/:id", authGuard(["Admin", "Editor"]), async (req, res) => {
  const id = Number(req.params.id);
  await (db as any).$executeRawUnsafe(`DELETE FROM threejs_scene_highlights WHERE scene_highlight_id = ${id}`);
  await (db as any).$executeRawUnsafe(`DELETE FROM scene_highlights WHERE scene_highlight_id = ${id}`);
  res.sendStatus(204);
});

// Themes list
app.get("/themes", authGuard(["Admin", "Editor", "Viewer"]), async (_req, res) => {
  const rows = await (db as any).$queryRawUnsafe(`SELECT theme_id AS id, theme_name AS name FROM themes ORDER BY theme_id ASC`);
  res.json(rows || []);
});

// Languages list (code -> english name)
app.get("/languages", authGuard(["Admin", "Editor", "Viewer"]), async (_req, res) => {
  const rows = await (db as any).$queryRawUnsafe(`SELECT lang_code AS code, english_name AS name FROM language ORDER BY english_name ASC`);
  res.json(rows || []);
});

// Overview by tapestry
app.get("/tapestries/:id/overview", authGuard(["Admin", "Editor", "Viewer"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const t = await prisma.tapestry.findUnique({ where: { id: tapestryId }, select: { overviewId: true } });
  if (!t?.overviewId) return res.json(null);
  const row = await (db as any).$queryRawUnsafe(`SELECT * FROM overview WHERE overview_id = ${Number(t.overviewId)} LIMIT 1`);
  res.json(Array.isArray(row) ? row[0] : row);
});

app.put("/tapestries/:id/overview", authGuard(["Admin", "Editor"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const t = await prisma.tapestry.findUnique({ where: { id: tapestryId }, select: { overviewId: true } });
  if (!t?.overviewId) return res.status(400).json("No overview linked to this tapestry");
  const payload = req.body as Record<string, any>;
  const entries = Object.entries(payload);
  if (!entries.length) return res.status(400).json("No fields to update");
  const sets = entries.map(([k, v]) => `${k} = ${v == null ? 'NULL' : '?'}`).join(', ');
  const values = entries.map(([, v]) => v).filter((v) => v != null);
  await (db as any).$executeRawUnsafe(`UPDATE overview SET ${sets} WHERE overview_id = ${Number(t.overviewId)}`, ...values as any);
  const fresh = await (db as any).$queryRawUnsafe(`SELECT * FROM overview WHERE overview_id = ${Number(t.overviewId)} LIMIT 1`);
  res.json(Array.isArray(fresh) ? fresh[0] : fresh);
});

// Resources page data - fetch by tapestry
app.get("/tapestries/:id/resources", authGuard(["Admin", "Editor", "Viewer"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const t = await prisma.tapestry.findUnique({ where: { id: tapestryId }, select: { resourcesId: true } });
  if (!t?.resourcesId) return res.json(null);
  const resources = await (db as any).$queryRawUnsafe(`SELECT * FROM resources WHERE resources_id = ${Number(t.resourcesId)} LIMIT 1`);
  const row = Array.isArray(resources) ? resources[0] : resources;
  res.json(row || null);
});

app.put("/tapestries/:id/resources", authGuard(["Admin", "Editor"]), async (req, res) => {
  const tapestryId = Number(req.params.id);
  const t = await prisma.tapestry.findUnique({ where: { id: tapestryId }, select: { resourcesId: true } });
  if (!t?.resourcesId) return res.status(400).json("No resources linked to this tapestry");
  const payload = req.body as Record<string, any>;
  const sets = Object.entries(payload).map(([k, v]) => `${k} = ${v == null ? 'NULL' : '?'}`).join(', ');
  const values = Object.values(payload).filter(v => v != null);
  await (db as any).$executeRawUnsafe(`UPDATE resources SET ${sets} WHERE resources_id = ${Number(t.resourcesId)}`, ...values as any);
  const fresh = await (db as any).$queryRawUnsafe(`SELECT * FROM resources WHERE resources_id = ${Number(t.resourcesId)} LIMIT 1`);
  res.json(Array.isArray(fresh) ? fresh[0] : fresh);
});

const port = Number(process.env.PORT || 4000);
// log DB url presence for debug (not the value)
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL not set - Prisma will fail');
}
app.listen(port, () => log.info({ port }, "API listening"));

