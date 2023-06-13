import type { Request, Response, NextFunction } from 'express';

type Handler<T> = (
  request: Request,
  response: Response,
  next: NextFunction,
) => T;

// It kinda sucks that we have to do this but with Express, when we don't wrap
// our async request handlers, if one throws, Express won't ever notice and will
// never respond to the request or handle the error. This function wraps the
// async handler, catches errors and then sends them to Express using `next`
export function safeAsync(handler: Handler<Promise<unknown>>): Handler<void> {
  return (request, response, next) => {
    handler(request, response, next).catch(next);
  };
}
