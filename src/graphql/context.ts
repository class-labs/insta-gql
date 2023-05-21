import { db } from '../db';
import type { User, Session } from '../types';

export type Context = {
  host: string;
  getSession: () => Promise<Session | null>;
  getCurrentUser: () => Promise<User | null>;
  authenticate: () => Promise<User>;
};

export function createContext(request: Request) {
  const host = request.headers.get('Host') || '0.0.0.0';
  const context: Context = {
    host,
    getSession: async () => {
      const authHeader = request.headers.get('Authorization') ?? '';
      const sessionId = authHeader.replace(/^Bearer /i, '');
      return await db.Session.getById(sessionId);
    },
    getCurrentUser: async () => {
      const session = await context.getSession();
      return await db.User.getById(session?.user ?? '');
    },
    authenticate: async () => {
      const user = await context.getCurrentUser();
      if (!user) {
        throw new Error('Not authenticated');
      }
      return user;
    },
  };
  return context;
}
