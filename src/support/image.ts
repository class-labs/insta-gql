import { verify } from './signature';

const imageProxyUrl = process.env.IMAGE_PROXY;

const supportedImageTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export const imageTypes = new Map(Object.entries(supportedImageTypes));
export const imageExtensions = new Set(Object.values(supportedImageTypes));

export function validateImagePath(url: string) {
  const match = url.match(/^\/images\/(\w+\.\w+)$/);
  if (!match) {
    return false;
  }
  const fileName = match[1] ?? '';
  const [id = '', ext = ''] = fileName.split('.');
  if (!imageExtensions.has(ext)) {
    return false;
  }
  return verify(id);
}

export function toFullyQualifiedUrl(imageUrl: string, host: string) {
  // If it's already a fully qualified URL then return as is
  if (!imageUrl.startsWith('/')) {
    return imageUrl;
  }
  if (imageProxyUrl) {
    const fileName = imageUrl.replace(/^\/images\//, '');
    return imageProxyUrl.replace('%FILE_NAME%', fileName);
  }
  return 'https://' + host + imageUrl;
}
