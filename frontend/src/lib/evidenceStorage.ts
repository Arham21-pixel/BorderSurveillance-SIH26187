import { supabase, isSupabaseConfigured } from "./supabase";

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [header, body] = dataUrl.split(",");
    if (!body) return null;
    const mime = header.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

/** Uploads a snapshot to Supabase Storage when the project is configured. Never blocks the UI. */
export async function persistEvidenceSnapshot(
  cameraId: string,
  alertId: string,
  dataUrl: string | null | undefined,
): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase || !dataUrl?.startsWith("data:")) return null;
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return null;
  const path = `${cameraId}/${alertId}/snapshot.jpg`;
  const { error } = await supabase.storage.from("evidence").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) return null;
  const { data } = supabase.storage.from("evidence").getPublicUrl(path);
  return data.publicUrl || path;
}
