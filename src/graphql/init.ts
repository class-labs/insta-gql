import expressPlayground from 'graphql-playground-middleware-express';
import { createYoga } from 'graphql-yoga';
import type { Application } from 'express';

import { schema } from './schema';
import { createContext } from './context';

export function initGraphQL(app: Application) {
  const server = createYoga({
    schema,
    graphiql: false,
    context: ({ request }) => createContext(request),
  });
  app.use('/graphql', server);
  app.get('/playground', expressPlayground({ endpoint: '/graphql' }));
}
