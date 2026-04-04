import React from "react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { projectId } from "../utils/supabase/info";
import { supabase } from "./supabase-client";

// Minimal cloud sync helper. Optional: backs up tracks to Supabase Storage via the edge function
// and loads them back on demand. Uses anonymous namespace (no auth) for demo purposes.

export type CloudItem = { id: string; name: string; path: string; signedUrl?: string | null };

const base = `https://${projectId}.supabase.co/functions/v1/make-server-203f6a42`;

export async function cloudUpload(id: string, name: string, file: File): Promise<CloudItem> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not signed in");
  const form = new FormData();
  form.set("id", id);
  form.set("name", name);
  form.set("file", file);
  const res = await fetch(`${base}/tracks/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
  const json = (await res.json()) as { path: string; signedUrl: string };
  return { id, name, path: json.path, signedUrl: json.signedUrl };
}

export async function cloudSavePlaylist(items: CloudItem[], order: string[]) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not signed in");
  const res = await fetch(`${base}/playlist/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ items, order }),
  });
  if (!res.ok) throw new Error(`Save failed: ${await res.text()}`);
}

export async function cloudLoadPlaylist(): Promise<{ items: CloudItem[]; order: string[] }> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Not signed in");
  const res = await fetch(`${base}/playlist/load`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Load failed: ${await res.text()}`);
  const json = (await res.json()) as { items: CloudItem[]; order: string[] };
  return json;
}

export function CloudSyncBar({ onImport }: { onImport: (items: CloudItem[]) => void }) {
  const [busy, setBusy] = React.useState(false);

  async function handleLoad() {
    try {
      setBusy(true);
      const data = await cloudLoadPlaylist();
      onImport(data.items);
      toast.success("Loaded from cloud");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Cloud load failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <p className="text-muted-foreground">Cloud backup is available. Save once, access on any device.</p>
      <Button size="sm" variant="secondary" onClick={handleLoad} disabled={busy}>Load from cloud</Button>
    </div>
  );
}
