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

const warmQuery = async () => {
  await db.execute('SELECT 1');
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
  return db.select().from(posts).where(eq(posts.id, id)).limit(1).then(res => res.length > 0 ? res[0] : null);
};

const getPaginatedPosts = (offset, limit) => {
  return db.select().from(posts).orderBy(posts.id).limit(limit).offset(offset);
};

const getPostWithAuthor = async (id) => {
  const result = await db
    .select()
    .from(posts)
    .innerJoin(users, eq(posts.author_id, users.id))
    .where(eq(posts.id, id));

  // Return single object or null (like other ORMs), not array
  return result.length > 0 ? result[0] : null;
};

const createPostWithCategories = async (postData, categoryIds) => {
  const [newPost] = await db.insert(posts).values(postData).returning();
  const values = categoryIds.map((categoryId) => ({ postId: newPost.id, categoryId }));
  await db.insert(postCategories).values(values);
  return newPost;
};

const getPostWithCategories = async (id) => {
  const result = await db
    .select()
    .from(posts)
    .leftJoin(postCategories, eq(posts.id, postCategories.postId))
    .leftJoin(categories, eq(postCategories.categoryId, categories.id))
    .where(eq(posts.id, id));

  if (result.length === 0) return null;

  // Aggregate: one post with all its categories (like rawsql's json_agg)
  const post = result[0].posts;
  post.categories = result.map(r => r.categories);
  return post;
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

// D2: Bulk delete posts by author_id
const deletePostsByAuthor = async (authorId) => {
  // Remove .returning() to avoid fetching all deleted rows (overhead at large scale)
  // Drizzle returns { count } property without .returning()
  const result = await db.delete(posts).where(eq(posts.author_id, authorId));
  return result.count || 0;
};

module.exports = {
  init,
  close,
  warmQuery,
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
  deletePostsByAuthor,
  users,
  posts,
  categories,
  postCategories,
};
