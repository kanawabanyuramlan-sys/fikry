import { readMedia, MEDIA_EXT_TYPES } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const buf = await readMedia(file);
  if (!buf) return new Response("Not found", { status: 404 });
  const ext = file.split(".").pop()!.toLowerCase();
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": MEDIA_EXT_TYPES[ext] ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
