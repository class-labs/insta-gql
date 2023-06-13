import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { resolve } from 'path';

import type { Application } from 'express';
import fetch from 'node-fetch';
import { Record, String } from 'runtypes';

import { createTimestamp } from '../support/timestamp';
import { createId } from '../support/createId';
import { sign } from '../support/signature';
import { imageByType, validateImageFileName } from '../support/image';
import { pipeStreamAsync } from '../support/pipeStreamAsync';
import { safeAsync } from '../support/safeAsync';
import { IMAGE_UPLOAD_URL, SECRET_KEY } from '../support/constants';

const UPLOADS_DIR = 'uploads';
const uploadsDir = resolve(__dirname, '..', UPLOADS_DIR);

const UploadResponseBody = Record({
  id: String,
  fileName: String,
  url: String,
});

export default (app: Application) => {
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

      if (IMAGE_UPLOAD_URL) {
        const response = await fetch(IMAGE_UPLOAD_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': contentType,
            Authorization: `Bearer ${SECRET_KEY}`,
          },
          body: request.body,
        });
        if (!response.ok) {
          throw new Error(
            `Unexpected response status from upstream server: ${response.status}`,
          );
        }
        const result = await response.json();
        if (!UploadResponseBody.guard(result)) {
          throw new Error(`Unexpected response body from upstream server`);
        }
        return result;
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
};
