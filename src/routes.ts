import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { resolve } from 'path';

import type { Application } from 'express';

import { createId } from './support/createId';

const UPLOADS_DIR = 'uploads';

export function attachRoutes(app: Application) {
  app.get('/images/:fileName', (request, response, next) => {
    const fileName = request.params.fileName ?? '';
    if (!fileName.match(/^\w+\.jpg$/)) {
      return next();
    }
    const uploadsDir = resolve(__dirname, '..', UPLOADS_DIR);
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
    const uploadsDir = resolve(__dirname, '..', UPLOADS_DIR);
    await fs.mkdir(uploadsDir, { recursive: true });
    const fileName = createId() + '.jpg';
    const filePath = resolve(uploadsDir, fileName);
    const fileStream = createWriteStream(filePath);
    request.on('end', () => {
      response.json({ url: `/images/${fileName}` });
    });
    request.pipe(fileStream);
  });
}
