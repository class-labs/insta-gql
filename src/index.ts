import './env';

import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { attachHandlers } from './server';

const PORT = 3000;

const app = express();
app.use(cors());

attachHandlers(app);

app.get('/', (request, response) => {
  response.send(
    `<p>Open to the <a href="/playground">GraphQL Playground</a></p>`,
  );
});

app.use((request, response) => {
  response.status(404).json({ error: 'Not Found' });
});

app.use(
  (err: unknown, request: Request, response: Response, _next: NextFunction) => {
    const error = err instanceof Error ? err : new Error(String(err));
    // eslint-disable-next-line no-console
    console.error(error);
    const status: unknown = Object(err).status;
    response
      .status(typeof status === 'number' ? status : 500)
      .json({ error: String(error) });
  },
);

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
