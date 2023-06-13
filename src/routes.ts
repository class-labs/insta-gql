import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { resolve } from 'path';

import type { Application } from 'express';

import { createTimestamp } from './support/timestamp';
import { createId } from './support/createId';
import { sign } from './support/signature';
import { imageByType, validateImageFileName } from './support/image';
import { pipeStreamAsync } from './support/pipeStreamAsync';
import { safeAsync } from './support/safeAsync';

const UPLOADS_DIR = 'uploads';
const uploadsDir = resolve(__dirname, '..', UPLOADS_DIR);

export function attachRoutes(app: Application) {
  app.get(
    '/images/:fileName',
    safeAsync(async (request, response, next) => {
      const fileName = request.params.fileName ?? '';
      const imageDetails = validateImageFileName(fileName);
      if (!imageDetails) {
        return next();
      }
      const filePath = resolve(uploadsDir, fileName);
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return next();
      }
      response.header('Content-Type', imageDetails.type);
      const readStream = createReadStream(filePath);
      await pipeStreamAsync(readStream, response);
    }),
  );

  app.post(
    '/images',
    safeAsync(async (request, response) => {
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
      const writeStream = createWriteStream(filePath);
      await pipeStreamAsync(request, writeStream);
      response.json({ url: `/images/${fileName}` });
    }),
  );
}
