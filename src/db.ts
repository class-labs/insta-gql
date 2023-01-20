import { fromSchema, Model } from './support/orm';
import { User, Session, Post, Comment } from './types';

export const db = fromSchema({
  User: Model<User>(),
  Session: Model<Session>(),
  Post: Model<Post>(),
  Comment: Model<Comment>(),
});
