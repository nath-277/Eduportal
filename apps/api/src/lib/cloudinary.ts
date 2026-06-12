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
  folder = 'eduportal',
  fileName?: string
): Promise<UploadResult> {
  ensureConfigured();
  if (!configured) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env'
    );
  }

  const options: Record<string, unknown> = {
    folder,
    resource_type: 'auto',
  };

  if (fileName) {
    const lastDot = fileName.lastIndexOf('.');
    const baseName = lastDot !== -1 ? fileName.substring(0, lastDot) : fileName;
    const extension = lastDot !== -1 ? fileName.substring(lastDot + 1) : '';

    const cleanBaseName = baseName
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 80);

    if (extension) {
      options.public_id = `${cleanBaseName}_${Date.now()}.${extension.toLowerCase()}`;
    } else {
      options.public_id = `${cleanBaseName}_${Date.now()}`;
    }
  }

  const result = await cloudinary.uploader.upload(dataUri, options);
  return {
    url: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
  };
}

function getCloudinaryResourceType(mimeTypeOrExtension?: string): 'image' | 'raw' | 'video' {
  if (!mimeTypeOrExtension) return 'image';

  const lower = mimeTypeOrExtension.toLowerCase();

  if (!lower.includes('/')) {
    if (lower === 'pdf') return 'image';
    if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'ogg'].includes(lower)) return 'video';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(lower)) return 'image';
    return 'raw';
  }

  if (lower === 'application/pdf') return 'image';
  if (lower.startsWith('image/')) return 'image';
  if (lower.startsWith('video/') || lower.startsWith('audio/')) return 'video';
  return 'raw';
}

export async function deleteAsset(publicId: string, mimeTypeOrExtension?: string): Promise<void> {
  ensureConfigured();
  if (!configured) return;
  const resourceType = getCloudinaryResourceType(mimeTypeOrExtension);
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
}

export function signedDownloadUrl(publicId: string, mimeTypeOrExtension?: string): string {
  ensureConfigured();
  if (!configured) return '';
  const resourceType = getCloudinaryResourceType(mimeTypeOrExtension);
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    flags: 'attachment',
    secure: true,
  });
}
