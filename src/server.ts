import expressPlayground from 'graphql-playground-middleware-express';
import { createYoga } from 'graphql-yoga';
import type { Application } from 'express';

import { schema } from './graphql/schema';
import { attachRoutes } from './routes';
import { createContext } from './graphql/context';

export function attachHandlers(app: Application) {
  app.disable('x-powered-by');
  attachRoutes(app);
  const server = createYoga({
    schema,
    graphiql: false,
    context: ({ request }) => createContext(request),
  });
  app.use('/graphql', server);
  app.get('/playground', expressPlayground({ endpoint: '/graphql' }));
}
