const { pgTable, serial, varchar, text, boolean, integer, timestamp, primaryKey } = require('drizzle-orm/pg-core');
const { eq } = require('drizzle-orm');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  created_at: timestamp('created_at').defaultNow(),
});

const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content'),
  published: boolean('published').default(false),
  views: integer('views').default(0),
  author_id: integer('author_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow(),
});

const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
});

const postCategories = pgTable('post_categories', {
  postId: integer('post_id').references(() => posts.id).notNull(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.postId, t.categoryId] }),
}));

const schema = { users, posts, categories, postCategories };

let client;
let db;

const init = () => {
  client = postgres(require('../config').DATABASE_URL);
  db = drizzle(client, { schema });
  return { db, client };
};

const close = async () => {
  if (client) {
    await client.end();
  }
};

const createUser = async (username, email) => {
  const result = await db.insert(users).values({ username, email }).returning();
  return result[0];
};

const createPost = async (title, content, published, views, author_id) => {
  const result = await db.insert(posts).values({ title, content, published, views, author_id }).returning();
  return result[0];
};

const bulkInsertPosts = (postsArray) => {
  return db.insert(posts).values(postsArray);
};

const getUserById = (id) => {
  return db.select().from(users).where(eq(users.id, id)).limit(1).then(res => res.length > 0 ? res[0] : null);
};

const getPostById = (id) => {
  return db.select().from(posts).where(eq(posts.id, id)).limit(1);
};

const getPaginatedPosts = (offset, limit) => {
  return db.select().from(posts).orderBy(posts.id).limit(limit).offset(offset);
};

const getPostWithAuthor = (id) => {
  return db
    .select()
    .from(posts)
    .innerJoin(users, eq(posts.author_id, users.id))
    .where(eq(posts.id, id));
};

const createPostWithCategories = async (postData, categoryIds) => {
  const [newPost] = await db.insert(posts).values(postData).returning();
  const values = categoryIds.map((categoryId) => ({ postId: newPost.id, categoryId }));
  await db.insert(postCategories).values(values);
  return newPost;
};

const getPostWithCategories = (id) => {
  return db
    .select()
    .from(posts)
    .innerJoin(postCategories, eq(posts.id, postCategories.postId))
    .innerJoin(categories, eq(postCategories.categoryId, categories.id))
    .where(eq(posts.id, id));
};

const updateUser = async (id, data) => {
  const result = await db.update(users).set(data).where(eq(users.id, id)).returning();
  return result[0];
};

const updatePost = async (id, data) => {
  const result = await db.update(posts).set(data).where(eq(posts.id, id)).returning();
  return result[0];
};

const deleteUser = async (id) => {
  const result = await db.delete(users).where(eq(users.id, id)).returning();
  return result[0] || null;
};

const deletePost = async (id) => {
  const result = await db.delete(posts).where(eq(posts.id, id)).returning();
  return result[0] || null;
};

module.exports = {
  init,
  close,
  createUser,
  createPost,
  bulkInsertPosts,
  getUserById,
  getPostById,
  getPaginatedPosts,
  getPostWithAuthor,
  createPostWithCategories,
  getPostWithCategories,
  updateUser,
  updatePost,
  deleteUser,
  deletePost,
  users,
  posts,
  categories,
  postCategories,
};
