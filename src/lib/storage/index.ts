import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b2Client, B2_BUCKET } from "./b2-client";

// ─── Upload ─────────────────────────────────────────────────────────────────

interface UploadOpts {
  key: string;
  body: Buffer | Uint8Array | ReadableStream | Blob;
  contentType: string;
  metadata?: Record<string, string>;
}

export async function uploadFile(opts: UploadOpts): Promise<{ key: string; url: string }> {
  await b2Client.send(
    new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: opts.key,
      Body: opts.body as Buffer,
      ContentType: opts.contentType,
      Metadata: opts.metadata,
    }),
  );
  // Return a permanent reference key — callers generate signed URLs when needed
  return { key: opts.key, url: await getFileSignedUrl({ key: opts.key }) };
}

// ─── Signed URL ─────────────────────────────────────────────────────────────

interface SignedUrlOpts {
  key: string;
  expiresIn?: number; // seconds, default 1 hour
}

export async function getFileSignedUrl(opts: SignedUrlOpts): Promise<string> {
  return getSignedUrl(
    b2Client,
    new GetObjectCommand({ Bucket: B2_BUCKET, Key: opts.key }),
    { expiresIn: opts.expiresIn ?? 3600 },
  );
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteFile(key: string): Promise<void> {
  await b2Client.send(
    new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: key }),
  );
}

// ─── Head (metadata) ────────────────────────────────────────────────────────

interface FileMetadata {
  size: number;
  contentType: string;
  lastModified: Date;
}

export async function getFileMetadata(key: string): Promise<FileMetadata | null> {
  try {
    const res = await b2Client.send(
      new HeadObjectCommand({ Bucket: B2_BUCKET, Key: key }),
    );
    return {
      size: res.ContentLength ?? 0,
      contentType: res.ContentType ?? "application/octet-stream",
      lastModified: res.LastModified ?? new Date(),
    };
  } catch {
    return null;
  }
}

// ─── List ───────────────────────────────────────────────────────────────────

interface ListOpts {
  prefix: string;
  maxKeys?: number;
}

interface ListEntry {
  key: string;
  size: number;
  lastModified: Date;
}

export async function listFiles(opts: ListOpts): Promise<ListEntry[]> {
  const res = await b2Client.send(
    new ListObjectsV2Command({
      Bucket: B2_BUCKET,
      Prefix: opts.prefix,
      MaxKeys: opts.maxKeys ?? 1000,
    }),
  );
  return (res.Contents ?? []).map((obj) => ({
    key: obj.Key ?? "",
    size: obj.Size ?? 0,
    lastModified: obj.LastModified ?? new Date(),
  }));
}
