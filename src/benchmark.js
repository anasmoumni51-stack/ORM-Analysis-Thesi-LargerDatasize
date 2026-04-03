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
  rawsql: { module: rawSql, init: () => rawSql.init(), close: () => rawSql.close() },
  prisma: { module: prisma, init: () => prisma.init(), close: () => prisma.close() },
  typeorm: { module: typeorm, init: () => typeorm.init(), close: () => typeorm.close() },
  sequelize: { module: sequelizeDb, init: () => sequelizeDb.init(), close: () => sequelizeDb.close() },
  drizzle: { module: drizzleDb, init: () => drizzleDb.init(), close: () => drizzleDb.close() },
};

function gcAndPause() {
  if (global.gc) global.gc();
  return new Promise(r => setTimeout(r, 50));
}

async function warmup(fn) {
  for (let i = 0; i < 3; i++) {
    try { await fn(); } catch {}
  }
}

async function benchmark(fn, iterations) {
  const timings = [];
  const memories = [];

  for (let i = 0; i < iterations; i++) {
    await gcAndPause();
    const start = process.hrtime.bigint();
    await fn();
    const end = process.hrtime.bigint();
    timings.push(Number(end - start) / 1e6);
    memories.push(process.memoryUsage().heapUsed / (1024 * 1024));
  }

  return { timings, memories };
}

async function seedRaw(size) {
  await rawSql.clearTables();
  await rawSql.seedCategories(size.categories);
  await rawSql.seedUsers(size.users);
  await rawSql.seedPosts(size.posts);
  const res = await rawSql.query('SELECT COALESCE(MAX(id), 1) as last_id FROM users');
  return { userId: parseInt(res.rows[0].last_id) || 1 };
}

// Define each operation per framework
const OPERATIONS = {
  C1: {
    name: 'Create User',
    run: (db, ctx) => db.createUser(`u_${ctx.iter}`, `u_${ctx.iter}@test.com`),
  },
  C2: {
    name: 'Create Post',
    run: (db, ctx) => db.createPost(`Post ${ctx.iter}`, `Content ${ctx.iter}`, false, 0, ctx.userId),
  },
  C3: {
    name: 'Bulk Insert Posts (10)',
    run: (db, ctx) => {
      const posts = Array.from({ length: 10 }, (_, i) => ({
        title: `Bulk ${i}`, content: `Bulk ${i}`, published: false, views: 0, author_id: ctx.userId,
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
    run: async (db, ctx) => {
      const user = await db.createUser(`del_user_${ctx.iter}`, `del_user_${ctx.iter}@test.com`);
      const id = user.id !== undefined ? user.id : user;
      return db.deleteUser(id);
    },
  },
  D2: {
    name: 'Delete Post',
    run: async (db, ctx) => {
      const post = await db.createPost(`Del Post ${ctx.iter}`, 'delete me', false, 0, ctx.userId);
      const id = post.id !== undefined ? post.id : post;
      return db.deletePost(id);
    },
  },
  J1: {
    name: 'Get Post With Author',
    run: (db, ctx) => db.getPostWithAuthor(ctx.postId),
  },
  M1: {
    name: 'Create Post With Categories',
    run: (db, ctx) => db.createPostWithCategories(
      { title: `Cat Post ${ctx.iter}`, content: `Cat content`, published: false, views: 0, author_id: ctx.userId },
      ctx.categoryIds
    ),
  },
  M2: {
    name: 'Get Post With Categories',
    run: (db, ctx) => db.getPostWithCategories(ctx.postId),
  },
};

async function runAll() {
  const resultsDir = path.join(__dirname, '..', 'results');
  fs.mkdirSync(resultsDir, { recursive: true });

  // Initialize all frameworks
  for (const [name, fw] of Object.entries(FRAMEWORKS)) {
    process.stdout.write(`Initializing ${name}... `);
    await fw.init();
    process.stdout.write('done\n');
  }

  for (const size of DATASET_SIZES) {
    console.log(`\n=== Dataset Size: ${size.label} ===`);
    const sizeResults = {};

    // Seed via raw SQL
    console.log(`Seeding ${size.label} rows...`);
    const ctx = await seedRaw(size);
    const catRes = await rawSql.query('SELECT id FROM categories ORDER BY id');
    ctx.categoryIds = catRes.rows.slice(0, 3).map(r => parseInt(r.id));
    ctx.offset = 0;
    ctx.userId = ctx.userId;
    const firstPost = await rawSql.query('SELECT COALESCE(MIN(id), 1) as id FROM posts');
    ctx.postId = parseInt(firstPost.rows[0].id) || 1;

    // Warmup each framework
    for (const [fwName, fw] of Object.entries(FRAMEWORKS)) {
      console.log(`  Warming up ${fwName}...`);
      const warmupOps = Object.keys(OPERATIONS);
      for (const opId of warmupOps) {
        const op = OPERATIONS[opId];
        await warmup(() => op.run(fw.module, { ...ctx, userId: ctx.userId }));
      }
    }

    // Benchmark each operation on each framework
    for (const [opId, op] of Object.entries(OPERATIONS)) {
      console.log(`  Benchmarking ${opId}: ${op.name}...`);
      sizeResults[opId] = {};
      let iterCounter = 0;

      for (const [fwName, fw] of Object.entries(FRAMEWORKS)) {
        try {
          const result = await benchmark(
            async () => { await op.run(fw.module, { ...ctx, iter: (iterCounter++) % size.posts }); },
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
  }

  // Close all frameworks
  for (const [name, fw] of Object.entries(FRAMEWORKS)) {
    await fw.close();
  }

  console.log('\nBenchmark complete.');
}

runAll().catch(err => {
  console.error(err);
  process.exit(1);
});
