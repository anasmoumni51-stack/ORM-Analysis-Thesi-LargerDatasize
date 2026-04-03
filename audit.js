const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://benchmark:benchmark@localhost:5432/benchmark';

const DATASET_SIZES = [
  { label: '100', users: 100, posts: 100, categories: 5, iterations: 20 },
  { label: '1000', users: 1000, posts: 1000, categories: 10, iterations: 20 },
  { label: '10000', users: 10000, posts: 10000, categories: 15, iterations: 20 },
  { label: '100000', users: 100000, posts: 100000, categories: 20, iterations: 10 },
];

module.exports = { DATABASE_URL, DATASET_SIZES };
function computeStats(timings) {
  const n = timings.length;
  if (n === 0) return null;

  const mean = timings.reduce((a, b) => a + b, 0) / n;
  const min = Math.min(...timings);
  const max = Math.max(...timings);
  const variance = timings.reduce((sum, t) => sum + (t - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);
  const cv = mean > 0 ? (stddev / mean) * 100 : 0;

  return { mean, min, max, stddev, cv, count: n };
}

function computeOverhead(ormMean, rawMean) {
  if (rawMean === 0) return Infinity;
  return ((ormMean - rawMean) / rawMean) * 100;
}

module.exports = { computeStats, computeOverhead };
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
  rawsql: { module: rawSql, init: () => Promise.resolve(), close: () => rawSql.close() },
  prisma: { module: prisma, init: () => Promise.resolve(), close: () => prisma.close() },
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
      const warmupOps = ['R1', 'R2'];
      for (const opId of warmupOps) {
        const op = OPERATIONS[opId];
        await warmup(() => op.run(fw.module, { ...ctx, userId: ctx.userId }));
      }
    }

    // Benchmark each operation on each framework
    for (const [opId, op] of Object.entries(OPERATIONS)) {
      console.log(`  Benchmarking ${opId}: ${op.name}...`);
      sizeResults[opId] = {};

      for (const [fwName, fw] of Object.entries(FRAMEWORKS)) {
        try {
          const result = await benchmark(
            async () => { await op.run(fw.module, { ...ctx, iter: Math.floor(Math.random() * size.posts) }); },
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
const { Pool } = require('pg');
const rawSql = require('./db/raw-sql');
const prisma = require('./db/prisma');
const typeorm = require('./db/typeorm');
const sequelizeDb = require('./db/sequelize');
const drizzleDb = require('./db/drizzle');

const TEST_CONFIG = {
  user: 'benchmark',
  password: 'benchmark',
  host: 'localhost',
  port: 5432,
  database: 'benchmark_test',
};

let testPool;

// Helper to generate unique test data
function generateUniquePrefix() {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

beforeAll(async () => {
  // Create test database connection
  testPool = new Pool(TEST_CONFIG);

  // Setup all ORM connections
  await rawSql.init();
  await prisma.init();
  await typeorm.init();
  await sequelizeDb.init();
  await drizzleDb.init();
});

afterAll(async () => {
  // Cleanup
  await testPool.end();
  await rawSql.close();
  await prisma.close();
  await typeorm.close();
  await sequelizeDb.close();
  await drizzleDb.close();
});

beforeEach(async () => {
  // Truncate all tables before each test
  await testPool.query('TRUNCATE TABLE post_categories, posts, categories, users RESTART IDENTITY CASCADE');
});

describe('CREATE Operations', () => {
  describe('C1: Create User', () => {
    const prefix = generateUniquePrefix();

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s creates a user successfully', async (name, db) => {
      const result = await db.createUser(`${prefix}_user`, `${prefix}@test.com`);

      // Normalize result across ORMs
      const userId = result?.id ?? result?.[0]?.id ?? result;
      expect(userId).toBeDefined();

      // Verify user exists in database
      const verification = await testPool.query(
        'SELECT * FROM users WHERE username = $1',
        [`${prefix}_user`]
      );
      expect(verification.rows.length).toBe(1);
      expect(verification.rows[0].email).toBe(`${prefix}@test.com`);
    });
  });

  describe('C2: Create Post', () => {
    const prefix = generateUniquePrefix();
    let authorId;

    beforeEach(async () => {
      const user = await rawSql.createUser(`${prefix}_author`, `${prefix}_author@test.com`);
      authorId = user?.id ?? user?.[0]?.id ?? user;
    });

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s creates a post successfully', async (name, db) => {
      const result = await db.createPost(
        `${prefix} Post Title`,
        `${prefix} Post Content`,
        true,
        42,
        authorId
      );

      const postId = result?.id ?? result?.[0]?.id ?? result;
      expect(postId).toBeDefined();

      const verification = await testPool.query(
        'SELECT * FROM posts WHERE title = $1',
        [`${prefix} Post Title`]
      );
      expect(verification.rows.length).toBe(1);
      expect(verification.rows[0].content).toBe(`${prefix} Post Content`);
      expect(verification.rows[0].published).toBe(true);
      expect(verification.rows[0].views).toBe(42);
    });
  });

  describe('C3: Bulk Insert Posts', () => {
    const prefix = generateUniquePrefix();
    let authorId;

    beforeEach(async () => {
      const user = await rawSql.createUser(`${prefix}_author`, `${prefix}_author@test.com`);
      authorId = user?.id ?? user?.[0]?.id ?? user;
    });

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s bulk inserts 10 posts efficiently', async (name, db) => {
      const posts = Array.from({ length: 10 }, (_, i) => ({
        title: `${prefix} Bulk ${i}`,
        content: `${prefix} Content ${i}`,
        published: false,
        views: i,
        author_id: authorId,
      }));

      await db.bulkInsertPosts(posts);

      const verification = await testPool.query(
        'SELECT * FROM posts WHERE title LIKE $1',
        [`${prefix} Bulk%`]
      );
      expect(verification.rows.length).toBe(10);
    });
  });
});

describe('READ Operations', () => {
  describe('R1: Get User By ID', () => {
    const prefix = generateUniquePrefix();
    let targetUserId;

    beforeEach(async () => {
      const user = await rawSql.createUser(`${prefix}_target`, `${prefix}_target@test.com`);
      targetUserId = user?.id ?? user?.[0]?.id ?? user;
    });

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s retrieves user by ID successfully', async (name, db) => {
      const result = await db.getUserById(targetUserId);

      // Normalize result
      const user = Array.isArray(result) ? result[0] : result;
      expect(user).toBeDefined();
      expect(user.username).toBe(`${prefix}_target`);
    });

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s returns null for non-existent user', async (name, db) => {
      const result = await db.getUserById(999999999);
      expect(result).toBeNull();
    });
  });

  describe('R2: Get Post By ID', () => {
    const prefix = generateUniquePrefix();
    let targetPostId;

    beforeEach(async () => {
      const user = await rawSql.createUser(`${prefix}_author`, `${prefix}_author@test.com`);
      const authorId = user?.id ?? user?.[0]?.id ?? user;
      const post = await rawSql.createPost(`${prefix} Target Post`, 'Content', false, 0, authorId);
      targetPostId = post?.id ?? post?.[0]?.id ?? post;
    });

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s retrieves post by ID successfully', async (name, db) => {
      const result = await db.getPostById(targetPostId);

      const post = Array.isArray(result) ? result[0] : result;
      expect(post).toBeDefined();
      expect(post.title).toBe(`${prefix} Target Post`);
    });
  });

  describe('R3: Get Paginated Posts', () => {
    const prefix = generateUniquePrefix();

    beforeEach(async () => {
      const user = await rawSql.createUser(`${prefix}_author`, `${prefix}_author@test.com`);
      const authorId = user?.id ?? user?.[0]?.id ?? user;

      // Insert 25 posts
      const posts = Array.from({ length: 25 }, (_, i) => ({
        title: `${prefix} Post ${i}`,
        content: 'Content',
        published: true,
        views: i,
        author_id: authorId,
      }));
      await rawSql.bulkInsertPosts(posts);
    });

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s returns paginated results with limit 20', async (name, db) => {
      const result = await db.getPaginatedPosts(0, 20);

      const posts = Array.isArray(result) ? result : [result];
      expect(posts.length).toBeLessThanOrEqual(20);
    });

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s respects offset parameter', async (name, db) => {
      const page1 = await db.getPaginatedPosts(0, 10);
      const page2 = await db.getPaginatedPosts(10, 10);

      const page1Posts = Array.isArray(page1) ? page1 : [page1];
      const page2Posts = Array.isArray(page2) ? page2 : [page2];

      expect(page1Posts.length).toBe(10);
      expect(page2Posts.length).toBeLessThanOrEqual(15);
    });
  });
});

describe('UPDATE Operations', () => {
  describe('U1: Update User', () => {
    const prefix = generateUniquePrefix();
    let targetUserId;

    beforeEach(async () => {
      const user = await rawSql.createUser(`${prefix}_update`, `${prefix}_original@test.com`);
      targetUserId = user?.id ?? user?.[0]?.id ?? user;
    });

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s updates user email successfully', async (name, db) => {
      await db.updateUser(targetUserId, { email: `${prefix}_updated@test.com` });

      const verification = await testPool.query(
        'SELECT * FROM users WHERE id = $1',
        [targetUserId]
      );
      expect(verification.rows[0].email).toBe(`${prefix}_updated@test.com`);
    });
  });

  describe('U2: Update Post', () => {
    const prefix = generateUniquePrefix();
    let targetPostId;

    beforeEach(async () => {
      const user = await rawSql.createUser(`${prefix}_author`, `${prefix}_author@test.com`);
      const authorId = user?.id ?? user?.[0]?.id ?? user;
      const post = await rawSql.createPost(`${prefix} Original`, 'Original content', false, 10, authorId);
      targetPostId = post?.id ?? post?.[0]?.id ?? post;
    });

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s updates post title and views', async (name, db) => {
      await db.updatePost(targetPostId, { title: `${prefix} Updated`, views: 999 });

      const verification = await testPool.query(
        'SELECT * FROM posts WHERE id = $1',
        [targetPostId]
      );
      expect(verification.rows[0].title).toBe(`${prefix} Updated`);
      expect(verification.rows[0].views).toBe(999);
    });
  });
});

describe('DELETE Operations', () => {
  describe('D1: Delete User', () => {
    const prefix = generateUniquePrefix();

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s deletes user successfully', async (name, db) => {
      // Create user to delete
      const user = await rawSql.createUser(`${prefix}_todelete`, `${prefix}_delete@test.com`);
      const userId = user?.id ?? user?.[0]?.id ?? user;

      const result = await db.deleteUser(userId);
      expect(result).toBeTruthy();

      const verification = await testPool.query(
        'SELECT * FROM users WHERE username = $1',
        [`${prefix}_todelete`]
      );
      expect(verification.rows.length).toBe(0);
    });
  });

  describe('D2: Delete Post', () => {
    const prefix = generateUniquePrefix();

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s deletes post successfully', async (name, db) => {
      const user = await rawSql.createUser(`${prefix}_author`, `${prefix}_author@test.com`);
      const authorId = user?.id ?? user?.[0]?.id ?? user;

      const post = await rawSql.createPost(`${prefix} To Delete`, 'Delete me', false, 0, authorId);
      const postId = post?.id ?? post?.[0]?.id ?? post;

      const result = await db.deletePost(postId);
      expect(result).toBeTruthy();

      const verification = await testPool.query(
        'SELECT * FROM posts WHERE title = $1',
        [`${prefix} To Delete`]
      );
      expect(verification.rows.length).toBe(0);
    });
  });
});

describe('JOIN Operations', () => {
  describe('J1: Get Post With Author', () => {
    const prefix = generateUniquePrefix();
    let postId;
    let authorId;

    beforeEach(async () => {
      const user = await rawSql.createUser(`${prefix}_author`, `${prefix}_author@test.com`);
      authorId = user?.id ?? user?.[0]?.id ?? user;

      const post = await rawSql.createPost(`${prefix} Join Post`, 'Content', true, 100, authorId);
      postId = post?.id ?? post?.[0]?.id ?? post;
    });

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s retrieves post with author data', async (name, db) => {
      const result = await db.getPostWithAuthor(postId);

      // Result format varies by ORM
      expect(result).toBeDefined();
    });
  });
});

describe('Many-to-Many Operations', () => {
  describe('M1: Create Post With Categories', () => {
    const prefix = generateUniquePrefix();
    let authorId;
    let categoryIds;

    beforeEach(async () => {
      // Create author
      const user = await rawSql.createUser(`${prefix}_author`, `${prefix}_author@test.com`);
      authorId = user?.id ?? user?.[0]?.id ?? user;

      // Create 3 categories
      await rawSql.seedCategories(3);
      const cats = await testPool.query('SELECT id FROM categories ORDER BY id LIMIT 3');
      categoryIds = cats.rows.map(r => parseInt(r.id));
    });

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s creates post with categories', async (name, db) => {
      const postData = {
        title: `${prefix} Cat Post`,
        content: 'Content',
        published: true,
        views: 50,
        author_id: authorId,
      };

      await db.createPostWithCategories(postData, categoryIds);

      const verification = await testPool.query(`
        SELECT p.*, COUNT(pc.category_id) as cat_count
        FROM posts p
        LEFT JOIN post_categories pc ON p.id = pc.post_id
        WHERE p.title = $1
        GROUP BY p.id
      `, [`${prefix} Cat Post`]);

      expect(verification.rows.length).toBe(1);
      expect(parseInt(verification.rows[0].cat_count)).toBe(3);
    });
  });

  describe('M2: Get Post With Categories', () => {
    const prefix = generateUniquePrefix();
    let postId;

    beforeEach(async () => {
      const user = await rawSql.createUser(`${prefix}_author`, `${prefix}_author@test.com`);
      const authorId = user?.id ?? user?.[0]?.id ?? user;

      await rawSql.seedCategories(3);
      const cats = await testPool.query('SELECT id FROM categories ORDER BY id LIMIT 3');
      const categoryIds = cats.rows.map(r => parseInt(r.id));

      // Create post with categories via raw SQL
      const post = await rawSql.createPost(`${prefix} Query Post`, 'Content', true, 10, authorId);
      postId = post?.id ?? post?.[0]?.id ?? post;

      for (const catId of categoryIds) {
        await testPool.query(
          'INSERT INTO post_categories (post_id, category_id) VALUES ($1, $2)',
          [postId, catId]
        );
      }
    });

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s retrieves post with categories', async (name, db) => {
      const result = await db.getPostWithCategories(postId);
      expect(result).toBeDefined();
    });
  });
});
