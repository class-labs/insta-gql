import SchemaBuilder from '@pothos/core';
import { db } from '../db';
import { removeNulls } from '../support/removeNulls';
import { toFullyQualifiedUrl, validateImagePath } from '../support/image';
import type { User, Session, Post, Comment } from '../types';
import { Context } from './context';

type Objects = {
  User: User;
  Post: Post;
  PostListItem: Post;
  Comment: Comment;
  Session: Session;
};

const builder = new SchemaBuilder<{ Objects: Objects; Context: Context }>({});

builder.objectType('User', {
  fields: (t) => ({
    id: t.exposeString('id', {}),
    name: t.exposeString('name', {}),
    profilePhoto: t.exposeString('profilePhoto', {}),
    username: t.exposeString('username', {}),
  }),
});

builder.objectType('Session', {
  fields: (t) => ({
    token: t.string({ resolve: (session) => session.id }),
    user: t.field({
      type: 'User',
      resolve: async (session) => {
        const user = await db.User.getById(session.user);
        if (!user) {
          throw new Error('Invalid userId in session');
        }
        return user;
      },
    }),
  }),
});

builder.objectType('PostListItem', {
  fields: (t) => ({
    id: t.exposeString('id', {}),
    author: t.field({
      type: 'User',
      resolve: async (post) => {
        const user = await db.User.getById(post.author);
        if (!user) {
          throw new Error(`Invalid userId at post(${post.id}).author`);
        }
        return user;
      },
    }),
    photo: t.string({
      resolve: (post, args, context) => {
        return toFullyQualifiedUrl(post.photo, context.host);
      },
    }),
    caption: t.exposeString('caption', {}),
    isLikedByViewer: t.boolean({
      resolve: async (post, args, context) => {
        const currentUser = await context.getCurrentUser();
        if (currentUser) {
          return post.likedBy.includes(currentUser.id);
        } else {
          return false;
        }
      },
    }),
    likeCount: t.int({
      resolve: (post) => post.likedBy.length,
    }),
    commentCount: t.int({
      resolve: (post) => post.comments.length,
    }),
    createdAt: t.exposeString('createdAt', {}),
  }),
});

builder.objectType('Post', {
  fields: (t) => ({
    id: t.exposeString('id', {}),
    author: t.field({
      type: 'User',
      resolve: async (post) => {
        const user = await db.User.getById(post.author);
        if (!user) {
          throw new Error(`Invalid userId at post(${post.id}).author`);
        }
        return user;
      },
    }),
    photo: t.string({
      resolve: (post, args, context) => {
        return toFullyQualifiedUrl(post.photo, context.host);
      },
    }),
    caption: t.exposeString('caption', {}),
    isLikedByViewer: t.boolean({
      resolve: async (post, args, context) => {
        const currentUser = await context.getCurrentUser();
        if (currentUser) {
          return post.likedBy.includes(currentUser.id);
        } else {
          return false;
        }
      },
    }),
    likeCount: t.int({
      resolve: (post) => post.likedBy.length,
    }),
    comments: t.field({
      type: ['Comment'],
      resolve: async (post) => {
        const comments: Array<Comment> = [];
        for (let commentId of post.comments) {
          const comment = await db.Comment.getById(commentId);
          if (comment) {
            comments.push(comment);
          }
        }
        return comments;
      },
    }),
    createdAt: t.exposeString('createdAt', {}),
  }),
});

builder.objectType('Comment', {
  fields: (t) => ({
    id: t.exposeString('id', {}),
    author: t.field({
      type: 'User',
      resolve: async (comment) => {
        const user = await db.User.getById(comment.author);
        if (!user) {
          throw new Error(`Invalid userId at comment(${comment.id}).author`);
        }
        return user;
      },
    }),
    text: t.exposeString('text', {}),
    createdAt: t.exposeString('createdAt', {}),
  }),
});

const UserCreateInput = builder.inputType('UserCreateInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    profilePhoto: t.string({ required: true }),
    username: t.string({ required: true }),
    password: t.string({ required: true }),
  }),
});

const UserUpdateInput = builder.inputType('UserUpdateInput', {
  fields: (t) => ({
    name: t.string(),
    profilePhoto: t.string(),
    username: t.string(),
    password: t.string(),
  }),
});

const PostCreateInput = builder.inputType('PostCreateInput', {
  fields: (t) => ({
    photo: t.string({ required: true }),
    caption: t.string({ required: true }),
  }),
});

const CommentCreateInput = builder.inputType('CommentCreateInput', {
  fields: (t) => ({
    postId: t.string({ required: true }),
    text: t.string({ required: true }),
  }),
});

builder.queryType({
  fields: (t) => ({
    postCount: t.int({
      resolve: async () => {
        const posts = await db.Post.getAll();
        return posts.length;
      },
    }),

    posts: t.field({
      type: ['PostListItem'],
      args: {
        postedBy: t.arg.string(),
      },
      resolve: async (parent, { postedBy }) => {
        let posts: Array<Post>;
        if (postedBy == null) {
          posts = await db.Post.getAll();
        } else {
          posts = await db.Post.findWhere((post) => post.author === postedBy);
        }
        posts.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        return posts;
      },
    }),

    post: t.field({
      type: 'Post',
      nullable: true,
      args: {
        id: t.arg.string({ required: true }),
      },
      resolve: async (parent, { id }) => {
        return await db.Post.getById(id);
      },
    }),

    users: t.field({
      type: ['User'],
      resolve: async () => {
        return await db.User.getAll();
      },
    }),

    user: t.field({
      type: 'User',
      nullable: true,
      args: {
        id: t.arg.string({ required: true }),
      },
      resolve: async (parent, { id }) => {
        return await db.User.getById(id);
      },
    }),

    me: t.field({
      type: 'User',
      nullable: true,
      resolve: async (parent, args, context) => {
        return await context.getCurrentUser();
      },
    }),
  }),
});

builder.mutationType({
  fields: (t) => ({
    login: t.field({
      type: 'Session',
      nullable: true,
      args: {
        username: t.arg.string({ required: true }),
        password: t.arg.string({ required: true }),
      },
      resolve: async (parent, args) => {
        const { username, password } = args;
        const [user] = await db.User.findWhere(
          (user) =>
            user.username.toLowerCase() === username.toLowerCase() &&
            user.password === password,
        );
        if (!user) {
          return null;
        }
        const session = await db.Session.insert({
          user: user.id,
          createdAt: new Date().toISOString(),
        });
        return session;
      },
    }),

    logout: t.field({
      type: 'Boolean',
      nullable: true,
      resolve: async (parent, args, context) => {
        const session = await context.getSession();
        if (session) {
          await db.Session.delete(session.id);
          return true;
        } else {
          return false;
        }
      },
    }),

    createUser: t.field({
      type: 'User',
      args: {
        input: t.arg({ type: UserCreateInput, required: true }),
      },
      resolve: async (parent, args) => {
        const { name, profilePhoto, username, password } = args.input;
        if (!username.length || username.match(/\W/)) {
          throw new Error('Invalid username');
        }
        const existingUsers = await db.User.findWhere(
          (user) => user.username.toLowerCase() === username.toLowerCase(),
        );
        if (existingUsers.length) {
          throw new Error('Username already exists');
        }
        return await db.User.insert({
          name,
          profilePhoto,
          username,
          password,
        });
      },
    }),

    updateUser: t.field({
      type: 'User',
      args: {
        input: t.arg({ type: UserUpdateInput, required: true }),
      },
      resolve: async (parent, args, context) => {
        const user = await context.authenticate();
        const userId = user.id;
        const updates = removeNulls(args.input);
        const { username } = updates;
        if (username !== undefined) {
          if (!username.length || username.match(/\W/)) {
            throw new Error('Invalid username');
          }
          const existingUsers = await db.User.findWhere(
            (user) =>
              user.id !== userId &&
              user.username.toLowerCase() === username.toLowerCase(),
          );
          if (existingUsers.length) {
            throw new Error('Username already exists');
          }
        }
        const newUser = await db.User.update(user.id, updates);
        return newUser ?? user;
      },
    }),

    createPost: t.field({
      type: 'Post',
      args: {
        input: t.arg({ type: PostCreateInput, required: true }),
      },
      resolve: async (parent, args, context) => {
        const user = await context.authenticate();
        const { photo, caption } = args.input;
        if (!validateImagePath(photo)) {
          throw new Error('Invalid photo');
        }
        const post = await db.Post.insert({
          author: user.id,
          photo,
          caption,
          likedBy: [],
          comments: [],
          createdAt: new Date().toISOString(),
        });
        return post;
      },
    }),

    deletePost: t.field({
      type: 'Boolean',
      args: {
        postId: t.arg.string({ required: true }),
      },
      resolve: async (parent, args, context) => {
        const user = await context.authenticate();
        const { postId } = args;
        const post = await db.Post.getById(postId);
        if (!post) {
          throw new Error('Invalid postId');
        }
        if (post.author !== user.id) {
          throw new Error('Permission denied');
        }
        await db.Post.delete(post.id);
        return true;
      },
    }),

    createComment: t.field({
      type: 'Comment',
      args: {
        input: t.arg({ type: CommentCreateInput, required: true }),
      },
      resolve: async (parent, args, context) => {
        const user = await context.authenticate();
        const { postId, text } = args.input;
        const post = await db.Post.getById(postId);
        if (!post) {
          throw new Error('Invalid postId');
        }
        const comment = await db.Comment.insert({
          post: post.id,
          author: user.id,
          text,
          createdAt: new Date().toISOString(),
        });
        const newCommentList = [...post.comments, comment.id];
        await db.Post.update(post.id, { comments: newCommentList });
        return comment;
      },
    }),

    deleteComment: t.field({
      type: 'Boolean',
      args: {
        commentId: t.arg.string({ required: true }),
      },
      resolve: async (parent, args, context) => {
        const user = await context.authenticate();
        const { commentId } = args;
        const comment = await db.Comment.getById(commentId);
        if (!comment) {
          throw new Error('Invalid commentId');
        }
        const postId = comment.post;
        const post = await db.Post.getById(postId);
        if (!post) {
          throw new Error('Comment does not belong to any known post');
        }
        if (comment.author !== user.id && post.author !== user.id) {
          throw new Error('Permission denied');
        }
        const newCommentList = post.comments.filter((id) => id !== comment.id);
        await db.Post.update(post.id, { comments: newCommentList });
        await db.Comment.delete(comment.id);
        return true;
      },
    }),

    likePost: t.field({
      type: 'Post',
      args: {
        postId: t.arg.string({ required: true }),
      },
      resolve: async (parent, { postId }, context) => {
        const user = await context.authenticate();
        const post = await db.Post.getById(postId);
        if (!post) {
          throw new Error('Invalid postId');
        }
        const likedBy = new Set(post.likedBy);
        if (likedBy.has(user.id)) {
          likedBy.delete(user.id);
        } else {
          likedBy.add(user.id);
        }
        const newPost = await db.Post.update(postId, {
          likedBy: Array.from(likedBy),
        });
        return newPost ?? post;
      },
    }),
  }),
});

export const schema = builder.toSchema();
