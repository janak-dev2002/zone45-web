import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import { getEnv } from '../lib/env';

let _client: S3Client | undefined;

function getClient(): S3Client {
  if (!_client) {
    const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = getEnv();
    _client = new S3Client({
      endpoint: R2_ENDPOINT,
      region: 'auto',
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

const ALLOWED_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

export interface SignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  expiresInSec: number;
  method: 'PUT';
  headers: { 'Content-Type': string };
}

export async function signUploadUrl(
  contentType: string,
  sizeBytes: number,
): Promise<SignedUploadResult> {
  const { R2_BUCKET, R2_PUBLIC_BASE } = getEnv();

  const ext = ALLOWED_EXTENSIONS[contentType] ?? 'bin';
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const key = `${yyyy}/${mm}/${crypto.randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: sizeBytes,
  });

  const expiresInSec = 300;
  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn: expiresInSec });
  const publicUrl = `${R2_PUBLIC_BASE}/${key}`;

  return {
    uploadUrl,
    publicUrl,
    expiresInSec,
    method: 'PUT',
    headers: { 'Content-Type': contentType },
  };
}

// Allow extension without file name for file extension extraction only
export function extractExtension(filename: string): string {
  return path.extname(filename).replace('.', '').toLowerCase();
}
