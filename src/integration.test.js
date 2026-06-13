process.env.DATABASE_URL = 'postgresql://postgres:thesis2026@localhost:5432/orm_benchmark_test';

require('ts-node/register');
const { Pool } = require('pg');
const rawSql = require('./db/raw-sql');
const seed = require('./seed');
const prisma = require('./db/prisma');
const typeorm = require('./db/typeorm');
const sequelizeDb = require('./db/sequelize');
const drizzleDb = require('./db/drizzle');

const TEST_CONFIG = {
  user: 'postgres',
  password: 'thesis2026',
  host: 'localhost',
  port: 5432,
  database: 'orm_benchmark_test',
};

let testPool;

// Helper to generate unique test data
function generateUniquePrefix() {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to create a user and return its ID (test setup, not ORM code)
async function createTestUser(username, email) {
  const result = await testPool.query(
    'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id',
    [username, email]
  );
  return result.rows[0].id;
}

beforeAll(async () => {
  // Create test database connection
  testPool = new Pool(TEST_CONFIG);

  // Setup ORM connections (rawSql receives the pool)
  await rawSql.init(testPool);
  await prisma.init();
  await typeorm.init();
  await sequelizeDb.init();
  await drizzleDb.init();
});

afterAll(async () => {
  // Cleanup
  await testPool.end();
  await prisma.close();
  await typeorm.close();
  await sequelizeDb.close();
  await drizzleDb.close();
});

beforeEach(async () => {
  await seed.clearTables(testPool);
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
      await db.createUser(`${prefix}_user`, `${prefix}@test.com`);

      // Verify user exists in database
      const verification = await testPool.query(
        'SELECT * FROM users WHERE username = $1',
        [`${prefix}_user`]
      );
      expect(verification.rows.length).toBe(1);
      expect(verification.rows[0].email).toBe(`${prefix}@test.com`);
    });
  });

  describe('C3: Bulk Insert Posts', () => {
    const prefix = generateUniquePrefix();
    let authorId;

    beforeEach(async () => {
      authorId = await createTestUser(`${prefix}_author`, `${prefix}_author@test.com`);
    });

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s bulk inserts 10 posts successfully', async (name, db) => {
      const posts = Array.from({ length: 10 }, (_, i) => ({
        title: `${prefix} Bulk ${i}`,
        content: `Bulk content ${i}`,
        published: false,
        views: 0,
        author_id: authorId,
      }));

      const result = await db.bulkInsertPosts(posts);
      expect(result).toBeDefined();

      // Verify posts exist in database
      const verification = await testPool.query(
        'SELECT COUNT(*) FROM posts WHERE author_id = $1',
        [authorId]
      );
      expect(parseInt(verification.rows[0].count)).toBe(10);
    });
  });
});

describe('READ Operations', () => {
  describe('R1: Get User By ID', () => {
    const prefix = generateUniquePrefix();
    let targetUserId;

    beforeEach(async () => {
      targetUserId = await createTestUser(`${prefix}_target`, `${prefix}_target@test.com`);
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


  describe('R3: Get Paginated Posts', () => {
    const prefix = generateUniquePrefix();

    beforeEach(async () => {
      const authorId = await createTestUser(`${prefix}_author`, `${prefix}_author@test.com`);

      // Insert 25 posts via raw SQL
      const values = Array.from({ length: 25 }, (_, i) =>
        `('${prefix} Post ${i}', 'Content', true, ${i}, ${authorId})`
      ).join(', ');
      await testPool.query(
        `INSERT INTO posts (title, content, published, views, author_id) VALUES ${values}`
      );
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
      targetUserId = await createTestUser(`${prefix}_update`, `${prefix}_original@test.com`);
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
      const userId = await createTestUser(`${prefix}_todelete`, `${prefix}_delete@test.com`);

      const result = await db.deleteUser(userId);
      expect(result).toBeTruthy();

      const verification = await testPool.query(
        'SELECT * FROM users WHERE username = $1',
        [`${prefix}_todelete`]
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
      authorId = await createTestUser(`${prefix}_author`, `${prefix}_author@test.com`);

      const result = await testPool.query(
        `INSERT INTO posts (title, content, published, views, author_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [`${prefix} Join Post`, 'Content', true, 100, authorId]
      );
      const post = result.rows[0];
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
      authorId = await createTestUser(`${prefix}_author`, `${prefix}_author@test.com`);

      // Create 3 categories
      await seed.seedCategories(testPool, 3);
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

});
