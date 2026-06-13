/**
 * benchmark-fast.js — High-speed version using PostgreSQL generate_series() for seeding.
 *
 * Seeding speedup:
 *   - Users:  INSERT ... SELECT from generate_series()  (20-50x faster)
 *   - Posts:   INSERT ... SELECT from generate_series()  (20-50x faster)
 *   - Categories: bulk INSERT VALUES                    (unchanged, already fast)
 *
 * Measurement logic is IDENTICAL to benchmark.js — same ops, same GC, same stats.
 * Only the seeding and re-seeding functions change.
 */

const fs = require('fs');
const path = require('path');
const { DATASET_SIZES } = require('./config');
const { computeStats, computeOverhead } = require('./stats');

require('ts-node/register');
const { Pool } = require('pg');
const { DATABASE_URL } = require('./config');
const pool = new Pool({ connectionString: DATABASE_URL, max: 10 });

const rawSql = require('./db/raw-sql');
const prisma = require('./db/prisma');
const typeorm = require('./db/typeorm');
const sequelizeDb = require('./db/sequelize');
const drizzleDb = require('./db/drizzle');

const FRAMEWORKS = {
  rawsql: { module: rawSql, init: () => rawSql.init(pool), warmQuery: () => rawSql.warmQuery(), close: () => rawSql.close() },
  prisma: { module: prisma, init: () => prisma.init(), warmQuery: () => prisma.warmQuery(), close: () => prisma.close() },
  typeorm: { module: typeorm, init: () => typeorm.init(), warmQuery: () => typeorm.warmQuery(), close: () => typeorm.close() },
  sequelize: { module: sequelizeDb, init: () => sequelizeDb.init(), warmQuery: () => sequelizeDb.warmQuery(), close: () => sequelizeDb.close() },
  drizzle: { module: drizzleDb, init: () => drizzleDb.init(), warmQuery: () => drizzleDb.warmQuery(), close: () => drizzleDb.close() },
};

function gcAndPause() {
  if (global.gc) global.gc();
  return new Promise(r => setTimeout(r, 50));
}

async function benchmark(fn, iterations) {
  const timings = [];
  const memories = [];

  for (let i = 0; i < iterations; i++) {
    await gcAndPause();
    const start = process.hrtime.bigint();
    await fn(i);
    const end = process.hrtime.bigint();
    timings.push(Number(end - start) / 1e6);
    memories.push(process.memoryUsage().heapUsed / (1024 * 1024));
  }

  return { timings, memories };
}

// ─── FAST SEEDING using generate_series() ────────────────────────────────────

async function fastClearTables() {
  await pool.query('TRUNCATE TABLE post_categories, posts, categories, users RESTART IDENTITY CASCADE');
}

async function fastSeedCategories(n) {
  const values = [];
  for (let i = 1; i <= n; i++) {
    values.push(`('cat_${i}')`);
  }
  await pool.query(`INSERT INTO categories (name) VALUES ${values.join(', ')}`);
}

async function fastSeedUsers(n) {
  // generate_series() — single query, no string building for 100k rows
  await pool.query(
    `INSERT INTO users (username, email)
     SELECT 'user_' || i, 'user_' || i || '@test.com'
     FROM generate_series(1, $1) AS i`,
    [n]
  );
}

async function fastSeedPosts(n) {
  // Insert n posts with round-robin author_id across all users
  // $1 = number of users, $2 = number of posts
  const userRes = await pool.query('SELECT COUNT(*) FROM users');
  const userCount = parseInt(userRes.rows[0].count);

  await pool.query(
    `INSERT INTO posts (title, content, published, views, author_id)
     SELECT
       'Post ' || i,
       'Content for post ' || i,
       (i % 2 = 0),
       floor(random() * 1000)::int,
       ((i - 1) % $1) + 1
     FROM generate_series(1, $2) AS i`,
    [userCount, n]
  );
}

async function fastSeed(size) {
  await fastClearTables();
  await fastSeedCategories(size.categories);
  await fastSeedUsers(size.users);
  await fastSeedPosts(size.posts);
}

async function seedRawFast(size) {
  await fastSeed(size);
  const res = await pool.query('SELECT COALESCE(MAX(id), 1) as last_id FROM users');
  return { userId: parseInt(res.rows[0].last_id) || 1 };
}

// ─── Pre-seed delete targets for D1 using generate_series() ──────────────────
// Creates users WITH posts so ON DELETE CASCADE fires on deleteUser()

async function seedUserDeleteTargetsFast(count, offset = 0) {
  const userResult = await pool.query(
    `INSERT INTO users (username, email)
     SELECT
       'del_user_' || ($2 + i),
       'del_user_' || ($2 + i) || '@test.com'
     FROM generate_series(1, $1) AS i
     RETURNING id`,
    [count, offset]
  );
  const userIds = userResult.rows.map(r => parseInt(r.id));

  // Create 5 posts per user so cascade has work to do
  const values = [];
  for (const userId of userIds) {
    for (let p = 1; p <= 5; p++) {
      values.push(`('cascade_post', 'cascade_content', false, 0, ${userId})`);
    }
  }
  if (values.length > 0) {
    await pool.query(`INSERT INTO posts (title, content, published, views, author_id) VALUES ${values.join(', ')}`);
  }

  return userIds;
}

// ─── Define each operation per framework (7 thesis operations) ───────────────

const OPERATIONS = {
  C1: {
    name: 'Create User',
    run: (db, ctx) => db.createUser(`u_${ctx.iter}`, `u_${ctx.iter}@test.com`),
  },
  C3: {
    name: 'Bulk Insert Posts',
    run: (db, ctx) => {
      const posts = Array.from({ length: 10 }, (_, i) => ({
        title: `bulk_${ctx.globalIter}_${i}`,
        content: `Bulk content ${i}`,
        published: false,
        views: 0,
        author_id: ctx.userId,
      }));
      return db.bulkInsertPosts(posts);
    },
  },
  R1: {
    name: 'Get User By ID',
    run: (db, ctx) => db.getUserById(ctx.userId),
  },
  R3: {
    name: 'Get Paginated Posts',
    run: (db, ctx) => db.getPaginatedPosts(ctx.offset, 20),
  },
  U1: {
    name: 'Update User',
    run: (db, ctx) => db.updateUser(ctx.userId, { email: `updated_${ctx.iter}@test.com` }),
  },
  D1: {
    name: 'Delete User',
    destructive: true,
    run: (db, ctx) => {
      const ids = ctx.deleteUserIds;
      const id = ids[ctx.iter];
      return db.deleteUser(id);
    },
  },
  J1: {
    name: 'Get Post With Author',
    run: (db, ctx) => db.getPostWithAuthor(ctx.postId),
  },
  M1: {
    name: 'Create Post With Categories',
    run: (db, ctx) => db.createPostWithCategories(
      { title: `CatPost_${ctx.globalIter}`, content: `Cat content`, published: false, views: 0, author_id: ctx.userId },
      ctx.categoryIds
    ),
  },
};

// ─── Main runner ─────────────────────────────────────────────────────────────

async function runAll() {
  const resultsDir = path.join(__dirname, '..', 'results');
  fs.mkdirSync(resultsDir, { recursive: true });

  // Initialize all frameworks
  for (const [name] of Object.entries(FRAMEWORKS)) {
    process.stdout.write(`Initializing ${name}... `);
    await FRAMEWORKS[name].init();
    process.stdout.write('done\n');
  }

  // Warm up connection pools
  for (const [name, fw] of Object.entries(FRAMEWORKS)) {
    process.stdout.write(`Warming ${name}... `);
    await fw.warmQuery();
    process.stdout.write('done\n');
  }

  const t0 = Date.now();

  for (const size of DATASET_SIZES) {
    console.log(`\n=== Dataset Size: ${size.label} ===`);
    const sizeResults = {};

    // Fast seed via generate_series()
    const seedStart = Date.now();
    console.log(`Seeding ${size.label} rows (generate_series)...`);
    const baseCtx = await seedRawFast(size);
    const catRes = await pool.query('SELECT id FROM categories ORDER BY id');
    baseCtx.categoryIds = catRes.rows.slice(0, 3).map(r => parseInt(r.id));
    baseCtx.offset = 0;
    const firstPost = await pool.query('SELECT COALESCE(MIN(id), 1) as id FROM posts');
    baseCtx.postId = parseInt(firstPost.rows[0].id) || 1;
    console.log(`  Seeded in ${((Date.now() - seedStart) / 1000).toFixed(1)}s`);

    // Pre-seed unique delete targets
    console.log('  Seeding delete targets...');
    const numFrameworks = Object.keys(FRAMEWORKS).length;
    baseCtx.deleteUserIdLists = [];
    for (let fw = 0; fw < numFrameworks; fw++) {
      const offset = fw * size.iterations;
      baseCtx.deleteUserIdLists.push(
        await seedUserDeleteTargetsFast(size.iterations, offset)
      );
    }

    // Benchmark: each operation on each framework
    for (const [opId, op] of Object.entries(OPERATIONS)) {
      console.log(`  Benchmarking ${opId}: ${op.name}...`);
      sizeResults[opId] = {};

      // Warmup: 3 iterations per framework (skip for destructive ops)
      if (!op.destructive) {
        console.log(`    Warming up ${opId}...`);
        for (let warmIdx = 0; warmIdx < 3; warmIdx++) {
          let warmFwIdx = 0;
          for (const [fwName] of Object.entries(FRAMEWORKS)) {
            const fw = FRAMEWORKS[fwName];
            const deleteUserIds = baseCtx.deleteUserIdLists[warmFwIdx] || [];
            const warmGlobalIter = warmFwIdx * 3 + warmIdx;
            try {
              await op.run(fw.module, {
                ...baseCtx,
                deleteUserIds,
                iter: warmIdx,
                globalIter: warmGlobalIter,
              });
            } catch (err) {
              // Silently ignore warmup errors
            }
            warmFwIdx++;
          }
        }

        // Re-seed after warmup for create/update operations
        await fastClearTables();
        await fastSeedCategories(size.categories);
        await fastSeedUsers(size.users);
        await fastSeedPosts(size.posts);

        // Re-seed delete targets for all frameworks
        for (let fw = 0; fw < numFrameworks; fw++) {
          const offset = fw * size.iterations;
          const userIds = await seedUserDeleteTargetsFast(size.iterations, offset);
          baseCtx.deleteUserIdLists[fw] = userIds;
        }

        // Re-lookup base context IDs
        const res = await pool.query('SELECT COALESCE(MAX(id), 1) as last_id FROM users');
        baseCtx.userId = parseInt(res.rows[0].last_id) || 1;
        const fp = await pool.query('SELECT COALESCE(MIN(id), 1) as id FROM posts');
        baseCtx.postId = parseInt(fp.rows[0].id) || 1;
      }

      let fwIdx = 0;
      let globalIter = 0;

      for (const [fwName] of Object.entries(FRAMEWORKS)) {
        const fw = FRAMEWORKS[fwName];

        // Warm this framework's connection after re-seed
        await fw.warmQuery();

        // Get per-framework pre-seeded delete targets
        const deleteUserIds = baseCtx.deleteUserIdLists[fwIdx] || [];

        const fwCtx = {
          ...baseCtx,
          deleteUserIds,
        };
        const thisGlobalIter = globalIter;

        try {
          const result = await benchmark(
            (iter) => op.run(fw.module, { ...fwCtx, iter, globalIter: thisGlobalIter + iter }),
            size.iterations
          );
          const stats = computeStats(result.timings);
          const memStats = computeStats(result.memories);

          sizeResults[fwName] = sizeResults[fwName] || {};
          sizeResults[fwName][opId] = {
            stats: { ...stats },
            memoryStats: { ...memStats },
          };
        } catch (err) {
          console.error(`    ERROR ${fwName} ${opId}: ${err.message}`);
        }

        // Re-seed DB after each framework
        console.log(`    Re-seeding database...`);
        await fastClearTables();
        await fastSeedCategories(size.categories);
        await fastSeedUsers(size.users);
        await fastSeedPosts(size.posts);

        // Re-seed delete targets for all remaining frameworks
        for (let fw = 0; fw < numFrameworks; fw++) {
          const offset = fw * size.iterations;
          const userIds = await seedUserDeleteTargetsFast(size.iterations, offset);
          baseCtx.deleteUserIdLists[fw] = userIds;
        }

        // Re-lookup base context IDs
        const res = await pool.query('SELECT COALESCE(MAX(id), 1) as last_id FROM users');
        baseCtx.userId = parseInt(res.rows[0].last_id) || 1;
        const fp = await pool.query('SELECT COALESCE(MIN(id), 1) as id FROM posts');
        baseCtx.postId = parseInt(fp.rows[0].id) || 1;

        globalIter += size.iterations;
        fwIdx++;
      }
    }

    // Compute overhead vs raw SQL
    const rawResults = sizeResults.rawsql || {};
    for (const fwName of Object.keys(FRAMEWORKS)) {
      if (fwName === 'rawsql') continue;
      const fwResults = sizeResults[fwName];
      if (!fwResults) continue;
      fwResults.overhead = {};
      for (const opId of Object.keys(OPERATIONS)) {
        if (!rawResults[opId] || !fwResults[opId]) continue;
        fwResults.overhead[opId] = computeOverhead(
          fwResults[opId].stats.mean,
          rawResults[opId].stats.mean
        );
      }
    }

    // Save results
    const outFile = path.join(resultsDir, `results-${size.label}.json`);
    fs.writeFileSync(outFile, JSON.stringify(sizeResults, null, 2));
    console.log(`  Saved ${outFile}`);
    console.log(`  Size completed in ${((Date.now() - t0) / 1000).toFixed(0)}s total`);
  }

  // Close all frameworks
  for (const [fwName] of Object.entries(FRAMEWORKS)) {
    await FRAMEWORKS[fwName].close();
  }
  await pool.end();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\nBenchmark complete. Total time: ${elapsed}s`);
}

runAll().catch(err => {
  console.error(err);
  process.exit(1);
});
