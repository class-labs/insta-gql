import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { extname, resolve } from 'path';

import type { Application } from 'express';

import { createId } from './support/createId';
import { sign } from './support/signature';
import { imageExtensions, imageTypes } from './support/image';

const UPLOADS_DIR = 'uploads';
const uploadsDir = resolve(__dirname, '..', UPLOADS_DIR);

export function attachRoutes(app: Application) {
  app.get('/images/:fileName', (request, response, next) => {
    const fileName = request.params.fileName ?? '';
    if (!fileName.match(/^\w+\.\w+$/)) {
      return next();
    }
    const ext = extname(fileName).slice(1);
    if (!imageExtensions.has(ext)) {
      return next();
    }
    const filePath = resolve(uploadsDir, fileName);
    const readStream = createReadStream(filePath);
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
    const fileExt = imageTypes.get(contentType);
    if (!fileExt) {
      response.status(400).send({ error: 'Bad Request' });
      return;
    }
    const id = sign(createId());
    await fs.mkdir(uploadsDir, { recursive: true });
    const fileName = id + '.' + fileExt;
    const filePath = resolve(uploadsDir, fileName);
    const fileStream = createWriteStream(filePath);
    request.on('end', () => {
      response.json({ url: `/images/${fileName}` });
    });
    request.pipe(fileStream);
  });
}
