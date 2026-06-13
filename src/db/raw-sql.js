let pool;

const init = async (dbPool) => {
  pool = dbPool;
};

const close = async () => {};

const warmQuery = async () => {
  await pool.query('SELECT 1');
};

const createUser = async (username, email) => {
  const result = await pool.query(
    'INSERT INTO users (username, email) VALUES ($1, $2)',
    [username, email]
  );
  return result.rowCount;
};

const getUserById = async (id) => {
  const result = await pool.query(
    'SELECT id, username, email, created_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

const getPaginatedPosts = async (offset, limit) => {
  const result = await pool.query(
    'SELECT id, title, content, published, views, author_id, created_at FROM posts ORDER BY id LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return result.rows;
};

const getPostWithAuthor = async (id) => {
  const result = await pool.query(
    `SELECT p.id, p.title, p.content, p.published, p.views, p.author_id, p.created_at,
            u.id, u.username, u.email, u.created_at
     FROM posts p
     JOIN users u ON p.author_id = u.id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const createPostWithCategories = async (postData, categoryIds) => {
  const postResult = await pool.query(
    `INSERT INTO posts (title, content, published, views, author_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [postData.title, postData.content, postData.published, postData.views, postData.author_id]
  );
  const postId = postResult.rows[0].id;

  const categoryValues = categoryIds.map((catId, i) => {
    const idx = i + 1;
    return `($1, $${idx + 1})`;
  }).join(', ');
  await pool.query(
    `INSERT INTO post_categories (post_id, category_id) VALUES ${categoryValues}`,
    [postId, ...categoryIds]
  );
};

const getPostWithCategories = async (id) => {
  const result = await pool.query(
    `SELECT p.id, p.title, p.content, p.published, p.views, p.author_id, p.created_at,
            c.id, c.name
     FROM posts p
     JOIN post_categories pc ON p.id = pc.post_id
     JOIN categories c ON pc.category_id = c.id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows;
};

const bulkInsertPosts = async (postList) => {
  const valueClauses = [];
  const values = [];
  let idx = 1;
  for (const p of postList) {
    valueClauses.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4})`);
    values.push(p.title, p.content, p.published, p.views, p.author_id);
    idx += 5;
  }
  const result = await pool.query(
    `INSERT INTO posts (title, content, published, views, author_id) VALUES ${valueClauses.join(', ')}`,
    values
  );
  return result.rowCount;
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

  const result = await pool.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
    values
  );
  return result.rowCount;
};

const deleteUser = async (id) => {
  const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
  return result.rowCount > 0;
};

module.exports = {
  init,
  warmQuery,
  close,
  createUser,
  getUserById,
  getPaginatedPosts,
  getPostWithAuthor,
  createPostWithCategories,
  getPostWithCategories,
  bulkInsertPosts,
  updateUser,
  deleteUser,
};
