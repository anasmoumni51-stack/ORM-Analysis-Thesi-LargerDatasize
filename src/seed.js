async function seedUsers(pool, n) {
  const values = [];
  for (let i = 1; i <= n; i++) {
    values.push(`('user_${i}', 'user_${i}@test.com')`);
  }
  return pool.query(`INSERT INTO users (username, email) VALUES ${values.join(', ')}`);
}

async function seedCategories(pool, n) {
  const values = [];
  for (let i = 1; i <= n; i++) {
    values.push(`('cat_${i}')`);
  }
  return pool.query(`INSERT INTO categories (name) VALUES ${values.join(', ')}`);
}

async function seedPosts(pool, n) {
  const userResult = await pool.query('SELECT id FROM users ORDER BY id');
  const userIds = userResult.rows.map((r) => r.id);
  if (userIds.length === 0) throw new Error('No users found. Run seedUsers first.');

  const values = [];
  for (let i = 1; i <= n; i++) {
    const authorId = userIds[(i - 1) % userIds.length];
    values.push(
      `('Post ${i}', 'Content for post ${i}', ${i % 2 === 0}, ${Math.floor(Math.random() * 1000)}, ${authorId})`
    );
  }
  return pool.query(`INSERT INTO posts (title, content, published, views, author_id) VALUES ${values.join(', ')}`);
}

async function clearTables(pool) {
  return pool.query('TRUNCATE TABLE post_categories, posts, categories, users RESTART IDENTITY CASCADE');
}

async function seedUserDeleteTargets(pool, count, offset = 0) {
  const values = [];
  for (let i = 0; i < count; i++) {
    const n = offset + i;
    values.push(`('del_user_target_${n}', 'del_user_${n}@test.com')`);
  }
  const sql = `INSERT INTO users (username, email) VALUES ${values.join(', ')}`;
  const result = await pool.query(sql + ' RETURNING id');
  return result.rows.map(r => r.id);
}

module.exports = { seedUsers, seedCategories, seedPosts, clearTables, seedUserDeleteTargets };
