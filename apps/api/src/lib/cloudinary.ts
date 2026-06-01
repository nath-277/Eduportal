import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config.js';

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  if (
    config.cloudinaryCloudName &&
    config.cloudinaryApiKey &&
    config.cloudinaryApiSecret
  ) {
    cloudinary.config({
      cloud_name: config.cloudinaryCloudName,
      api_key: config.cloudinaryApiKey,
      api_secret: config.cloudinaryApiSecret,
      secure: true,
    });
    configured = true;
  }
}

export function isCloudinaryConfigured(): boolean {
  ensureConfigured();
  return configured;
}

export interface UploadResult {
  url: string;
  publicId: string;
  bytes: number;
}

export async function uploadBase64(
  dataUri: string,
  folder = 'eduportal'
): Promise<UploadResult> {
  ensureConfigured();
  if (!configured) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env'
    );
  }
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: 'auto',
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
  };
}

export async function deleteAsset(publicId: string): Promise<void> {
  ensureConfigured();
  if (!configured) return;
  await cloudinary.uploader.destroy(publicId, { invalidate: true });
}

export function signedDownloadUrl(publicId: string, expiresInSeconds = 3600): string {
  ensureConfigured();
  if (!configured) return '';
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return cloudinary.url(publicId, {
    sign_url: true,
    type: 'authenticated',
    expires_at: expiresAt,
    secure: true,
  });
}
