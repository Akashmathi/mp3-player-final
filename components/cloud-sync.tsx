import React from "react";
import { Button } from "./ui/button";
import { projectId, publicAnonKey } from "./utils/supabase/info";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-203f6a42`;

function deviceIdEnsure(): string {
  const key = "device_id_v1";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API ${path} ${res.status}`);
  return (await res.json()) as T;
}

export function useCloudSync() {
  const deviceId = React.useMemo(() => deviceIdEnsure(), []);

  async function initBucket() {
    await api<{ ok: boolean }>(`/init`, { method: "POST" });
  }

  async function uploadBlob(id: string, name: string, blob: Blob) {
    const fd = new FormData();
    fd.append("deviceId", deviceId);
    fd.append("id", id);
    fd.append("name", name);
    fd.append("file", blob);
    return api<{ ok: boolean }>(`/upload`, { method: "POST", body: fd });
  }

  async function listRemote() {
    return api<{ ok: boolean; items: { id: string; name: string; url: string; size: number; createdAt: number }[] }>(
      `/list?deviceId=${deviceId}`,
    );
  }

  async function saveOrder(order: string[]) {
    return api<{ ok: boolean }>(`/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, order }),
    });
  }

  async function loadOrder() {
    return api<{ ok: boolean; order: string[] }>(`/order?deviceId=${deviceId}`);
  }

  async function saveState(state: unknown) {
    return api<{ ok: boolean }>(`/state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, state }),
    });
  }

  async function loadState() {
    return api<{ ok: boolean; state: any }>(`/state?deviceId=${deviceId}`);
  }

  return { deviceId, initBucket, uploadBlob, listRemote, saveOrder, loadOrder, saveState, loadState };
}

export function CloudSyncBar({
  onRestore,
  onAfterBackup,
}: {
  onRestore: (items: { id: string; name: string; url: string; size: number; createdAt: number }[]) => void;
  onAfterBackup?: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [lastAction, setLastAction] = React.useState<string>("");
  const { initBucket, listRemote } = useCloudSync();

  return (
    <div className="flex items-center gap-2 border rounded-lg p-3">
      <span className="text-muted-foreground">Cloud backup</span>
      <Button
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await initBucket();
            const res = await listRemote();
            onRestore(res.items || []);
            setLastAction(`Restored ${res.items?.length ?? 0} file(s)`);
          } catch (e) {
            setLastAction("Restore failed");
            console.error(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        Restore from cloud
      </Button>
      {lastAction ? <span className="ml-auto text-muted-foreground">{lastAction}</span> : null}
    </div>
  );
}
