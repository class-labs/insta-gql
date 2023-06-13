import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { extname, resolve } from 'path';

import type { Application } from 'express';

import { createTimestamp } from './support/timestamp';
import { createId } from './support/createId';
import { sign } from './support/signature';
import { imageByType, validateImageFileName } from './support/image';

const UPLOADS_DIR = 'uploads';
const uploadsDir = resolve(__dirname, '..', UPLOADS_DIR);

export function attachRoutes(app: Application) {
  app.get('/images/:fileName', (request, response, next) => {
    const fileName = request.params.fileName ?? '';
    // Note: We don't verify the signature here because in cases where the
    // signing key is not specified in the environment variable, it will change
    // each time the server starts.
    const imageDetails = validateImageFileName(fileName, {
      verifySignature: false,
    });
    if (!imageDetails) {
      return next();
    }
    const filePath = resolve(uploadsDir, fileName);
    const readStream = createReadStream(filePath);
    readStream.once('data', () => {
      response.header('Content-Type', imageDetails.type);
    });
    readStream.on('error', (error) => {
      if (Object(error).code === 'ENOENT') {
        next();
      } else {
        next(error);
      }
    });
    readStream.pipe(response);
  });

  app.post('/images', async (request, response) => {
    const contentType =
      request.header('content-disposition') ??
      request.header('content-type') ??
      '';
    const imageType = imageByType.get(contentType);
    if (!imageType) {
      response.status(400).send({ error: 'Bad Request' });
      return;
    }
    const id = sign(createTimestamp() + createId() + imageType.id);
    await fs.mkdir(uploadsDir, { recursive: true });
    const fileName = id + '.' + imageType.ext;
    const filePath = resolve(uploadsDir, fileName);
    const fileStream = createWriteStream(filePath);
    request.on('end', () => {
      response.json({ url: `/images/${fileName}` });
    });
    request.pipe(fileStream);
  });
}
