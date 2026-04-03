const { Pool } = require('pg');

let pool;

const init = async () => {
  pool = new Pool({
    connectionString: require('../config').DATABASE_URL,
    max: 5,
  });
};

const query = (text, params) => {
  return pool.query(text, params);
};

// Seeding functions
const seedUsers = async (n) => {
  const values = [];
  for (let i = 1; i <= n; i++) {
    values.push(`('user_${i}', 'user_${i}@test.com')`);
  }
  const sql = `INSERT INTO users (username, email) VALUES ${values.join(', ')}`;
  return query(sql);
};

const seedCategories = async (n) => {
  const values = [];
  for (let i = 1; i <= n; i++) {
    values.push(`('cat_${i}')`);
  }
  const sql = `INSERT INTO categories (name) VALUES ${values.join(', ')}`;
  return query(sql);
};

const seedPosts = async (n) => {
  const userResult = await query('SELECT id FROM users ORDER BY id');
  const userIds = userResult.rows.map((r) => r.id);

  if (userIds.length === 0) {
    throw new Error('No users found. Run seedUsers first.');
  }

  const values = [];
  for (let i = 1; i <= n; i++) {
    const authorId = userIds[(i - 1) % userIds.length];
    values.push(
      `('Post ${i}', 'Content for post ${i}', ${i % 2 === 0}, ${Math.floor(Math.random() * 1000)}, ${authorId})`
    );
  }
  const sql = `INSERT INTO posts (title, content, published, views, author_id) VALUES ${values.join(', ')}`;
  return query(sql);
};

const clearTables = async () => {
  return query('TRUNCATE TABLE post_categories, posts, categories, users RESTART IDENTITY CASCADE');
};

// Pre-seed deletion targets for D2 (single delete by PK)
const seedDeleteTargets = async (count, offset = 0) => {
  const values = [];
  for (let i = 0; i < count; i++) {
    const n = offset + i;
    values.push(`('del_target_${n}', 'delete_content', false, 0, 1)`);
  }
  const sql = `INSERT INTO posts (title, content, published, views, author_id) VALUES ${values.join(', ')}`;
  const result = await query(sql + ' RETURNING id');
  return result.rows.map(r => r.id);
};

// Pre-seed deletion targets for D1 (single delete user by PK)
const seedUserDeleteTargets = async (count, offset = 0) => {
  const values = [];
  for (let i = 0; i < count; i++) {
    const n = offset + i;
    values.push(`('del_user_target_${n}', 'del_user_${n}@test.com')`);
  }
  const sql = `INSERT INTO users (username, email) VALUES ${values.join(', ')}`;
  const result = await query(sql + ' RETURNING id');
  return result.rows.map(r => r.id);
};

const close = async () => {
  if (pool) {
    await pool.end();
  }
};

// Warm up the connection pool with a simple query
const warmQuery = async () => {
  await query('SELECT 1');
};

// CRUD Operation functions for benchmark compatibility

const createUser = async (username, email) => {
  const result = await query(
    'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
    [username, email]
  );
  return result.rows[0];
};

const createPost = async (title, content, published, views, author_id) => {
  const result = await query(
    'INSERT INTO posts (title, content, published, views, author_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [title, content, published, views, author_id]
  );
  return result.rows[0];
};

const bulkInsertPosts = async (postsArray) => {
  const values = postsArray.map((p, i) => {
    const idx = i + 1;
    return `($${idx * 5 - 4}, $${idx * 5 - 3}, $${idx * 5 - 2}, $${idx * 5 - 1}, $${idx * 5})`;
  }).join(', ');
  const flatValues = postsArray.flatMap(p => [p.title, p.content, p.published, p.views, p.author_id]);
  const sql = `INSERT INTO posts (title, content, published, views, author_id) VALUES ${values} RETURNING *`;
  const result = await query(sql, flatValues);
  return result.rows;
};

const getUserById = async (id) => {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const getPostById = async (id) => {
  const result = await query('SELECT * FROM posts WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const getPaginatedPosts = async (offset, limit) => {
  const result = await query(
    'SELECT * FROM posts ORDER BY id LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return result.rows;
};

const getPostWithAuthor = async (id) => {
  const result = await query(
    `SELECT p.*, u.username as author_username, u.email as author_email
     FROM posts p
     INNER JOIN users u ON p.author_id = u.id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const createPostWithCategories = async (postData, categoryIds) => {
  const postResult = await query(
    `INSERT INTO posts (title, content, published, views, author_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [postData.title, postData.content, postData.published, postData.views, postData.author_id]
  );
  const post = postResult.rows[0];

  const categoryValues = categoryIds.map((catId, i) => {
    const idx = i + 1;
    return `($1, $${idx + 1})`;
  }).join(', ');
  await query(
    `INSERT INTO post_categories (post_id, category_id) VALUES ${categoryValues}`,
    [post.id, ...categoryIds]
  );

  return post;
};

const getPostWithCategories = async (id) => {
  const result = await query(
    `SELECT p.*, json_agg(c) as categories
     FROM posts p
     LEFT JOIN post_categories pc ON p.id = pc.post_id
     LEFT JOIN categories c ON pc.category_id = c.id
     WHERE p.id = $1
     GROUP BY p.id`,
    [id]
  );
  return result.rows[0] || null;
};

const updateUser = async (id, data) => {
  const updates = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    updates.push(`${key} = $${idx}`);
    values.push(value);
    idx++;
  }
  values.push(id);

  const result = await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
};

const updatePost = async (id, data) => {
  const updates = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    updates.push(`${key} = $${idx}`);
    values.push(value);
    idx++;
  }
  values.push(id);

  const result = await query(
    `UPDATE posts SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
};

const deleteUser = async (id) => {
  const result = await query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
};

const deletePost = async (id) => {
  const result = await query('DELETE FROM posts WHERE id = $1 RETURNING *', [id]);
  return result.rows[0] || null;
};

// D2: Bulk delete posts by author_id
const deletePostsByAuthor = async (authorId) => {
  const result = await query('DELETE FROM posts WHERE author_id = $1', [authorId]);
  return result.rowCount || 0;
};

module.exports = {
  init,
  query,
  warmQuery,
  seedUsers,
  seedCategories,
  seedPosts,
  clearTables,
  seedDeleteTargets,
  seedUserDeleteTargets,
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
  deletePostsByAuthor,
};
