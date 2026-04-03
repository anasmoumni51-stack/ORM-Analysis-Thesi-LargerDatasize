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

async function warmQuery() {
  await dataSource.query('SELECT 1');
}

async function createUser(username, email) {
  return dataSource.getRepository('users').save({ username, email });
}

async function createPost(title, content, published, views, author_id) {
  return dataSource.getRepository('posts').save({ title, content, published, views, author_id });
}

async function bulkInsertPosts(postsData) {
  const repo = dataSource.getRepository('posts');
  // Use insert() instead of save() to ensure a single bulk INSERT query
  // save() may execute N individual INSERTs or trigger entity lifecycle overhead
  return repo.insert(postsData);
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
  return dataSource.getRepository('posts').createQueryBuilder('p').innerJoinAndSelect('p.author', 'u').where('p.id = :id', { id }).getOne();
}

async function createPostWithCategories(postData, categoryIds) {
  const postRepo = dataSource.getRepository('posts');
  // Save post first
  const post = await postRepo.save(postData);
  // Attach categories by ID reference — no need to fetch them from DB
  // This reduces 3 queries (save post + findByIds + save relations) to 2 (save post + save relations)
  post.categories = categoryIds.map((id) => ({ id }));
  return postRepo.save(post);
}

async function getPostWithCategories(id) {
  return dataSource.getRepository('posts').createQueryBuilder('p').leftJoinAndSelect('p.categories', 'c').where('p.id = :id', { id }).getOne();
}

async function updateUser(id, data) {
  await dataSource.getRepository('users').update(id, data);
}

async function updatePost(id, data) {
  const repo = dataSource.getRepository('posts');
  await repo.update(id, data);
}

async function deleteUser(id) {
  const result = await dataSource.getRepository('users').delete(id);
  return (result.affected ?? 0) > 0;
}

async function deletePost(id) {
  const result = await dataSource.getRepository('posts').delete(id);
  return (result.affected ?? 0) > 0;
}

// D2: Bulk delete posts by author_id
async function deletePostsByAuthor(authorId) {
  const result = await dataSource.getRepository('posts').delete({ author_id: authorId });
  return result.affected ?? 0;
}

module.exports = { init, close, warmQuery, createUser, createPost, bulkInsertPosts, getUserById, getPostById, getPaginatedPosts, getPostWithAuthor, createPostWithCategories, getPostWithCategories, updateUser, updatePost, deleteUser, deletePost, deletePostsByAuthor };
