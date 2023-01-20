export type User = {
  id: string;
  name: string;
  profilePhoto: string;
  username: string;
  password: string;
};

export type Session = {
  id: string;
  user: string;
  createdAt: string;
};

export type Post = {
  id: string;
  author: string;
  photo: string;
  caption: string;
  likedBy: Array<string>;
  comments: Array<string>;
  createdAt: string;
};

export type Comment = {
  id: string;
  post: string;
  author: string;
  text: string;
  createdAt: string;
};
