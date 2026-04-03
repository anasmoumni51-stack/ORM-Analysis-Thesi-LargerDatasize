const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createUser(username, email) {
  return prisma.users.create({ data: { username, email } });
}

async function createPost(title, content, published, views, author_id) {
  return prisma.posts.create({
    data: { title, content, published, views, authorId: author_id },
  });
}

async function bulkInsertPosts(postsData) {
  const prismaPosts = postsData.map(p => ({
    title: p.title, content: p.content, published: p.published,
    views: p.views, authorId: p.author_id,
  }));
  return prisma.posts.createMany({ data: prismaPosts });
}

async function getUserById(id) {
  return prisma.users.findUnique({ where: { id } });
}

async function getPostById(id) {
  return prisma.posts.findUnique({ where: { id } });
}

async function getPaginatedPosts(offset, limit) {
  return prisma.posts.findMany({
    skip: offset, take: limit, orderBy: { id: 'asc' },
  });
}

async function getPostWithAuthor(id) {
  return prisma.posts.findUnique({
    where: { id }, include: { author: true },
  });
}

async function createPostWithCategories(postData, categoryIds) {
  return prisma.posts.create({
    data: {
      title: postData.title,
      content: postData.content,
      published: postData.published,
      views: postData.views,
      authorId: postData.author_id,
      categories: { connect: categoryIds.map((id) => ({ id })) },
    },
  });
}

async function getPostWithCategories(id) {
  return prisma.posts.findUnique({
    where: { id }, include: { categories: true },
  });
}

async function updateUser(id, data) {
  return prisma.users.update({ where: { id }, data });
}

async function updatePost(id, data) {
  return prisma.posts.update({ where: { id }, data });
}

async function deleteUser(id) {
  return prisma.users.delete({ where: { id } });
}

async function deletePost(id) {
  return prisma.posts.delete({ where: { id } });
}

async function close() {
  await prisma.$disconnect();
}

module.exports = {
  prisma, createUser, createPost, bulkInsertPosts,
  getUserById, getPostById, getPaginatedPosts,
  getPostWithAuthor, createPostWithCategories, getPostWithCategories,
  updateUser, updatePost, deleteUser, deletePost, close,
};
const { EntitySchema, DataSource } = require('typeorm');
const { DATABASE_URL } = require('../config');

const UserSchema = new EntitySchema({
  name: 'users', target: 'users', tableName: 'users',
  columns: {
    id: { type: Number, primary: true, generated: true },
    username: { type: 'varchar', length: 50, unique: true },
    email: { type: 'varchar', length: 100, unique: true },
    created_at: { type: 'timestamp', createDate: true },
  },
  relations: {
    posts: { target: 'posts', type: 'one-to-many', inverseSide: 'author' },
  },
});

const PostSchema = new EntitySchema({
  name: 'posts', target: 'posts', tableName: 'posts',
  columns: {
    id: { type: Number, primary: true, generated: true },
    title: { type: 'varchar', length: 200 },
    content: { type: 'text', nullable: true },
    published: { type: 'boolean', default: false },
    views: { type: 'int', default: 0 },
    author_id: { type: 'int' },
    created_at: { type: 'timestamp', createDate: true },
  },
  relations: {
    author: { target: 'users', type: 'many-to-one', joinColumn: { name: 'author_id' } },
    categories: { target: 'categories', type: 'many-to-many', joinTable: { name: 'post_categories', joinColumns: [{ name: 'post_id' }], inverseJoinColumns: [{ name: 'category_id' }] } },
  },
});

const CategorySchema = new EntitySchema({
  name: 'categories', target: 'categories', tableName: 'categories',
  columns: {
    id: { type: Number, primary: true, generated: true },
    name: { type: 'varchar', length: 50, unique: true },
  },
  relations: {
    posts: { target: 'posts', type: 'many-to-many', inverseSide: 'categories', joinTable: { name: 'post_categories', joinColumns: [{ name: 'category_id' }], inverseJoinColumns: [{ name: 'post_id' }] } },
  },
});

const dataSource = new DataSource({
  type: 'postgres', url: DATABASE_URL, synchronize: false, logging: false,
  entities: [UserSchema, PostSchema, CategorySchema],
});

async function init() { await dataSource.initialize(); }

async function close() { await dataSource.destroy(); }

async function createUser(username, email) {
  return dataSource.getRepository('users').save({ username, email });
}

async function createPost(title, content, published, views, author_id) {
  return dataSource.getRepository('posts').save({ title, content, published, views, author_id });
}

async function bulkInsertPosts(postsData) {
  const repo = dataSource.getRepository('posts');
  return repo.save(postsData);
}

async function getUserById(id) {
  return dataSource.getRepository('users').findOneBy({ id });
}

async function getPostById(id) {
  return dataSource.getRepository('posts').findOneBy({ id });
}

async function getPaginatedPosts(offset, limit) {
  return dataSource.getRepository('posts').find({ skip: offset, take: limit, order: { id: 'ASC' } });
}

async function getPostWithAuthor(id) {
  return dataSource.getRepository('posts').createQueryBuilder('p').leftJoinAndSelect('p.author', 'u').where('p.id = :id', { id }).getOne();
}

async function createPostWithCategories(postData, categoryIds) {
  const postRepo = dataSource.getRepository('posts');
  const catRepo = dataSource.getRepository('categories');
  const post = await postRepo.save(postData);
  const cats = await catRepo.findByIds(categoryIds);
  post.categories = cats;
  return postRepo.save(post);
}

async function getPostWithCategories(id) {
  return dataSource.getRepository('posts').createQueryBuilder('p').leftJoinAndSelect('p.categories', 'c').where('p.id = :id', { id }).getOne();
}

async function updateUser(id, data) {
  const repo = dataSource.getRepository('users');
  await repo.update(id, data);
  return repo.findOneBy({ id });
}

async function updatePost(id, data) {
  const repo = dataSource.getRepository('posts');
  await repo.update(id, data);
  return repo.findOneBy({ id });
}

async function deleteUser(id) {
  const repo = dataSource.getRepository('users');
  const user = await repo.findOneBy({ id });
  return repo.remove(user);
}

async function deletePost(id) {
  const repo = dataSource.getRepository('posts');
  const post = await repo.findOneBy({ id });
  return repo.remove(post);
}

module.exports = { init, close, createUser, createPost, bulkInsertPosts, getUserById, getPostById, getPaginatedPosts, getPostWithAuthor, createPostWithCategories, getPostWithCategories, updateUser, updatePost, deleteUser, deletePost };
const { Sequelize, DataTypes } = require('sequelize');

const DATABASE_URL = 'postgresql://benchmark:benchmark@localhost:5432/benchmark';

let sequelize;
let User, Post, Category, PostCategory;

async function init() {
  if (sequelize) return sequelize;

  sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
  });

  await sequelize.authenticate();

  User = sequelize.define('users', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, { tableName: 'users', timestamps: false });

  Post = sequelize.define('posts', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: true },
    published: { type: DataTypes.BOOLEAN, defaultValue: false },
    views: { type: DataTypes.INTEGER, defaultValue: 0 },
    author_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, { tableName: 'posts', timestamps: false });

  Category = sequelize.define('categories', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
  }, { tableName: 'categories', timestamps: false });

  PostCategory = sequelize.define('post_categories', {
    post_id: { type: DataTypes.INTEGER, primaryKey: true },
    category_id: { type: DataTypes.INTEGER, primaryKey: true },
  }, { tableName: 'post_categories', timestamps: false });

  User.hasMany(Post, { foreignKey: 'author_id' });
  Post.belongsTo(User, { foreignKey: 'author_id' });
  Post.belongsToMany(Category, { through: PostCategory, foreignKey: 'post_id', otherKey: 'category_id' });
  Category.belongsToMany(Post, { through: PostCategory, foreignKey: 'category_id', otherKey: 'post_id' });

  return sequelize;
}

async function close() {
  if (sequelize) await sequelize.close();
}

async function createUser(username, email) {
  return User.create({ username, email });
}

async function createPost(title, content, published, views, author_id) {
  return Post.create({ title, content, published, views, author_id });
}

async function bulkInsertPosts(postsArray) {
  return Post.bulkCreate(postsArray);
}

async function getUserById(id) {
  return User.findByPk(id);
}

async function getPostById(id) {
  return Post.findByPk(id);
}

async function getPaginatedPosts(offset, limit) {
  return Post.findAll({ offset, limit, order: [['id', 'ASC']] });
}

async function getPostWithAuthor(id) {
  return Post.findByPk(id, { include: [{ model: User }] });
}

async function createPostWithCategories(postData, categoryIds) {
  const post = await Post.create(postData);
  await post.setCategories(categoryIds);
  return post;
}

async function getPostWithCategories(id) {
  return Post.findByPk(id, { include: [{ model: Category }] });
}

async function updateUser(id, data) {
  const user = await User.findByPk(id);
  if (!user) return null;
  await user.update(data);
  return user;
}

async function updatePost(id, data) {
  const post = await Post.findByPk(id);
  if (!post) return null;
  await post.update(data);
  return post;
}

async function deleteUser(id) {
  const user = await User.findByPk(id);
  if (!user) return false;
  await user.destroy();
  return true;
}

async function deletePost(id) {
  const post = await Post.findByPk(id);
  if (!post) return false;
  await post.destroy();
  return true;
}

module.exports = { init, close, createUser, createPost, bulkInsertPosts, getUserById, getPostById, getPaginatedPosts, getPostWithAuthor, createPostWithCategories, getPostWithCategories, updateUser, updatePost, deleteUser, deletePost };
const { pgTable, serial, varchar, text, boolean, integer, timestamp, primaryKey } = require('drizzle-orm/pg-core');
const { drizzle, eq } = require('drizzle-orm');
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
  client = postgres('postgresql://benchmark:benchmark@localhost:5432/benchmark');
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
  return db.select().from(users).where(eq(users.id, id)).limit(1);
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
