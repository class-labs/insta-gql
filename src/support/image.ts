const imageProxyUrl = process.env.IMAGE_PROXY;

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
