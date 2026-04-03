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

const rawSql = require('./db/raw-sql');
const prisma = require('./db/prisma');
const typeorm = require('./db/typeorm');
const sequelizeDb = require('./db/sequelize');
const drizzleDb = require('./db/drizzle');

const FRAMEWORKS = {
  rawsql: { module: rawSql, init: () => rawSql.init(), warmQuery: () => rawSql.warmQuery(), close: () => rawSql.close() },
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
  await rawSql.query('TRUNCATE TABLE post_categories, posts, categories, users RESTART IDENTITY CASCADE');
}

async function fastSeedCategories(n) {
  const values = [];
  for (let i = 1; i <= n; i++) {
    values.push(`('cat_${i}')`);
  }
  await rawSql.query(`INSERT INTO categories (name) VALUES ${values.join(', ')}`);
}

async function fastSeedUsers(n) {
  // generate_series() — single query, no string building for 100k rows
  await rawSql.query(
    `INSERT INTO users (username, email)
     SELECT 'user_' || i, 'user_' || i || '@test.com'
     FROM generate_series(1, $1) AS i`,
    [n]
  );
}

async function fastSeedPosts(n) {
  // Insert n posts with round-robin author_id across all users
  // $1 = number of users, $2 = number of posts
  const userRes = await rawSql.query('SELECT COUNT(*) FROM users');
  const userCount = parseInt(userRes.rows[0].count);

  await rawSql.query(
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
  const res = await rawSql.query('SELECT COALESCE(MAX(id), 1) as last_id FROM users');
  return { userId: parseInt(res.rows[0].last_id) || 1 };
}

// ─── Pre-seed delete targets using generate_series() ─────────────────────────

async function seedDeleteTargetsFast(count, offset = 0) {
  const result = await rawSql.query(
    `INSERT INTO posts (title, content, published, views, author_id)
     SELECT
       'del_target_' || ($2 + i),
       'delete_content',
       false,
       0,
       1
     FROM generate_series(1, $1) AS i
     RETURNING id`,
    [count, offset]
  );
  return result.rows.map(r => r.id);
}

async function seedUserDeleteTargetsFast(count, offset = 0) {
  const result = await rawSql.query(
    `INSERT INTO users (username, email)
     SELECT
       'del_user_' || ($2 + i),
       'del_user_' || ($2 + i) || '@test.com'
     FROM generate_series(1, $1) AS i
     RETURNING id`,
    [count, offset]
  );
  return result.rows.map(r => r.id);
}

// ─── Define each operation per framework (IDENTICAL to benchmark.js) ─────────

const OPERATIONS = {
  C1: {
    name: 'Create User',
    run: (db, ctx) => db.createUser(`u_${ctx.iter}`, `u_${ctx.iter}@test.com`),
  },
  C2: {
    name: 'Create Post',
    run: (db, ctx) => db.createPost(`Post ${ctx.globalIter}`, `Content ${ctx.globalIter}`, false, 0, ctx.userId),
  },
  C3: {
    name: 'Bulk Insert Posts (10)',
    run: (db, ctx) => {
      const posts = Array.from({ length: 10 }, (_, i) => ({
        title: `Bulk_${ctx.globalIter}_${i}`, content: `Bulk ${ctx.globalIter}`, published: false, views: 0, author_id: ctx.userId,
      }));
      return db.bulkInsertPosts(posts);
    },
  },
  R1: {
    name: 'Get User By ID',
    run: (db, ctx) => db.getUserById(ctx.userId),
  },
  R2: {
    name: 'Get Post By ID',
    run: (db, ctx) => db.getPostById(ctx.postId),
  },
  R3: {
    name: 'Get Paginated Posts',
    run: (db, ctx) => db.getPaginatedPosts(ctx.offset, 20),
  },
  U1: {
    name: 'Update User',
    run: (db, ctx) => db.updateUser(ctx.userId, { email: `updated_${ctx.iter}@test.com` }),
  },
  U2: {
    name: 'Update Post',
    run: (db, ctx) => db.updatePost(ctx.postId, { title: `Updated Title`, views: 999 }),
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
  D2: {
    name: 'Bulk Delete Posts by Author',
    destructive: true,
    run: (db, ctx) => db.deletePostsByAuthor(ctx.userId),
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
  M2: {
    name: 'Get Post With Categories',
    run: (db, ctx) => db.getPostWithCategories(ctx.postId),
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
    const catRes = await rawSql.query('SELECT id FROM categories ORDER BY id');
    baseCtx.categoryIds = catRes.rows.slice(0, 3).map(r => parseInt(r.id));
    baseCtx.offset = 0;
    const firstPost = await rawSql.query('SELECT COALESCE(MIN(id), 1) as id FROM posts');
    baseCtx.postId = parseInt(firstPost.rows[0].id) || 1;
    console.log(`  Seeded in ${((Date.now() - seedStart) / 1000).toFixed(1)}s`);

    // Pre-seed unique delete targets
    console.log('  Seeding delete targets...');
    const numFrameworks = Object.keys(FRAMEWORKS).length;
    baseCtx.deleteUserIdLists = [];
    baseCtx.deletePostIdLists = [];
    for (let fw = 0; fw < numFrameworks; fw++) {
      const offset = fw * size.iterations;
      baseCtx.deleteUserIdLists.push(
        await seedUserDeleteTargetsFast(size.iterations, offset)
      );
      baseCtx.deletePostIdLists.push(
        await seedDeleteTargetsFast(size.iterations, offset)
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
            const deletePostIds = baseCtx.deletePostIdLists[warmFwIdx] || [];
            const warmGlobalIter = warmFwIdx * 3 + warmIdx;
            try {
              await op.run(fw.module, {
                ...baseCtx,
                deleteUserIds,
                deletePostIds,
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
          const postIds = await seedDeleteTargetsFast(size.iterations, offset);
          const userIds = await seedUserDeleteTargetsFast(size.iterations, offset);
          baseCtx.deleteUserIdLists[fw] = userIds;
          baseCtx.deletePostIdLists[fw] = postIds;
        }

        // Re-lookup base context IDs
        const res = await rawSql.query('SELECT COALESCE(MAX(id), 1) as last_id FROM users');
        baseCtx.userId = parseInt(res.rows[0].last_id) || 1;
        const fp = await rawSql.query('SELECT COALESCE(MIN(id), 1) as id FROM posts');
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
        const deletePostIds = baseCtx.deletePostIdLists[fwIdx] || [];

        const fwCtx = {
          ...baseCtx,
          deleteUserIds,
          deletePostIds,
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
          const postIds = await seedDeleteTargetsFast(size.iterations, offset);
          const userIds = await seedUserDeleteTargetsFast(size.iterations, offset);
          baseCtx.deleteUserIdLists[fw] = userIds;
          baseCtx.deletePostIdLists[fw] = postIds;
        }

        // Re-lookup base context IDs
        const res = await rawSql.query('SELECT COALESCE(MAX(id), 1) as last_id FROM users');
        baseCtx.userId = parseInt(res.rows[0].last_id) || 1;
        const fp = await rawSql.query('SELECT COALESCE(MIN(id), 1) as id FROM posts');
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

  const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\nBenchmark complete. Total time: ${elapsed}s`);
}

runAll().catch(err => {
  console.error(err);
  process.exit(1);
});
