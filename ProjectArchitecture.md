# ORM Query Languages — Benchmark Plan

## 1. Database Schema

### Tables

| Table | Columns |
|-------|---------|
| users | id (PK), username, email, created_at |
| posts | id (PK), title, content, published, views, author_id (FK → users), created_at |
| categories | id (PK), name (UNIQUE) |
| post_categories | post_id (FK), category_id (FK) — composite PK |

**Relationships:**
- one user → many posts (author_id FK)
- many posts ↔ many categories (post_categories join table)

### Dataset Sizes

| Size | Users | Posts | Categories |
|------|-------|-------|------------|
| 100 | 100 | 100 | 5 |
| 1000 | 1,000 | 1,000 | 10 |
| 10000 | 10,000 | 10,000 | 15 |
| 100000 | 100,000 | 100,000 | 20 |

Same style as Domariev — identical number of objects for both main tables. Categories are a small fixed set.

### users — Attribute Descriptions

| Attribute | Type | Description |
|-----------|------|-------------|
| id | SERIAL | Primary key that uniquely identifies the user entity |
| username | VARCHAR(50) | Unique username, not null |
| email | VARCHAR(100) | Unique email address, not null |
| created_at | TIMESTAMP | Timestamp of account creation, defaults to current time |

### posts — Attribute Descriptions

| Attribute | Type | Description |
|-----------|------|-------------|
| id | SERIAL | Primary key that uniquely identifies the post entity |
| title | VARCHAR(200) | Post title, not null |
| content | TEXT | Post body text, nullable |
| published | BOOLEAN | Whether the post is visible publicly, defaults to false |
| views | INTEGER | Number of views the post received, defaults to 0 |
| author_id | INTEGER | Foreign key referencing users(id). Identifies the author of the post |
| created_at | TIMESTAMP | Timestamp of post creation, defaults to current time |

### categories — Attribute Descriptions

| Attribute | Type | Description |
|-----------|------|-------------|
| id | SERIAL | Primary key that uniquely identifies the category entity |
| name | VARCHAR(50) | Unique category name, not null |

### post_categories — Attribute Descriptions

| Attribute | Type | Description |
|-----------|------|-------------|
| post_id | INTEGER | Foreign key referencing posts(id). Part of the composite primary key |
| category_id | INTEGER | Foreign key referencing categories(id). Part of the composite primary key |

---

## 2. Operations (Simple CRUD — matching Domariev's style)

Every operation runs the same way through all 5 frameworks: Raw SQL (pg), Prisma, TypeORM, Sequelize, Drizzle.

Like Domariev — simple "insert one" and "retrieve one" operations, not complex queries. The rigor comes from dataset size + stat analysis, not operation complexity.

### CREATE

| ID | Name | What It Does |
|----|------|-------------|
| C1 | Single insert user | INSERT one row into users |
| C2 | Single insert post | INSERT one row into posts |

### READ

| ID | Name | What It Does |
|----|------|-------------|
| R1 | Single retrieve user by ID | SELECT * FROM users WHERE id = X |
| R2 | Single retrieve post by ID | SELECT * FROM posts WHERE id = X |

### UPDATE

| ID | Name | What It Does |
|----|------|-------------|
| U1 | Single update user | UPDATE users SET email = X WHERE id = Y |
| U2 | Single update post | UPDATE posts SET title = X, views = Y WHERE id = Z |

### DELETE

| ID | Name | What It Does |
|----|------|-------------|
| D1 | Single delete user | DELETE FROM users WHERE id = X |
| D2 | Single delete post | DELETE FROM posts WHERE id = X |

### RELATIONSHIP

| ID | Name | What It Does |
|----|------|-------------|
| J1 | Post with author (JOIN) | SELECT post JOIN user WHERE post.author_id = user.id |

**Tests one-to-many ORM handling** — does the ORM do a single JOIN query or 2 separate queries behind the scenes?

### MANY-TO-MANY

| ID | Name | What It Does |
|----|------|-------------|
| M1 | Create post with categories | Assign a post to 3 categories using post_categories join table |
| M2 | Get post with categories | SELECT post JOIN categories through post_categories for given post id |

**Tests many-to-many ORM handling** — this is where ORMs diverge most. Some (Prisma, TypeORM) expose it as `post.categories`. Others (Drizzle) require manual join logic.

### BULK

| ID | Name | What It Does |
|----|------|-------------|
| C3 | Bulk insert posts (10 rows) | INSERT 10 posts in one call |

**Tests ORM bulk efficiency** — some ORMs turn bulk insert into N+1 individual queries.

### PAGINATION

| ID | Name | What It Does |
|----|------|-------------|
| R3 | Paginated posts | SELECT * FROM posts ORDER BY id LIMIT 20 OFFSET X |

**Tests ORM pagination overhead** — can the ORM express LIMIT/OFFSET as cleanly as raw SQL?

**Total: 13 operations.** 2 core per CRUD (Domariev style), plus 5 operations that test ORM limits (bulk, pagination, one-to-many, many-to-many × 2).

---

## 3. Measurement Protocol

### Per iteration, record:

```javascript
{
  executionTimeMs: 12.345,   // process.hrtime.bigint()
  heapUsedMB: 45.2           // process.memoryUsage().heapUsed
}
```

### Iterations per operation:

| Dataset Size | Iterations | Meets requirement? |
|-------------|-----------|-----------|
| 100 | 20 | Yes (>10) |
| 1000 | 20 | Yes (>10) |
| 10000 | 20 | Yes (>10) |
| 100000 | 10 | Yes (=10) |

### Stability protocol — Professor's requirement #8

> "repeat an experiment about 10 times and calculate the average and check if the results are stable and are not affected by e.g. buffering, other tasks"

**How we address each part:**

| Professor's concern | How we handle it |
|-----------|--------|
| Repeat 10+ times | 10-20 iterations per operation |
| Calculate the average | Mean execution time computed from all iterations |
| Results not affected by buffering | 3 warmup runs before measured iterations to fill PG cache |
| Results not affected by other tasks | GC forced before each iteration, same machine, no other heavy processes |
| Check stability | Coefficient of Variation (CV %) — if CV < 15% results are stable |

### Statistics computed per (operation, dataset, framework):

| Stat | Why |
|------|-----|
| Mean | Average time — the main comparison number |
| Min | Best case |
| Max | Worst case |
| StdDev | How spread out the results are |
| Coefficient of Variation (CV %) | `(stdDev / mean) × 100` — stability metric. CV < 15% = stable results |
| Overhead % vs Raw SQL | `((orm - raw) / raw) × 100` — main comparison metric |

Like Domariev — mean and CV are the core numbers. Everything else supports them.

---

## 4. Warmup

```
1. Insert seed data
2. Run each operation 3 times (results discarded)
3. Then run the measured iterations
```

### Before each measured iteration:

```javascript
if (global.gc) global.gc();
await new Promise(r => setTimeout(r, 50));
```

Run with `node --expose-gc`.

---

## 5. Code Complexity

For each of the 14 operations, count lines of code per framework.

Also: does the framework give TypeScript types for this operation? Full / Partial / None.

---

## 6. Environment

```
- OS: macOS Sequoia 15.7.3
- Node.js: 20.11.0 LTS
- PostgreSQL: 15 (Docker)
- Localhost, no network latency
- No other heavy processes running
```

---

## 7. Project Structure

```
ORM-Analysis-Master-Thesis/
├── results/
│   └── results-{size}.json     (per-framework, per-operation stats)
├── src/
│   ├── db/
│   │   ├── raw-sql.js          (pg pool + seeding)
│   │   ├── prisma.js           (PrismaClient + all operations)
│   │   ├── typeorm.js          (DataSource + all operations)
│   │   ├── sequelize.js        (Sequelize + all operations)
│   │   └── drizzle.js          (drizzle postgres-js + all operations)
│   ├── benchmark.js            (orchestrator: warmup, measure, save results)
│   ├── reporter.js             (output summary tables + overhead %)
│   ├── stats.js                (mean, min, max, stddev, CV, overhead%)
│   ├── schema-setup.js          (create tables from schema.sql)
│   ├── schema.sql              (CREATE TABLE statements)
│   └── config.js               (DATABASE_URL, DATASET_SIZES)
├── prisma/
│   └── schema.prisma
├── package.json
├── docker-compose.yml
└── .env
```

---

## 8. Dependencies

```json
{
  "dependencies": {
    "pg": "^8.13",
    "@prisma/client": "^6.2",
    "prisma": "^6.2",
    "typeorm": "^0.3.20",
    "sequelize": "^6.37",
    "pg-hstore": "^2.3",
    "drizzle-orm": "^0.36",
    "drizzle-kit": "^0.28",
    "reflect-metadata": "^0.2.2"
  }
}
```

---

## 9. Run Order

```
1. docker compose up -d postgres
2. node src/schema-setup.js
3. npm install
4. npx prisma generate (and init other ORMs)
5. node --expose-gc src/benchmark.js  (runs all sizes × all frameworks × all 14 ops)
6. node --expose-gc src/reporter.js   (output summary tables)
7. docker compose down
```

---

## 10. ORM Schema Definitions (all express the same 2 tables)

### Raw SQL (schema.sql)

```sql
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

### Prisma (schema.prisma)

```prisma
model users {
  id         Int      @id @default(autoincrement())
  username   String   @unique @db.VarChar(50)
  email      String   @unique @db.VarChar(100)
  created_at DateTime @default(now())
  posts      posts[]
}

model posts {
  id                Int            @id @default(autoincrement())
  title             String         @db.VarChar(200)
  content           String?
  published         Boolean        @default(false)
  views             Int            @default(0)
  author            users          @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId          Int
  categories        categories[]   @relation("PostToCategory")
  created_at        DateTime       @default(now())
}

model categories {
  id     Int     @id @default(autoincrement())
  name   String  @unique @db.VarChar(50)
  posts  posts[] @relation("PostToCategory")
}
```

### TypeORM

```ts
@Entity('users')
class User {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 50 }) username: string;
  @Column({ length: 100 }) email: string;
  @CreateDateColumn() created_at: Date;
  @OneToMany(() => Post, post => post.author) posts: Post[];
}

@Entity('posts')
class Post {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 200 }) title: string;
  @Column({ type: 'text', nullable: true }) content: string;
  @Column({ default: false }) published: boolean;
  @Column({ default: 0 }) views: number;
  @ManyToOne(() => User, user => user.posts)
  @JoinColumn({ name: 'author_id' }) author: User;
  @CreateDateColumn() created_at: Date;
  @ManyToMany(() => Category)
  @JoinTable({
    name: 'post_categories',
    joinColumn: { name: 'post_id' },
    inverseJoinColumn: { name: 'category_id' }
  })
  categories: Category[];
}

@Entity('categories')
class Category {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 50, unique: true }) name: string;
}
```

### Sequelize

```js
const User = sequelize.define('users', {
  username: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  email: { type: DataTypes.STRING(100), unique: true, allowNull: false },
});

const Post = sequelize.define('posts', {
  title: { type: DataTypes.STRING(200), allowNull: false },
  content: { type: DataTypes.TEXT },
  published: { type: DataTypes.BOOLEAN, defaultValue: false },
  views: { type: DataTypes.INTEGER, defaultValue: 0 },
});

User.hasMany(Post);
Post.belongsTo(User, { foreignKey: 'author_id' });

const Category = sequelize.define('categories', {
  name: { type: DataTypes.STRING(50), unique: true, allowNull: false },
});

const PostCategory = sequelize.define('post_categories', {
  post_id: { type: DataTypes.INTEGER, primaryKey: true },
  category_id: { type: DataTypes.INTEGER, primaryKey: true },
}, { tableName: 'post_categories' });

Post.belongsToMany(Category, { through: PostCategory });
Category.belongsToMany(Post, { through: PostCategory });
```

### Drizzle

```ts
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  created_at: timestamp('created_at').defaultNow(),
});

const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content'),
  published: boolean('published').default(false),
  views: integer('views').default(0),
  author_id: integer('author_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow(),
});

const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
});

const postCategories = pgTable('post_categories', {
  postId: integer('post_id').references(() => posts.id).notNull(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.postId, t.categoryId] }),
}));
```

---

## 11. Thesis Structure

| Chapter | What Goes In |
|---------|-------------|
| 1. Introduction | Background, problem statement, 5 research questions (includes maintainability as professor requested) |
| 2. Technologies | 1-2 pages each: Node.js, PostgreSQL, Prisma, TypeORM, Sequelize, Drizzle, pg driver. Why each was chosen, their properties and limitations. Professor's #1 remark. |
| 3. Methodology + Implementation | ERD diagram, attribute descriptions (Section 1 above), 5 ORM schema definitions (Section 10 above), benchmark protocol, testing environment. Merged chapter per professor's #5 remark. |
| 4. Results | For each operation at each dataset size: table with mean/min/max/stddev/CV. Comparison tables showing overhead %. Charts. Same statistical style as Domariev. |
| 5. Conclusions | Summary of findings, recommendations for when to use which tool, limitations, future work |


| Comparison item | Domariev's Thesis | Your Thesis |
|---------------|-------------------|-------------|
| Operations | Insert, Retrieve, Update, Delete (basic) | CRUD × 8 + JOIN, bulk, pagination, M:N × 2 = 13 |
| Dataset sizes | 100, 1000, 10000, 100000 | 100, 1000, 10000, 100000 |
| What varies across | 4 different databases (MSSQL, Memcached, MongoDB, Neo4j) | 5 ORMs + Raw SQL (pg) |
| Tables | 5+ (in a hotel reservation schema) | 4 (users, posts, categories, post_categories) |
| Relationships | FK relations only | One-to-many + Many-to-many |
| Stat depth | Deep: quartiles, box plots, IQR, CV, percentage distributions | Moderate: mean, min, max, stddev, CV, overhead % |
| Tables in results | 70+ | Similar format, different content |
| Charts in results | 83 | Distribution, normalized, overhead % |
| Code complexity | Not measured | Yes — LOC per operation + type safety |
| Memory tracking | No | Yes — heap per operation |
