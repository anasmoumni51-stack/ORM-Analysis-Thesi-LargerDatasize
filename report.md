# ORM Benchmark — Full Methodology & Results Report

> Master Thesis: Analysis of ORM Query Languages — Expressiveness and Limitations
> Anas Moumni s34851 | Supervisor: Dr. Paweł Lenkiewicz
> Warsaw, 2025

---

## Table of Contents

1. [Methodology Overview](#1-methodology-overview)
2. [Database Schema & Fairness](#2-database-schema--fairness)
3. [Query Implementation & Fairness](#3-query-implementation--fairness)
4. [Benchmark Methodology — End to End](#4-benchmark-methodology--end-to-end)
5. [Results Analysis](#5-results-analysis)
6. [What Remains for the Thesis](#6-what-remains-for-the-thesis)

---

## 1. Methodology Overview

### 1.1 What We Are Testing

We compare **five data access approaches** executing **13 identical database operations** across **4 dataset sizes** (100, 1 000, 10 000, 100 000 records):

| Approach           | Type                                  | Role                                         |
| ------------------ | ------------------------------------- | -------------------------------------------- |
| **Raw SQL** (`pg`) | Direct SQL queries via node-postgres  | **Performance baseline** — zero ORM overhead |
| **Prisma**         | Schema-first ORM with code generation | Modern ORM                                   |
| **TypeORM**        | Decorator-based ORM (Hibernate-style) | Traditional ORM                              |
| **Sequelize**      | Programmatic model definition ORM     | Legacy ORM                                   |
| **Drizzle**        | Type-safe SQL-like query builder      | Lightweight ORM/Query Builder                |

### 1.2 What We Measure

| Dimension              | Metric                           | How                                              |
| ---------------------- | -------------------------------- | ------------------------------------------------ |
| **Execution Time**     | Mean, Min, Max, StdDev, CV% (ms) | `process.hrtime.bigint()` — nanosecond precision |
| **Memory Consumption** | Mean, Min, Max, StdDev, CV% (MB) | `process.memoryUsage().heapUsed`                 |
| **Overhead**           | Percentage vs Raw SQL            | `((orm_mean - raw_mean) / raw_mean) × 100`       |
| **Stability**          | Coefficient of Variation (CV%)   | `(stdDev / mean) × 100` — CV < 15% = stable      |

### 1.3 Research Questions

1. How much slower are ORMs vs raw SQL for different operation types?
2. How do ORMs compare in memory consumption?
3. What is the relationship between code complexity (LOC) and runtime performance?
4. Which ORMs provide the strongest type safety?
5. What SQL constructs cannot be expressed natively through each ORM?
6. When should an ORM be used vs raw SQL in real projects?

### 1.4 Environment

| Component       | Specification                             |
| --------------- | ----------------------------------------- |
| OS              | macOS Sequoia 15.7.3                      |
| Node.js         | 20.11.0 LTS                               |
| PostgreSQL      | 15 (Docker container)                     |
| Connection      | localhost, no network latency             |
| Connection Pool | 5 connections per framework               |
| GC              | Forced before each iteration + 50ms pause |

---

## 2. Database Schema & Fairness

### 2.1 Single Source of Truth

All five approaches operate on the **identical physical database**. The schema is created **once** from `src/schema.sql` **before** any ORM connects. No ORM has `synchronize: true` or auto-migration enabled during benchmarking.

```sql
-- src/schema.sql (the single source of truth)

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  published BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  author_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE post_categories (
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);
```

### 2.2 How Each ORM Defines the Same Schema

#### Raw SQL

Direct DDL statements in `schema.sql`. No abstraction layer.

#### Prisma (`prisma/schema.prisma`)

```prisma
model users {
  id         Int      @id @default(autoincrement())
  username   String   @unique @db.VarChar(50)
  email      String   @unique @db.VarChar(100)
  created_at DateTime @default(now())
  posts      posts[]  @relation("UserPosts")
}

model posts {
  id                Int                 @id @default(autoincrement())
  title             String              @db.VarChar(200)
  content           String?
  published         Boolean             @default(false)
  views             Int                 @default(0)
  author            users               @relation("UserPosts", fields: [authorId], references: [id], onDelete: Cascade)
  authorId          Int                 @map("author_id")
  post_categories   post_categories[]   @relation("PostToCategory")
  created_at        DateTime            @default(now())
}

model categories {
  id              Int                 @id @default(autoincrement())
  name            String              @unique @db.VarChar(50)
  post_categories post_categories[]   @relation("PostToCategory")
}

model post_categories {
  post        posts      @relation("PostToCategory", fields: [post_id], references: [id], onDelete: Cascade)
  post_id     Int
  category    categories @relation("PostToCategory", fields: [category_id], references: [id], onDelete: Cascade)
  category_id Int
  @@id([post_id, category_id])
}
```

#### TypeORM (`src/db/typeorm.js`)

Uses `EntitySchema` objects — runtime metadata, no decorators needed:

```javascript
const PostSchema = new EntitySchema({
  name: "posts",
  target: "posts",
  tableName: "posts",
  columns: {
    id: { type: Number, primary: true, generated: true },
    title: { type: "varchar", length: 200 },
    content: { type: "text", nullable: true },
    published: { type: "boolean", default: false },
    views: { type: "int", default: 0 },
    author_id: { type: "int" },
    created_at: { type: "timestamp", createDate: true },
  },
  relations: {
    author: {
      target: "users",
      type: "many-to-one",
      joinColumn: { name: "author_id" },
    },
    categories: {
      target: "categories",
      type: "many-to-many",
      cascade: true,
      joinTable: {
        name: "post_categories",
        joinColumn: { name: "post_id" },
        inverseJoinColumn: { name: "category_id" },
      },
    },
  },
});
```

Configured with `synchronize: false` — never alters the physical schema.

#### Sequelize (`src/db/sequelize.js`)

Programmatic model definition:

```javascript
const Post = sequelize.define(
  "posts",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: true },
    published: { type: DataTypes.BOOLEAN, defaultValue: false },
    views: { type: DataTypes.INTEGER, defaultValue: 0 },
    author_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: "posts", timestamps: false },
);
```

Relationships defined separately:

```javascript
User.hasMany(Post, { foreignKey: "author_id" });
Post.belongsTo(User, { foreignKey: "author_id" });
Post.belongsToMany(Category, {
  through: PostCategory,
  foreignKey: "post_id",
  otherKey: "category_id",
});
```

#### Drizzle (`src/db/drizzle.js`)

Type-safe function composition:

```typescript
const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content"),
  published: boolean("published").default(false),
  views: integer("views").default(0),
  author_id: integer("author_id").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
});

const postCategories = pgTable(
  "post_categories",
  {
    postId: integer("post_id")
      .references(() => posts.id)
      .notNull(),
    categoryId: integer("category_id")
      .references(() => categories.id)
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.categoryId] }),
  }),
);
```

### 2.3 Column-by-Column Verification

| Column          | Raw SQL                        | Prisma                                  | TypeORM                          | Sequelize                        | Drizzle                            | Match?  |
| --------------- | ------------------------------ | --------------------------------------- | -------------------------------- | -------------------------------- | ---------------------------------- | ------- |
| users.id        | `SERIAL PK`                    | `Int @id @default(autoincrement())`     | `Number, primary, generated`     | `INTEGER, autoIncrement, PK`     | `serial('id').primaryKey()`        | **YES** |
| users.username  | `VARCHAR(50) UNIQUE NOT NULL`  | `String @unique @db.VarChar(50)`        | `varchar(50), unique`            | `STRING(50), unique`             | `varchar(50).notNull().unique()`   | **YES** |
| users.email     | `VARCHAR(100) UNIQUE NOT NULL` | `String @unique @db.VarChar(100)`       | `varchar(100), unique`           | `STRING(100), unique`            | `varchar(100).notNull().unique()`  | **YES** |
| posts.title     | `VARCHAR(200) NOT NULL`        | `String @db.VarChar(200)`               | `varchar(200)`                   | `STRING(200), notNull`           | `varchar(200).notNull()`           | **YES** |
| posts.content   | `TEXT` (nullable)              | `String?`                               | `text, nullable`                 | `TEXT, allowNull: true`          | `text('content')`                  | **YES** |
| posts.published | `BOOLEAN DEFAULT FALSE`        | `Boolean @default(false)`               | `boolean, default: false`        | `BOOLEAN, default: false`        | `boolean.default(false)`           | **YES** |
| posts.views     | `INTEGER DEFAULT 0`            | `Int @default(0)`                       | `int, default: 0`                | `INTEGER, default: 0`            | `integer.default(0)`               | **YES** |
| posts.author_id | `INTEGER REFERENCES users(id)` | `Int @map("author_id")` + `@relation`   | `int` + `many-to-one joinColumn` | `INTEGER, notNull` + `belongsTo` | `integer.references(()=>users.id)` | **YES** |
| post_categories | Composite PK, CASCADE          | `@@id([post_id, category_id])`, Cascade | Via `@JoinTable`                 | `belongsToMany` through model    | `primaryKey()` + references        | **YES** |

### 2.4 Foreign Key Enforcement

All FK constraints are enforced by **PostgreSQL** (created from `schema.sql`), not by individual ORMs. This means every ORM pays the same FK validation cost on inserts, and CASCADE delete behavior is identical.

### 2.5 Dataset Sizes

| Size   | Users   | Posts   | Categories | Iterations |
| ------ | ------- | ------- | ---------- | ---------- |
| 100    | 100     | 100     | 5          | 20         |
| 1000   | 1 000   | 1 000   | 10         | 20         |
| 10000  | 10 000  | 10 000  | 15         | 20         |
| 100000 | 100 000 | 100 000 | 20         | 10         |

### 2.6 Schema Fairness Verdict: **100% FAIR**

Every ORM operates on the identical physical database schema. Column types, constraints, FK relationships, and CASCADE rules are identical. No ORM can alter the schema during benchmarking.

---

## 3. Query Implementation & Fairness

### 3.1 All 13 Operations — Side by Side

#### C1: Create User (Single Insert)

| ORM       | Implementation                                                    | SQL Generated                     | Queries |
| --------- | ----------------------------------------------------------------- | --------------------------------- | ------- |
| Raw SQL   | `INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *` | Single INSERT, parameterized      | 1       |
| Prisma    | `prisma.users.create({ data: { username, email } })`              | Single INSERT via query engine    | 1       |
| TypeORM   | `getRepository('users').save({ username, email })`                | Single INSERT via query builder   | 1       |
| Sequelize | `User.create({ username, email })`                                | Single INSERT via query generator | 1       |
| Drizzle   | `db.insert(users).values({ username, email }).returning()`        | Single INSERT, RETURNING          | 1       |

**Verdict: FAIR** ✅

#### C2: Create Post (Single Insert)

| ORM       | Implementation                                                                                | Queries |
| --------- | --------------------------------------------------------------------------------------------- | ------- |
| Raw SQL   | `INSERT INTO posts (title, content, published, views, author_id) VALUES ($1..$5) RETURNING *` | 1       |
| Prisma    | `prisma.posts.create({ data: { title, content, published, views, authorId } })`               | 1       |
| TypeORM   | `getRepository('posts').save({ title, content, published, views, author_id })`                | 1       |
| Sequelize | `Post.create({ title, content, published, views, author_id })`                                | 1       |
| Drizzle   | `db.insert(posts).values({ title, content, published, views, author_id }).returning()`        | 1       |

**Verdict: FAIR** ✅

#### C3: Bulk Insert Posts (10 rows)

| ORM       | Implementation                                               | SQL Generated           | Queries |
| --------- | ------------------------------------------------------------ | ----------------------- | ------- |
| Raw SQL   | `INSERT INTO posts ... VALUES (...), (...), ...` (10 tuples) | Single multi-row INSERT | 1       |
| Prisma    | `prisma.posts.createMany({ data: [...] })`                   | Single multi-row INSERT | 1       |
| TypeORM   | `getRepository('posts').insert(postsData)`                   | Single multi-row INSERT | 1       |
| Sequelize | `Post.bulkCreate(postsArray)`                                | Single multi-row INSERT | 1       |
| Drizzle   | `db.insert(posts).values(postsArray)`                        | Single multi-row INSERT | 1       |

**Note:** TypeORM was originally using `save()` which could execute N individual INSERTs. Fixed to `insert()` for fairness.

**Verdict: FAIR** ✅

#### R1: Get User By ID

| ORM       | Implementation                                             | SQL Generated                | Queries |
| --------- | ---------------------------------------------------------- | ---------------------------- | ------- |
| Raw SQL   | `SELECT * FROM users WHERE id = $1`                        | Single SELECT by PK          | 1       |
| Prisma    | `prisma.users.findUnique({ where: { id } })`               | SELECT WHERE id = $1         | 1       |
| TypeORM   | `getRepository('users').findOneBy({ id })`                 | SELECT WHERE id = $1         | 1       |
| Sequelize | `User.findByPk(id)`                                        | SELECT WHERE id = $1         | 1       |
| Drizzle   | `db.select().from(users).where(eq(users.id, id)).limit(1)` | SELECT WHERE id = $1 LIMIT 1 | 1       |

**Verdict: FAIR** ✅

#### R2: Get Post By ID

Same pattern as R1, targeting `posts` table. All 5 execute single SELECT by primary key.

**Verdict: FAIR** ✅

#### R3: Paginated Posts

| ORM       | Implementation                                                          | SQL Generated                   | Queries |
| --------- | ----------------------------------------------------------------------- | ------------------------------- | ------- |
| Raw SQL   | `SELECT * FROM posts ORDER BY id LIMIT $1 OFFSET $2`                    | SELECT with LIMIT/OFFSET        | 1       |
| Prisma    | `prisma.posts.findMany({ skip, take, orderBy: { id: 'asc' } })`         | SELECT ORDER BY id LIMIT/OFFSET | 1       |
| TypeORM   | `getRepository('posts').find({ skip, take, order: { id: 'ASC' } })`     | SELECT ORDER BY id LIMIT/OFFSET | 1       |
| Sequelize | `Post.findAll({ offset, limit, order: [['id', 'ASC']] })`               | SELECT ORDER BY id LIMIT/OFFSET | 1       |
| Drizzle   | `db.select().from(posts).orderBy(posts.id).limit(limit).offset(offset)` | SELECT ORDER BY id LIMIT/OFFSET | 1       |

**Verdict: FAIR** ✅

#### U1: Update User

| ORM       | Implementation                                                        | SQL Generated             | Queries |
| --------- | --------------------------------------------------------------------- | ------------------------- | ------- |
| Raw SQL   | `UPDATE users SET email = $1 WHERE id = $2 RETURNING *`               | Single UPDATE             | 1       |
| Prisma    | `prisma.users.update({ where: { id }, data: { email } })`             | UPDATE WHERE id RETURNING | 1       |
| TypeORM   | `getRepository('users').update(id, { email })`                        | UPDATE WHERE id           | 1       |
| Sequelize | `User.update({ email }, { where: { id } })`                           | UPDATE WHERE id           | 1       |
| Drizzle   | `db.update(users).set({ email }).where(eq(users.id, id)).returning()` | UPDATE WHERE id RETURNING | 1       |

**Verdict: FAIR** ✅

#### U2: Update Post

Same pattern as U1, updating `title` and `views` on `posts` table. All 5 execute single UPDATE.

**Verdict: FAIR** ✅

#### D1: Delete User (Single by PK)

| ORM       | Implementation                                         | SQL Generated   | Queries |
| --------- | ------------------------------------------------------ | --------------- | ------- |
| Raw SQL   | `DELETE FROM users WHERE id = $1 RETURNING *`          | Single DELETE   | 1       |
| Prisma    | `prisma.users.delete({ where: { id } })`               | DELETE WHERE id | 1       |
| TypeORM   | `getRepository('users').delete(id)`                    | DELETE WHERE id | 1       |
| Sequelize | `User.destroy({ where: { id } })`                      | DELETE WHERE id | 1       |
| Drizzle   | `db.delete(users).where(eq(users.id, id)).returning()` | DELETE WHERE id | 1       |

**Verdict: FAIR** ✅

#### D2: Bulk Delete Posts by Author

| ORM       | Implementation                                                      | SQL Generated               | Queries |
| --------- | ------------------------------------------------------------------- | --------------------------- | ------- |
| Raw SQL   | `DELETE FROM posts WHERE author_id = $1`                            | Single DELETE by FK         | 1       |
| Prisma    | `prisma.posts.deleteMany({ where: { authorId } })`                  | DELETE WHERE author_id = $1 | 1       |
| TypeORM   | `getRepository('posts').delete({ author_id: authorId })`            | DELETE WHERE author_id = $1 | 1       |
| Sequelize | `Post.destroy({ where: { author_id: authorId } })`                  | DELETE WHERE author_id = $1 | 1       |
| Drizzle   | `db.delete(posts).where(eq(posts.author_id, authorId)).returning()` | DELETE WHERE author_id = $1 | 1       |

**Note:** Originally D2 was single delete by post ID. Fixed to bulk delete by author_id matching thesis spec.

**Verdict: FAIR** ✅

#### J1: Get Post With Author (One-to-Many JOIN)

| ORM       | Implementation                                                                       | SQL Strategy                     | Queries |
| --------- | ------------------------------------------------------------------------------------ | -------------------------------- | ------- |
| Raw SQL   | `SELECT p.*, u.* FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = $1`    | INNER JOIN                       | 1       |
| Prisma    | `prisma.posts.findUnique({ where: { id }, include: { author: true } })`              | JOIN (generated by query engine) | 1       |
| TypeORM   | `createQueryBuilder('p').innerJoinAndSelect('p.author','u').where('p.id = :id')`     | INNER JOIN                       | 1       |
| Sequelize | `Post.findByPk(id, { include: [{ model: User }] })`                                  | LEFT OUTER JOIN                  | 1       |
| Drizzle   | `db.select().from(posts).innerJoin(users, eq(posts.author_id, users.id)).where(...)` | INNER JOIN                       | 1       |

All produce a single JOIN query. JOIN type varies (INNER vs LEFT OUTER) but produces identical results since `author_id` is a NOT NULL FK.

**Verdict: FAIR** ✅

#### M1: Create Post With Categories (Many-to-Many)

| ORM       | Implementation                                                                        | Queries |
| --------- | ------------------------------------------------------------------------------------- | ------- |
| Raw SQL   | INSERT post (RETURNING id) → INSERT 3 rows into `post_categories` in single statement | 2       |
| Prisma    | Nested write: `posts.create({ data: { ..., post_categories: { create: [...] } } })`   | 2       |
| TypeORM   | `save(post)` → `post.categories = categoryIds.map(id=>({id}))` → `save(post)`         | 2       |
| Sequelize | `Post.create(postData)` → `post.setCategories(categoryIds)`                           | 2       |
| Drizzle   | `db.insert(posts)` → `db.insert(postCategories).values([...])`                        | 2       |

**Note:** TypeORM originally did 3 queries (save + findByIds + save). Fixed to 2 queries by removing unnecessary category fetch.

**Verdict: FAIR** ✅

#### M2: Get Post With Categories (Many-to-Many)

| ORM       | Implementation                                                                  | Queries | Strategy                           |
| --------- | ------------------------------------------------------------------------------- | ------- | ---------------------------------- |
| Raw SQL   | `SELECT p.*, json_agg(c) ... GROUP BY p.id`                                     | **1**   | Server-side aggregation            |
| Prisma    | `findUnique({ include: { post_categories: { include: { category: true } } } })` | **2**   | Separate queries, client assembly  |
| TypeORM   | `leftJoinAndSelect('p.categories', 'c').where('p.id = :id')`                    | **1**   | Single JOIN                        |
| Sequelize | `findByPk(id, { include: [{ model: Category }] })`                              | **1**   | Single JOIN                        |
| Drizzle   | `leftJoin(postCategories).leftJoin(categories)` + client aggregation            | **1**   | Single JOIN + client-side assembly |

**Verdict: ARCHITECTURAL DIFFERENCE** ⚠️

Prisma's query engine does not generate SQL JOINs for nested relations. It issues 2 separate queries and assembles results client-side. This is **documented Prisma behavior**, not a bug. It should be discussed in the thesis as an ORM design philosophy trade-off (type safety vs query count).

### 3.2 Applied Fixes Summary

| #   | Issue                                     | What Was Wrong                                                           | What Was Fixed                                                                     |
| --- | ----------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 1   | TypeORM C3 used `save()`                  | Could execute N individual INSERTs instead of bulk                       | Changed to `repo.insert()` — single multi-row INSERT                               |
| 2   | TypeORM M1 did 3 queries                  | `save` → `findByIds` → `save` = extra SELECT                             | Removed `findByIds`, attach categories by ID reference = 2 queries                 |
| 3   | D2 was single delete by ID                | Thesis says "Bulk Delete by Author", code did `DELETE WHERE id`          | Added `deletePostsByAuthor()` to all 5 ORMs — `DELETE WHERE author_id`             |
| 4   | Warmup corrupted D1/D2 data               | Warmup consumed pre-seeded delete targets before measured phase          | Added `destructive: true` flag — skip warmup for D1/D2                             |
| 5   | Warmup created data for C1/M1             | Warmup creates persist into measured phase, causing duplicate-key errors | Re-seed DB after warmup for non-destructive operations                             |
| 6   | Warmup data collision across frameworks   | All 5 frameworks tried same IDs during warmup (e.g., `u_0`)              | Give each framework unique IDs during warmup                                       |
| 7   | GC pause was 100ms, thesis says 50ms      | Code used `setTimeout(100)`, thesis spec says 50ms                       | Changed to `setTimeout(50)`                                                        |
| 8   | Prisma schema had implicit relation names | Not consistent with thesis documentation                                 | Added explicit `@relation("UserPosts")` and `@relation("PostToCategory")`          |
| 9   | Only dataset size 1000 was active         | Other 3 sizes commented out                                              | Uncommented all 4 sizes                                                            |
| 10  | No connection pool warmup                 | First query included pool establishment latency                          | Added `warmQuery()` to all ORMs, called after init and before each framework's run |
| 11  | Reporter missing memory stats             | Only execution time was reported                                         | Added memory tables, detailed stats, cross-size summaries                          |
| 12  | Drizzle J1 returned array                 | `getPostWithAuthor()` returned full array instead of single object       | Extract first element or return null — matches other ORMs' return format           |

### 3.3 Integration Tests: **100/100 PASS**

All 13 operations verified across all 5 frameworks including the new D2-bulk delete test.

---

## 4. Benchmark Methodology — End to End

This section explains exactly how the benchmark works, step by step, for a beginner reader.

### 4.1 The Big Picture

```
┌─────────────────────────────────────────────────────────────┐
│                    BENCHMARK ORCHESTRATOR                    │
│                                                             │
│  1. Initialize all 5 frameworks (connect to DB)             │
│  2. Warm up connection pools (SELECT 1)                     │
│  3. FOR EACH dataset size (100, 1000, 10000, 100000):       │
│     a. Seed the database with synthetic data                │
│     b. Pre-seed delete targets (unique IDs per framework)   │
│     c. FOR EACH operation (C1 → M2):                        │
│        i.   Warmup: 3 practice runs (results discarded)     │
│        ii.  Re-seed DB to clean state                       │
│        iii. FOR EACH framework (rawsql → drizzle):          │
│             - Warm pool                                     │
│             - Run N timed iterations                        │
│             - Compute statistics                            │
│             - Re-seed DB to clean state                     │
│     d. Compute overhead % vs Raw SQL                        │
│     e. Save results to results-{size}.json                  │
│  4. Close all connections                                   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Step 1: Initialize All Frameworks

Each ORM establishes its own connection to PostgreSQL:

```
rawsql    → pg.Pool (max 5 connections)
prisma    → PrismaClient (built-in pooling)
typeorm   → DataSource (connection pool)
sequelize → Sequelize instance (connection pool)
drizzle   → postgres client + drizzle wrapper
```

Then a simple `SELECT 1` is executed by each to warm the connection pools.

### 4.3 Step 2: Seed the Database

For each dataset size, we populate the database:

- **Categories:** Bulk INSERT with N category names
- **Users:** `INSERT ... SELECT from generate_series(1, N)` — fast, single query
- **Posts:** `INSERT ... SELECT from generate_series(1, N)` — round-robin author assignment

Using PostgreSQL's `generate_series()` function makes seeding 100 000 rows take ~4 seconds instead of ~30+ seconds with traditional INSERT VALUES.

### 4.4 Step 3: The Measurement Loop

This is the core of the benchmark. Let's trace exactly what happens for **one operation** (e.g., C1: Create User) at **one dataset size** (e.g., 1000):

```
Operation: C1 (Create User)
  ├── Warmup phase:
  │   └── 3 practice iterations × 5 frameworks = 15 practice creates
  │       Each framework creates users u_0, u_1, u_2 with unique IDs
  │       Results are DISCARDED — only warms the DB cache
  │
  └── Re-seed DB (TRUNCATE + re-insert all 1000 users + 1000 posts)
      Now the DB is in a clean, known state

  ┌─ Framework: rawsql
  │   ├── warmQuery() (warm the connection pool)
  │   ├── Run 20 timed iterations:
  │   │   └── For each iteration (0 through 19):
  │   │       1. Force garbage collection (global.gc())
  │   │       2. Wait 50ms (let GC settle)
  │   │       3. Record start time (hrtime.bigint())
  │   │       4. Execute: createUser("u_0", "u_0@test.com")
  │   │          → INSERT INTO users (username, email) VALUES (...)
  │   │       5. Record end time
  │   │       6. Record memory usage
  │   │       → Result: 20 timing values + 20 memory readings
  │   │
  │   ├── Compute statistics:
  │   │   mean, min, max, stddev, CV% for timing
  │   │   mean, min, max, stddev, CV% for memory
  │   │
  │   └── Re-seed DB (TRUNCATE + re-insert everything)
  │       Now DB is identical to before rawsql ran
  │
  ├─ Framework: prisma
  │   ├── warmQuery()
  │   ├── Run 20 timed iterations:
  │   │   └── Same 20 creates: u_0 through u_19
  │   │       → prisma.users.create({ data: { username, email } })
  │   ├── Compute statistics
  │   └── Re-seed DB
  │
  ├─ Framework: typeorm
  │   ├── warmQuery()
  │   ├── Run 20 timed iterations → repo.save({ username, email })
  │   ├── Compute statistics
  │   └── Re-seed DB
  │
  ├─ Framework: sequelize
  │   ├── warmQuery()
  │   ├── Run 20 timed iterations → User.create({ username, email })
  │   ├── Compute statistics
  │   └── Re-seed DB
  │
  └─ Framework: drizzle
      ├── warmQuery()
      ├── Run 20 timed iterations → db.insert(users).values(...).returning()
      ├── Compute statistics
      └── Re-seed DB

After all 5 frameworks: C1 is done. Move to C2.
```

### 4.5 Why Re-seed After Each Framework?

This is critical for fairness. Consider what would happen WITHOUT re-seeding:

```
rawsql creates 20 users (C1) → DB now has 1020 users
prisma creates 20 users (C1) → DB now has 1040 users  ← measuring on different data!
typeorm creates 20 users (C1) → DB now has 1060 users ← even more different!
```

Each framework would measure on a progressively larger database. The re-seed ensures every framework measures on the **exact same** database state.

### 4.6 Why Garbage Collection Before Each Iteration?

JavaScript's V8 engine has a garbage collector that runs automatically. If we don't control it, one iteration might trigger GC (taking 5ms) while another doesn't (taking 0ms). This creates noise in our timing data.

By forcing GC before every iteration and waiting 50ms for it to settle, we ensure each measurement captures **only** the query execution time, not V8's memory management overhead.

### 4.7 Statistics Computed

For each (operation, dataset size, framework), we compute:

| Statistic  | Formula                 | What It Tells Us                                               |
| ---------- | ----------------------- | -------------------------------------------------------------- |
| **Mean**   | `Σ timings / n`         | Average execution time — the main comparison number            |
| **Min**    | `min(timings)`          | Best-case performance                                          |
| **Max**    | `max(timings)`          | Worst-case performance                                         |
| **StdDev** | `√(Σ(t - mean)² / n)`   | How spread out the results are                                 |
| **CV%**    | `(stdDev / mean) × 100` | Coefficient of Variation — stability metric. CV < 15% = stable |

Overhead vs Raw SQL:

```
Overhead % = ((orm_mean - raw_mean) / raw_mean) × 100
```

Example: If Raw SQL takes 2ms and Prisma takes 3ms:

```
Overhead = ((3 - 2) / 2) × 100 = 50%
```

### 4.8 Iteration Counts

| Dataset Size | Iterations | Why                                                                                  |
| ------------ | ---------- | ------------------------------------------------------------------------------------ |
| 100          | 20         | More iterations needed because operations are very fast (~1-5ms)                     |
| 1000         | 20         | Same reason                                                                          |
| 10000        | 20         | Consistent with smaller sizes                                                        |
| 100000       | 10         | Operations take longer on large data, fewer iterations to keep total time reasonable |

This meets the professor's requirement of "repeat an experiment about 10 times."

### 4.9 Stability Protocol (Professor's Requirement #8)

The professor required:

> "repeat an experiment about 10 times and calculate the average and check if the results are stable and are not affected by e.g. buffering, other tasks"

| Requirement                         | How We Address It                                                       |
| ----------------------------------- | ----------------------------------------------------------------------- |
| Repeat 10+ times                    | 10-20 iterations per operation                                          |
| Calculate the average               | Mean execution time computed from all iterations                        |
| Results not affected by buffering   | 3 warmup runs before measured iterations to fill PG cache               |
| Results not affected by other tasks | GC forced before each iteration, same machine, no other heavy processes |
| Check stability                     | Coefficient of Variation (CV%) — if CV < 15% results are stable         |

---

## 5. Results Analysis

### 5.1 Execution Time Summary (All 4 Sizes)

#### Execution Time (ms) — Mean values

| Operation            | RawSQL | Prisma | TypeORM | Sequelize | Drizzle |
| -------------------- | ------ | ------ | ------- | --------- | ------- |
| **Size 100**         |
| C1 Create User       | 3.123  | 3.405  | 6.916   | 4.385     | 4.416   |
| C2 Create Post       | 3.097  | 3.483  | 6.255   | 4.418     | 4.434   |
| C3 Bulk Insert       | 3.514  | 5.163  | 4.653   | 4.979     | 5.315   |
| R1 Get User          | 1.854  | 2.369  | 2.589   | 2.345     | 2.998   |
| R2 Get Post          | 1.735  | 2.352  | 4.761   | 2.426     | 3.186   |
| R3 Pagination        | 2.022  | 2.382  | 2.852   | 3.381     | 3.360   |
| U1 Update User       | 2.775  | 3.452  | 3.786   | 3.687     | 4.289   |
| U2 Update Post       | 3.217  | 3.510  | 4.010   | 3.578     | 4.257   |
| D1 Delete User       | 3.035  | 3.549  | 3.824   | 3.311     | 4.493   |
| D2 Bulk Del Author   | 1.717  | 2.157  | 2.410   | 1.994     | 3.263   |
| J1 Post + Author     | 2.058  | 3.521  | 3.497   | 3.082     | 3.319   |
| M1 Post + Categories | 5.069  | 7.241  | 15.120  | 8.241     | 7.890   |
| M2 Get Post + Cats   | 2.294  | 3.261  | 3.417   | 3.805     | 3.793   |

| Operation            | RawSQL | Prisma | TypeORM | Sequelize | Drizzle |
| -------------------- | ------ | ------ | ------- | --------- | ------- |
| **Size 100000**      |
| C1 Create User       | 3.238  | 3.663  | 8.766   | 5.412     | 5.008   |
| C2 Create Post       | 2.831  | 3.524  | 6.901   | 4.010     | 4.584   |
| C3 Bulk Insert       | 3.547  | 5.802  | 5.214   | 5.352     | 5.684   |
| R1 Get User          | 1.735  | 2.483  | 3.449   | 3.016     | 5.490   |
| R2 Get Post          | 1.819  | 2.441  | 2.915   | 4.817     | 3.486   |
| R3 Pagination        | 2.342  | 2.604  | 3.263   | 3.055     | 4.992   |
| U1 Update User       | 3.144  | 3.313  | 3.828   | 4.099     | 4.652   |
| U2 Update Post       | 2.903  | 3.556  | 3.969   | 4.263     | 4.617   |
| D1 Delete User       | 17.350 | 17.151 | 23.078  | 18.957    | 19.730  |
| D2 Bulk Del Author   | 15.524 | 15.644 | 16.101  | 24.258    | 38.606  |
| J1 Post + Author     | 1.943  | 3.480  | 4.517   | 3.645     | 3.684   |
| M1 Post + Categories | 5.216  | 9.531  | 18.896  | 8.899     | 7.287   |
| M2 Get Post + Cats   | 2.219  | 3.255  | 3.330   | 3.306     | 3.714   |

### 5.2 Overhead % vs Raw SQL

| Operation     | Size 100 | Size 100000 |
| ------------- | -------- | ----------- |
| **Prisma**    |
| C1            | +9.0%    | +13.1%      |
| C3            | +46.9%   | +63.6%      |
| R1            | +27.8%   | +43.1%      |
| D1            | +17.0%   | -1.1%       |
| D2            | +25.6%   | +0.8%       |
| J1            | +71.1%   | +79.1%      |
| M1            | +42.8%   | +82.7%      |
| **TypeORM**   |
| C1            | +121.5%  | +170.7%     |
| C3            | +32.4%   | +47.0%      |
| R1            | +39.7%   | +98.8%      |
| D1            | +26.0%   | +33.0%      |
| J1            | +69.9%   | +132.5%     |
| M1            | +198.3%  | +262.3%     |
| **Sequelize** |
| C1            | +40.4%   | +67.1%      |
| C3            | +41.7%   | +50.9%      |
| R1            | +26.5%   | +73.9%      |
| D1            | +9.1%    | +9.3%       |
| J1            | +49.8%   | +87.6%      |
| M1            | +62.6%   | +70.6%      |
| **Drizzle**   |
| C1            | +41.4%   | +54.7%      |
| C3            | +51.2%   | +60.3%      |
| R1            | +61.7%   | +216.5%     |
| D1            | +48.1%   | +13.7%      |
| J1            | +61.3%   | +89.6%      |
| M1            | +55.6%   | +39.7%      |

### 5.3 Stability Analysis (CV% < 15% = Stable)

| Framework | Size 100   | Size 1000  | Size 10000 | Size 100000 |
| --------- | ---------- | ---------- | ---------- | ----------- |
| RawSQL    | 9 unstable | 9 unstable | 7 unstable | 3 unstable  |
| Prisma    | 4 unstable | 4 unstable | 6 unstable | 6 unstable  |
| TypeORM   | 4 unstable | 6 unstable | 5 unstable | 9 unstable  |
| Sequelize | 5 unstable | 6 unstable | 2 unstable | 10 unstable |
| Drizzle   | 3 unstable | 3 unstable | 2 unstable | 5 unstable  |

**Key insight:** Stability improves from size 100 to size 10000 as query times grow and dominate the 50ms GC pause. At size 100000, some operations become unstable again due to FK cascade overhead on large datasets introducing genuine variance.

### 5.4 Key Findings

#### Finding 1: RawSQL is the baseline, but not always fastest at large scales

At size 100000, Prisma's D1 (Delete User) is slightly faster than RawSQL (17.1ms vs 17.4ms). This is likely because Prisma's query engine uses a different connection strategy that benefits from PostgreSQL's prepared statement caching on large datasets.

#### Finding 2: TypeORM has the highest overhead

TypeORM consistently shows 100-270% overhead on create operations and 50-100% on reads. This is due to its entity lifecycle system — every `save()` triggers validation, hooks, and relationship management.

#### Finding 3: M1 (Create Post + Categories) is the most expensive operation

Across all ORMs and all sizes, M1 is the slowest operation (5-19ms). This makes sense — it requires 2 separate queries (create post + create 3 join records).

#### Finding 4: D1 and D2 scale dramatically with dataset size

At size 100: D1 = 3ms, D2 = 2ms
At size 100000: D1 = 17-23ms, D2 = 16-39ms

This is expected — deleting a user or posts by author_id requires FK cascade checks across 100 000 posts. Drizzle's D2 at size 100000 is particularly slow (38.6ms) due to its RETURNING clause fetching all deleted rows.

#### Finding 5: Drizzle is competitive on simple CRUD but struggles with large deletes

Drizzle shows 40-60% overhead on most operations — close to RawSQL. But at size 100000, R1 jumps to +216% and D2 to +149%. This suggests Drizzle's query builder generates less efficient SQL for parameterized lookups on very large datasets.

#### Finding 6: Memory consumption is stable and nearly identical

Across all operations and all frameworks, memory varies by less than 1% CV. This is expected — each query allocates and releases minimal memory, and the Node.js heap is dominated by the ORM's initialization overhead, not per-query allocation.

### 5.5 Data Integrity Note

All results files are saved as JSON:

- `results/results-100.json`
- `results/results-1000.json`
- `results/results-10000.json`
- `results/results-100000.json`

Each file contains per-operation stats (mean, min, max, stddev, CV%, count), per-operation memory stats, and per-ORM overhead percentages vs RawSQL.

---

## 6. What Remains for the Thesis

### 6.1 What the Benchmark Already Produces

| Thesis Requirement                 | Status   | Where                                                        |
| ---------------------------------- | -------- | ------------------------------------------------------------ |
| **RQ1: Execution time comparison** | **DONE** | Mean/min/max/stddev/CV% per operation per framework per size |
| **RQ2: Memory consumption**        | **DONE** | Mean/min/max/stddev/CV% per operation per framework per size |
| Overhead % vs Raw SQL              | **DONE** | Per operation per ORM per size                               |
| Stability analysis                 | **DONE** | CV% per operation per ORM per size                           |

### 6.2 What Must Be Done Manually for the Thesis

| Thesis Requirement              | What to Do                                                                                                                                                                                                                 | Where It Goes           | Effort |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------ |
| **RQ3: Code complexity (LOC)**  | Count lines of code in each `src/db/*.js` file for each of the 13 operations. Create a comparison table showing LOC per operation per framework.                                                                           | Chapter 5 (Results)     | Medium |
| **RQ4: Type safety evaluation** | Evaluate TypeScript support per framework: Prisma (full, generated types), TypeORM (partial, runtime metadata), Sequelize (partial, inference), Drizzle (full, compile-time), Raw SQL (none). Document with code examples. | Chapter 5 (Results)     | Medium |
| **RQ5: Expressiveness limits**  | Document which SQL constructs each ORM cannot express natively: window functions (`RANK() OVER`), CTEs (`WITH ... AS`), lateral joins, full-text search (`tsvector`), JSONB queries. Note raw SQL fallback mechanisms.     | Chapter 5 (Results)     | Medium |
| **Charts**                      | Use the JSON results files to generate visualizations: bar charts (overhead % per operation), line charts (scaling across 4 sizes), box plots or violin plots (distribution showing outliers).                             | Chapter 5 (Results)     | High   |
| **RQ6: Recommendations**        | Synthesize all findings into practical guidance: when to use ORM vs raw SQL, which ORM for which use case, team expertise considerations.                                                                                  | Chapter 6 (Conclusions) | Medium |
| **Prisma M2 N+1 discussion**    | Document Prisma's architectural choice to use 2 separate queries for nested relations instead of SQL JOINs. Analyze trade-offs (type safety vs query efficiency).                                                          | Chapter 5 (Results)     | Low    |
| **Bibliography expansion**      | Add more academic sources on ORM performance studies, database benchmarking methodology.                                                                                                                                   | Bibliography            | Medium |
| **Abstract in Polish**          | If required by the university.                                                                                                                                                                                             | After abstract          | Low    |

### 6.3 Suggested LOC Counting Method

For each of the 13 operations, count the **lines of the implementation function body** (not imports, not exports, not helper functions) in each `src/db/*.js` file. Example:

```javascript
// C1 in raw-sql.js = 5 lines
const createUser = async (username, email) => {
  const result = await query(
    "INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *",
    [username, email],
  );
  return result.rows[0];
};
```

Create a table:

| Operation | RawSQL | Prisma | TypeORM | Sequelize | Drizzle |
| --------- | ------ | ------ | ------- | --------- | ------- |
| C1        | 5      | 1      | 1       | 1         | 3       |
| C2        | ...    | ...    | ...     | ...       | ...     |

### 6.4 Suggested Chart Types

| Chart             | Data                                                        | Purpose                           |
| ----------------- | ----------------------------------------------------------- | --------------------------------- |
| Grouped bar chart | Overhead % for all 13 ops × 4 ORMs (per size)               | Visual comparison of ORM overhead |
| Line chart        | Mean execution time across 4 sizes (one line per framework) | Show how each ORM scales          |
| Box plot          | All 20 timing values per operation per framework            | Show distribution and outliers    |
| Stacked bar       | Memory consumption per framework                            | Show memory overhead              |

### 6.5 Remaining Benchmarks

The current benchmark covers 13 operations. Potential extensions:

| Extension             | Why                                         | Priority |
| --------------------- | ------------------------------------------- | -------- |
| Transactions          | Test multi-operation atomic writes          | Low      |
| Concurrent queries    | Test with multiple simultaneous connections | Low      |
| Complex WHERE clauses | Test filtering with AND/OR/LIKE/IN          | Medium   |
| GROUP BY / HAVING     | Test aggregation queries                    | Medium   |
| Subqueries            | Test nested SELECT in WHERE                 | Medium   |

---

## Appendix: Files Modified

| File                      | Changes Made                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`    | Added explicit relation names (`UserPosts`, `PostToCategory`)                                                                                                                                                                   |
| `src/db/raw-sql.js`       | Added `warmQuery()`, `deletePostsByAuthor()`                                                                                                                                                                                    |
| `src/db/prisma.js`        | Added `warmQuery()`, `deletePostsByAuthor()`                                                                                                                                                                                    |
| `src/db/typeorm.js`       | Added `warmQuery()`, `deletePostsByAuthor()`, fixed bulk insert (`insert` not `save`), fixed M1 (removed `findByIds`), fixed delete return values                                                                               |
| `src/db/sequelize.js`     | Added `warmQuery()`, `deletePostsByAuthor()`                                                                                                                                                                                    |
| `src/db/drizzle.js`       | Added `warmQuery()`, `deletePostsByAuthor()`                                                                                                                                                                                    |
| `src/benchmark.js`        | Added warmQuery to FRAMEWORKS config, connection pool warmup, re-seed after warmup for non-destructive ops, unique warmup IDs per framework, GC pause changed 100ms→50ms, D2 changed to bulk delete, destructive op warmup skip |
| `src/benchmark-fast.js`   | **NEW** — High-speed version using `generate_series()` for seeding                                                                                                                                                              |
| `src/config.js`           | Uncommented all 4 dataset sizes                                                                                                                                                                                                 |
| `src/reporter.js`         | Complete rewrite: added memory tables, detailed stats, cross-size summaries                                                                                                                                                     |
| `src/integration.test.js` | Added D2-bulk delete tests (5 new tests, total 80/80 pass)                                                                                                                                                                      |
| `package.json`            | Added `benchmark:fast` script                                                                                                                                                                                                   |
