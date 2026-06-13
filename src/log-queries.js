#!/usr/bin/env node
/**
 * log-queries.js — Captures the actual SQL each ORM generates for the 7 benchmark operations.
 *
 * Usage: QUERY_LOG=true node --expose-gc src/log-queries.js
 *
 * Output: results/query-log.md — a markdown comparison table.
 */

process.env.QUERY_LOG = 'true';

require('ts-node/register');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const queryLogger = require('./query-logger');
queryLogger.enable();
const config = require('./config');
const pool = new Pool({ connectionString: config.DATABASE_URL, max: 10 });

// Monkey-patch pool.query to log raw SQL queries
const originalPoolQuery = pool.query.bind(pool);
pool.query = async (text, params) => {
  if (queryLogger.isEnabled()) {
    queryLogger.log('rawsql', text, params || []);
  }
  return originalPoolQuery(text, params);
};

const rawSql = require('./db/raw-sql');
const prisma = require('./db/prisma');
const typeorm = require('./db/typeorm');
const sequelizeDb = require('./db/sequelize');
const drizzleDb = require('./db/drizzle');

const FRAMEWORKS = {
  rawsql:  { module: rawSql,      init: () => rawSql.init(pool),   close: () => rawSql.close() },
  prisma:  { module: prisma,      init: () => prisma.init(),       close: () => prisma.close() },
  typeorm: { module: typeorm,     init: () => typeorm.init(),      close: () => typeorm.close() },
  sequelize: { module: sequelizeDb, init: () => sequelizeDb.init(), close: () => sequelizeDb.close() },
  drizzle: { module: drizzleDb,   init: () => drizzleDb.init(),    close: () => drizzleDb.close() },
};

const OP_NAMES = ['C1', 'C3', 'R1', 'R3', 'U1', 'D1', 'J1', 'M1'];

async function seedMinimalData() {
  // Clear and seed minimal data via raw SQL (fast, single connection)
  await pool.query('TRUNCATE TABLE post_categories, posts, categories, users RESTART IDENTITY CASCADE');

  // 5 users
  await pool.query(
    `INSERT INTO users (username, email)
     SELECT 'user_' || i, 'user_' || i || '@test.com'
     FROM generate_series(1, 5) AS i`
  );

  // 5 categories
  const catValues = [];
  for (let i = 1; i <= 5; i++) catValues.push(`('cat_${i}')`);
  await pool.query(`INSERT INTO categories (name) VALUES ${catValues.join(', ')}`);

  // 10 posts (2 per user, for R3/J1/D1 testing)
  await pool.query(
    `INSERT INTO posts (title, content, published, views, author_id)
     SELECT 'Post ' || i, 'Content ' || i, (i % 2 = 0), i * 10, ((i - 1) % 5) + 1
     FROM generate_series(1, 10) AS i`
  );

  // Link posts 1-3 to categories 1-2 (for M1 prerequisite data)
  await pool.query(
    `INSERT INTO post_categories (post_id, category_id) VALUES (1, 1), (1, 2), (2, 1)`
  );
}

async function runOperationsForFramework(fwName, fw) {
  const m = fw.module;
  const results = {};

  // C1 — Create User (unique username per framework)
  queryLogger.clear();
  await m.createUser(`test_user_C1_${fwName}`, `c1_${fwName}@test.com`);
  results.C1 = queryLogger.getAndClear();

  // C3 — Bulk Insert Posts (10 posts via native bulk method)
  queryLogger.clear();
  const bulkPosts = Array.from({ length: 10 }, (_, i) => ({
    title: `bulk_post_${i}`,
    content: `Bulk content ${i}`,
    published: false,
    views: 0,
    author_id: 1,
  }));
  await m.bulkInsertPosts(bulkPosts);
  results.C3 = queryLogger.getAndClear();

  // R1 — Get User By ID
  queryLogger.clear();
  await m.getUserById(1);
  results.R1 = queryLogger.getAndClear();

  // R3 — Paginated Posts (offset 0, limit 20)
  queryLogger.clear();
  await m.getPaginatedPosts(0, 20);
  results.R3 = queryLogger.getAndClear();

  // U1 — Update User email
  queryLogger.clear();
  await m.updateUser(2, { email: 'updated@test.com' });
  results.U1 = queryLogger.getAndClear();

  // D1 — Delete User (user 5, which has posts → tests ON DELETE CASCADE)
  queryLogger.clear();
  await m.deleteUser(5);
  results.D1 = queryLogger.getAndClear();

  // J1 — Post with Author (JOIN)
  queryLogger.clear();
  await m.getPostWithAuthor(1);
  results.J1 = queryLogger.getAndClear();

  // M1 — Create Post with Categories (M2M, 3 categories)
  queryLogger.clear();
  await m.createPostWithCategories(
    { title: 'M1 Test', content: 'M1 content', published: true, views: 0, author_id: 3 },
    [1, 2, 3]
  );
  results.M1 = queryLogger.getAndClear();

  return results;
}

function formatSql(sql) {
  // Collapse whitespace for compact display
  return sql.replace(/\s+/g, ' ').trim();
}

function buildMarkdown(allResults) {
  const lines = [];
  lines.push('# Generated SQL Comparison');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('This report shows the actual SQL each ORM generates for the 7 benchmark operations.');
  lines.push('');

  // One section per operation
  for (const op of OP_NAMES) {
    lines.push(`## ${op}`);
    lines.push('');
    lines.push('| Framework | Query # | SQL |');
    lines.push('|-----------|---------|-----|');

    for (const fwName of Object.keys(FRAMEWORKS)) {
      const queries = allResults[fwName]?.[op] || [];
      if (queries.length === 0) {
        lines.push(`| ${fwName} | — | _(no queries logged)_ |`);
      } else {
        for (let i = 0; i < queries.length; i++) {
          const q = queries[i];
          const sql = formatSql(q.sql);
          const params = q.params && q.params.length > 0 ? ` -- params: ${JSON.stringify(q.params)}` : '';
          lines.push(`| ${fwName === 'rawsql' ? 'raw-sql' : fwName} | ${i + 1} | \`${sql}\`${params} |`);
        }
      }
    }
    lines.push('');
  }

  // Summary: query counts per framework per operation
  lines.push('## Summary: Query Count per Operation');
  lines.push('');
  const header = `| Framework | ${OP_NAMES.join(' | ')} |`;
  const sep = `|-----------|${OP_NAMES.map(() => '---').join('|')}|`;
  lines.push(header);
  lines.push(sep);

  for (const fwName of Object.keys(FRAMEWORKS)) {
    const counts = OP_NAMES.map(op => {
      const queries = allResults[fwName]?.[op] || [];
      return queries.length || '—';
    });
    lines.push(`| ${fwName === 'rawsql' ? 'raw-sql' : fwName} | ${counts.join(' ')} |`);
  }
  lines.push('');

  return lines.join('\n');
}

async function main() {
  console.log('=== SQL Query Logger ===');
  console.log(`Database: ${config.DATABASE_URL}`);
  console.log('');

  console.log('Seeding minimal test data...');
  await seedMinimalData();

  const allResults = {};

  // Init rawSql with pool
  await rawSql.init(pool);

  for (const [fwName, fw] of Object.entries(FRAMEWORKS)) {
    console.log(`\nRunning operations for: ${fwName}`);

    if (fwName !== 'rawsql') {
      await fw.init();
    }

    // Re-seed before each framework (D1 deletes user 5, M1 creates posts)
    await seedMinimalData();

    queryLogger.clear();
    try {
      allResults[fwName] = await runOperationsForFramework(fwName, fw);
      const totalQueries = Object.values(allResults[fwName]).reduce((sum, q) => sum + q.length, 0);
      console.log(`  → ${totalQueries} queries captured`);
    } catch (err) {
      console.error(`  ✗ Error in ${fwName}: ${err.message}`);
      allResults[fwName] = {};
    }

    if (fwName !== 'rawsql') {
      await fw.close();
    }
  }

  await pool.end();

  // Write report
  const report = buildMarkdown(allResults);
  const outDir = path.join(__dirname, '..', 'results');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'query-log.md');
  fs.writeFileSync(outPath, report);
  console.log(`\nReport written to: ${outPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
