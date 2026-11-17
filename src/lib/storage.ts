import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { UserError } from "./action";

// Uploads are stored in Netlify Blobs when running on Netlify (durable, free tier) and on local
// disk during development. Either way the app references them as /media/<name>, served by
// src/app/media/[file]/route.ts.
export const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 },
  "image/png": { ext: "png", magic: (b) => b.subarray(0, 4).toString("hex") === "89504e47" },
  "image/webp": { ext: "webp", magic: (b) => b.subarray(8, 12).toString() === "WEBP" },
  "image/gif": { ext: "gif", magic: (b) => b.subarray(0, 3).toString() === "GIF" },
  "image/avif": { ext: "avif", magic: (b) => b.subarray(4, 12).toString().startsWith("ftypavi") },
};
export const MEDIA_EXT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

/** True on Netlify (build + functions). Override with STORAGE_DRIVER=local|netlify. */
function onNetlify() {
  if (process.env.STORAGE_DRIVER) return process.env.STORAGE_DRIVER === "netlify";
  return Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT || process.env.SITE_ID);
}

async function uploadsStore() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "uploads", consistency: "strong" });
}

export async function saveImage(file: File, prefix = "img") {
  const type = TYPES[file.type];
  if (!type) throw new UserError(`Format ${file.name} tidak didukung. Gunakan JPG, PNG, WEBP, AVIF atau GIF.`);
  if (file.size > MAX_BYTES) throw new UserError(`${file.name} melebihi 8 MB.`);
  const buf = Buffer.from(await file.arrayBuffer());
  if (!type.magic(buf)) throw new UserError(`${file.name} bukan file gambar yang valid.`);
  const safePrefix = prefix.replace(/[^a-z0-9-]/gi, "").slice(0, 20) || "img";
  const name = `${safePrefix}-${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${type.ext}`;
  if (onNetlify()) {
    const store = await uploadsStore();
    const data = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    await store.set(name, data, { metadata: { contentType: file.type } });
  } else {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, name), buf);
  }
  return `/media/${name}`;
}

export function filesFrom(fd: FormData, key: string) {
  return fd.getAll(key).filter((f): f is File => typeof f === "object" && f !== null && "size" in f && f.size > 0);
}

export async function readMedia(name: string): Promise<Uint8Array | null> {
  if (!/^[a-z0-9-]+\.(jpg|png|webp|gif|avif)$/i.test(name)) return null;
  try {
    if (onNetlify()) {
      const store = await uploadsStore();
      const data = await store.get(name, { type: "arrayBuffer" });
      return data ? new Uint8Array(data) : null;
    }
    return new Uint8Array(await readFile(path.join(UPLOAD_DIR, name)));
  } catch {
    return null;
  }
}
