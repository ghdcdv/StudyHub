import "server-only";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requiredEnv, optionalEnv } from "@/lib/env";

let r2Client: S3Client | null = null;

export function r2(): S3Client {
  if (!r2Client) {
    const accountId = requiredEnv("CLOUDFLARE_R2_ACCOUNT_ID");
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: requiredEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
      }
    });
  }

  return r2Client;
}

export function bucket(): string {
  return requiredEnv("CLOUDFLARE_R2_BUCKET");
}

export function publicUrlForKey(key: string): string | null {
  const base = optionalEnv("CLOUDFLARE_R2_PUBLIC_URL");
  return base ? `${base.replace(/\/$/, "")}/${key}` : null;
}

export async function putObject({
  key,
  body,
  contentType
}: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  await r2().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType
    })
  );
}

export async function signedUploadUrl({
  key,
  contentType
}: {
  key: string;
  contentType: string;
}): Promise<string> {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType
    }),
    { expiresIn: 60 * 10 }
  );
}

export async function signedDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(
    r2(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key
    }),
    { expiresIn: 60 * 10 }
  );
}
