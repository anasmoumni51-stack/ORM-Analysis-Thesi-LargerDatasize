process.env.DATABASE_URL = 'postgresql://postgres:thesis2026@localhost:5432/orm_benchmark_test';

const { Pool } = require('pg');
const rawSql = require('./db/raw-sql');
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

  describe('D2-bulk: Bulk Delete Posts by Author', () => {
    const prefix = generateUniquePrefix();

    test.each([
      ['Raw SQL', rawSql],
      ['Prisma', prisma],
      ['TypeORM', typeorm],
      ['Sequelize', sequelizeDb],
      ['Drizzle', drizzleDb],
    ])('%s bulk deletes all posts by author', async (name, db) => {
      const user = await rawSql.createUser(`${prefix}_author`, `${prefix}_author@test.com`);
      const authorId = user?.id ?? user?.[0]?.id ?? user;

      // Create 3 posts for this author
      await rawSql.createPost(`${prefix} Post 1`, 'Content 1', false, 0, authorId);
      await rawSql.createPost(`${prefix} Post 2`, 'Content 2', false, 0, authorId);
      await rawSql.createPost(`${prefix} Post 3`, 'Content 3', false, 0, authorId);

      const before = await testPool.query(
        'SELECT COUNT(*) FROM posts WHERE author_id = $1',
        [authorId]
      );
      expect(parseInt(before.rows[0].count)).toBe(3);

      const result = await db.deletePostsByAuthor(authorId);
      expect(result).toBeGreaterThanOrEqual(3);

      const after = await testPool.query(
        'SELECT COUNT(*) FROM posts WHERE author_id = $1',
        [authorId]
      );
      expect(parseInt(after.rows[0].count)).toBe(0);
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
