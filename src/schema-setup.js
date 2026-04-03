const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function setupDB(dbName) {
  const pool = new Pool({
    connectionString: `postgresql://postgres:thesis2026@localhost:5432/${dbName}`,
    ssl: false,
  });

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  await pool.query('DROP TABLE IF EXISTS post_categories, "_PostToCategory", posts, categories, users CASCADE');
  await pool.query(sql);

  console.log(`Schema created successfully for ${dbName}`);
  await pool.end();
}

async function setup() {
  await setupDB('orm_benchmark');
  
  // also setup test database
  const rootPool = new Pool({
    connectionString: 'postgresql://postgres:thesis2026@localhost:5432/postgres',
    ssl: false,
  });
  
  try {
    await rootPool.query('CREATE DATABASE orm_benchmark_test');
    console.log('Created orm_benchmark_test database');
  } catch (e) {
    // Ignore if exists
  }
  await rootPool.end();
  
  await setupDB('orm_benchmark_test');
}

setup().catch(err => {
  console.error(err);
  process.exit(1);
});
