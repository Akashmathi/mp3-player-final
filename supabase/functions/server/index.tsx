import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js";

const app = new Hono();

// Middleware: Logging + CORS
app.use("*", logger());
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

const BUCKET = "make-203f6a42-songs";

function srClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key);
}

async function ensureBucket() {
  const supabase = srClient();
  const { data: buckets, error } =
    await supabase.storage.listBuckets();
  if (error) throw error;
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error: createErr } =
      await supabase.storage.createBucket(BUCKET, {
        public: false,
      });
    if (createErr) throw createErr;
    console.log(`Bucket "${BUCKET}" created`);
  }
}

// Health check
app.get("/make-server-203f6a42/health", (c) =>
  c.json({ status: "ok" }),
);

// Helper to require an authorized user and return their id
async function requireUserId(c: any): Promise<string | Response> {
  const auth = c.req.header("Authorization");
  const token = auth?.split(" ")[1];
  if (!token) return c.json({ error: "Unauthorized" }, 401);
  const supabase = srClient();
  const { data, error } = await supabase.auth.getUser(token);
  const uid = (data as any)?.user?.id;
  if (error || !uid) return c.json({ error: "Unauthorized" }, 401);
  return uid as string;
}

// Upload track (scoped to authenticated user)
app.post("/make-server-203f6a42/tracks/upload", async (c) => {
  try {
    await ensureBucket();
    const uid = await requireUserId(c);
    if (uid instanceof Response) return uid;

    const supabase = srClient();
    const form = await c.req.formData();
    const id = form.get("id")?.toString();
    const name = form.get("name")?.toString() || "track.mp3";
    const file = form.get("file") as File | null;

    if (!id || !file) {
      return c.json({ error: "Missing id or file" }, 400);
    }

    const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const objectPath = `${uid}/${id}__${safeName}`;
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, uint8Array, {
        contentType: file.type || "audio/mpeg",
        upsert: true,
      });

    if (upErr) {
      console.error("Upload error:", upErr);
      return c.json(
        { error: upErr.message || String(upErr) },
        500,
      );
    }

    const { data: signed, error: signErr } =
      await supabase.storage
        .from(BUCKET)
        .createSignedUrl(objectPath, 60 * 60 * 24 * 7);

    if (signErr) {
      console.error("Signed URL error:", signErr);
      return c.json(
        { error: signErr.message || String(signErr) },
        500,
      );
    }

    return c.json({ path: objectPath, signedUrl: signed.signedUrl });
  } catch (e) {
    console.error("tracks/upload error:", e);
    return c.json({ error: String(e) }, 500);
  }
});

// Save playlist order (scoped to authenticated user)
app.post("/make-server-203f6a42/playlist/save", async (c) => {
  try {
    const uid = await requireUserId(c);
    if (uid instanceof Response) return uid;
    const body = await c.req.json();
    const { order } = body as { order: string[] };
    await kv.set(`playlist:${uid}:order`, order ?? []);
    return c.json({ ok: true });
  } catch (e) {
    console.error("playlist/save error:", e);
    return c.json({ error: String(e) }, 500);
  }
});

// Load playlist (scoped to authenticated user)
app.get("/make-server-203f6a42/playlist/load", async (c) => {
  try {
    const uid = await requireUserId(c);
    if (uid instanceof Response) return uid;
    const supabase = srClient();
    const { data: files, error } = await supabase.storage.from(BUCKET).list(uid, { limit: 1000 });
    if (error) throw error;
    const items = await Promise.all(
      (files || [])
        .filter((f) => !f.name.endsWith("/"))
        .map(async (f) => {
          const [idPart, ...rest] = f.name.split("__");
          const originalName = decodeURIComponent(rest.join("__") || "track.mp3");
          const path = `${uid}/${f.name}`;
          const { data, error: e2 } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24);
          if (e2) throw e2;
          return { id: idPart, name: originalName, path, signedUrl: data.signedUrl };
        })
    );
    return c.json({ items, order: items.map((i) => i.id) });
  } catch (e) {
    console.error("playlist/load error:", e);
    return c.json({ error: String(e) }, 500);
  }
});

// Sign up (admin create user with auto-confirm)
app.post("/make-server-203f6a42/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json<{ email: string; password: string; name?: string }>();
    if (!email || !password) return c.json({ error: "Missing email or password" }, 400);
    const supabase = srClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || "" },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ ok: true, userId: data.user?.id });
  } catch (e) {
    console.log("signup error", e);
    return c.json({ error: String(e) }, 500);
  }
});

Deno.serve(app.fetch);