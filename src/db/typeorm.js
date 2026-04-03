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
    categories: { target: 'categories', type: 'many-to-many', cascade: true, joinTable: { name: 'post_categories', joinColumn: { name: 'post_id' }, inverseJoinColumn: { name: 'category_id' } } },
  },
});

const CategorySchema = new EntitySchema({
  name: 'categories', target: 'categories', tableName: 'categories',
  columns: {
    id: { type: Number, primary: true, generated: true },
    name: { type: 'varchar', length: 50, unique: true },
  },
  relations: {
    posts: { target: 'posts', type: 'many-to-many', inverseSide: 'categories' },
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
