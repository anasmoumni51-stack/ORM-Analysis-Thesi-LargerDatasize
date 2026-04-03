# Analysis of ORM Query Languages: Expressiveness and Limitations — A Comparative Study with Raw SQL Baseline

**Anas Moumni s34851**

Master Thesis / Magisterska
Supervisor: Dr. Paweł Lenkiewicz

Warsaw, 2025

---

## Contents

1. Introduction
2. Concept of Development
3. Technologies and Tools Used in Work
4. Implementation
5. Results and Analysis *(to be completed after benchmarks)*
6. Conclusions *(to be completed after benchmarks)*
Bibliography

---

## Abstract

This master's thesis analyzes query languages in Object-Relational Mapping (ORM) frameworks, examining their expressiveness and limitations compared to raw SQL execution. The study compares four popular ORM frameworks in the Node.js ecosystem — Prisma, TypeORM, Sequelize, and Drizzle — alongside the native PostgreSQL driver (pg) as a performance baseline. The research includes performance measurements (query execution time), memory consumption analysis, code complexity assessment (lines of code for equivalent operations), and evaluation of language expressiveness (which SQL constructs each ORM can express natively). Tests were conducted for fundamental database operations including Create, Read, Update, and Delete, as well as table joins, bulk inserts, and many-to-many relationship handling. Results are measured across four dataset sizes (100, 1 000, 10 000, and 100 000 records), with each operation repeated 10-20 times to ensure statistical reliability through coefficient of variation analysis. The thesis provides practical guidance for developers choosing between raw SQL and ORM frameworks depending on project requirements, team expertise, and performance needs.

key words: benchmarking, expressiveness, Node.js, ORM, PostgreSQL, SQL

---

## 1. Introduction

Every day, large amounts of data are generated and stored in databases around the world. After filtering out irrelevant information, around 70 percent of this data still needs to be stored and processed on the database side. This data supports many different functions including user interactions, data analysis, and business operations. The choice of how to communicate with a database is an important decision that every application developer needs to make.

The choice between using Object-Relational Mapping (ORM) frameworks and writing raw SQL directly is a common decision in web development. ORMs have existed since the late 1990s, starting with Hibernate in the Java ecosystem. Their purpose is to reduce the difference between object-oriented programming languages and relational databases. This allows developers to work with data using objects in their programming language instead of writing direct SQL queries. Despite their widespread use, the decision to use an ORM is not always simple because there are trade-offs between development speed, code maintainability, and runtime performance.

Senior developers often prefer raw SQL because it gives maximum performance and complete control over what the database executes. Junior developers tend to prefer ORMs because they are easier to use and provide type safety and faster development time. Both opinions have reasons, but most discussions about this topic in developer communities are based on opinions rather than actual measured data.

This thesis aims to answer this question with real performance data and measurements rather than just opinions. It conducts a comparative study of query languages in ORM frameworks, examining their expressiveness, limitations, and performance characteristics compared to raw SQL. The study evaluates four popular ORM frameworks in the Node.js ecosystem — Prisma, TypeORM, Sequelize, and Drizzle — alongside the native PostgreSQL driver (pg) as a performance baseline. The evaluation focuses on four dimensions: query execution time (performance), memory usage (resource efficiency), code complexity (developer productivity), and language expressiveness (what each ORM can and cannot represent without using raw SQL).

The scope of this research includes the fundamental database operations — Create, Read, Update, and Delete — as well as more complex operations such as table joins, bulk inserts, pagination, and many-to-many relationship handling. These operations represent the core functionality that any web application needs when working with a database. By measuring the same operations implemented through five different approaches, this thesis provides practical data that can help developers choose the right tool for their project.

### 1.1 The Purpose of the Work

The primary objective of this thesis is to evaluate and compare the performance, expressiveness, and developer experience of Object-Relational Mapping frameworks against raw SQL execution. This is achieved by implementing an identical set of database operations across five different approaches and measuring their behaviour under controlled conditions.

The first approach uses the native PostgreSQL driver (pg) as a baseline, representing the most direct path between the application code and the database engine. The remaining four approaches use popular Node.js ORM frameworks: Prisma (a modern schema-first framework with code generation), TypeORM (a decorator-based framework inspired by Java's Hibernate), Sequelize (the oldest ORM in the Node.js ecosystem), and Drizzle (a lightweight, type-safe query builder with a SQL-like API).

The performance of all five approaches is evaluated through the execution of database operations, with key metrics including query execution time, memory consumption during operations, lines of code required for equivalent functionality, and the extent to which each framework can express complex SQL constructs natively. By comparing these metrics across frameworks, this thesis provides an understanding of the trade-offs involved in choosing an ORM versus raw SQL.

### 1.2 Research Questions

The main research questions guiding this thesis are:

1. How much slower are ORM frameworks compared to raw SQL for different types of database operations?

2. How do ORMs compare in terms of memory consumption during query execution?

3. What is the relationship between code complexity (lines of code) and runtime performance — how many lines does each framework require for equivalent operations?

4. Which ORM frameworks provide the strongest type safety, and how does this impact developer productivity?

5. What SQL constructs cannot be expressed natively through each ORM's API, and how easy is it to fall back to raw SQL when the ORM reaches its limits?

6. When should an ORM be used instead of raw SQL in real projects, considering the project's performance requirements, team expertise, and maintainability needs?

---

## 2. Concept of Development

The concept of development is based on implementing a unified database schema within five different data access approaches. The first approach uses the native PostgreSQL driver (pg) directly with SQL queries written as strings and executed through the driver. This approach serves as the performance baseline with near-zero overhead. The second approach uses Prisma with its schema-first design and code generation. The third approach uses TypeORM with decorator-based entity definitions. The fourth approach uses Sequelize with programmatic model definitions. The fifth approach uses Drizzle with a SQL-like API that generates SQL at compile time through TypeScript's type inference system.

The process begins with the creation of a relational database schema consisting of four tables that represent a simplified blogging platform: users, posts, categories, and a many-to-many junction table (post_categories). This schema is intentionally simple and provides a fair and consistent basis for comparison between all five implementations. Synthetic data is generated using SQL scripts and inserted into the database for each dataset size.

Following the implementation, the second stage involves collecting statistical metrics related to query execution performance. Each operation is executed repeatedly under controlled conditions with the same datasets used for all implementations. Execution time is measured with nanosecond precision, heap memory is recorded before and after each operation, and a warmup phase precedes every measured run to populate the database buffer cache. The final step includes a comparative analysis of the collected results to determine the performance overhead, memory efficiency, code complexity, and expressiveness of each ORM framework relative to raw SQL.

---

## 3. Technologies and Tools Used in Work

### 3.1 Node.js

Node.js is a cross-platform, open-source JavaScript runtime environment built on the V8 JavaScript engine, which is the same engine that powers the Google Chrome web browser. Since its initial release in 2009 by Ryan Dahl, Node.js has become one of the most popular platforms for server-side development, particularly for building scalable network applications and REST APIs. Its event-driven, non-blocking I/O model enables it to handle multiple concurrent connections efficiently, making it well-suited for database-intensive web applications [2].

The key architectural decision that makes Node.js different from traditional server-side platforms is its single-threaded event loop model. Instead of creating a new thread for each incoming request (like Apache or PHP), Node.js processes requests sequentially on a single thread. When an operation involves I/O — such as reading from a database or making a network request — Node.js registers a callback function and continues processing other requests. When the I/O operation completes, the callback is added back to the event queue. This design allows Node.js to handle thousands of concurrent connections with minimal system resource usage.

Node.js uses an ecosystem of packages managed through the npm (Node Package Manager) registry, which hosts over two million packages, making it the world's largest software registry. The version used in this study is Node.js 20.11.0 LTS (Long-Term Support), which provides stable APIs, modern JavaScript features including top-level await and native fetch, and the `process.hrtime.bigint()` API used for high-precision execution time measurement in the benchmark tests.

In the context of this master's thesis, Node.js serves as the runtime environment for all benchmark implementations. Each ORM framework and the raw SQL driver are implemented as JavaScript modules running within the same Node.js process version, ensuring that execution time results are not affected by differences in runtime versions. The JavaScript heap memory usage is also recorded during each operation using the `process.memoryUsage()` API, providing a measure of the memory overhead introduced by each ORM framework's internal data structures and abstraction layers.

A characteristic of Node.js relevant to ORM analysis is its single-threaded event loop. Because JavaScript operations in Node.js run on a single thread, any CPU-intensive work performed by an ORM's internal query processing (such as object mapping, serialization, or transformation) competes for the same execution resources used by the application itself. This makes the overhead introduced by ORMs particularly visible in Node.js compared to multi-threaded runtimes where such processing could happen in parallel.

### 3.2 PostgreSQL

PostgreSQL is an open-source, standards-compliant relational database management system (RDBMS) that supports both SQL (relational) and JSON (non-relational) querying. Originally developed at the University of California, Berkeley in the 1980s as POSTGRES, it has evolved into one of the most powerful and feature-rich open-source database systems available. Its reputation for reliability, data integrity, and advanced feature set has made it a common choice in production deployments across industries [3].

PostgreSQL version 15 is used in this study, running in a Docker container to ensure a clean, isolated testing environment with consistent configuration. PostgreSQL was selected as the database engine for all benchmark implementations for several reasons. First, it is the most commonly paired database with Node.js in modern web development, according to developer surveys. Second, PostgreSQL offers advanced features that are commonly cited in the ORM expressiveness debate, including full-text search, window functions, Common Table Expressions (CTEs), lateral joins, and JSONB columns. These features serve as a useful testing ground for determining which ORM constructs can fully represent PostgreSQL's SQL dialect and which require fallback mechanisms.

Key features of PostgreSQL relevant to this study include:

- **ACID Compliance**: PostgreSQL fully adheres to ACID properties (Atomicity, Consistency, Isolation, Durability), ensuring data integrity even in the event of system failures or concurrent access. This is essential for the many-to-many creation operations tested in this benchmark.

- **Advanced Query Types**: Beyond standard SQL, PostgreSQL supports window functions (`RANK()`, `ROW_NUMBER()`, `SUM() OVER`), Common Table Expressions (WITH clauses), recursive queries, lateral joins for correlated subqueries, full-text search with `tsvector` and `tsquery`, array types and operators, and native JSON/JSONB columns with querying capabilities.

- **Indexing Support**: PostgreSQL offers multiple index types including B-tree (default), GIN (Generalized Inverted Index for full-text and JSONB), GIST (Generalized Search Tree for geometric data), and BRIN (Block Range Index for large tables). Proper index configuration is essential for fair benchmark results.

- **Query Planner**: PostgreSQL uses a cost-based query optimizer that considers multiple execution plans for each query and selects the most efficient one. The query planner's decisions can be affected by how ORMs construct SQL — for instance, parameterized queries may have different plans than queries with inline literals.

- **Connection Pooling**: PostgreSQL manages connections through a process-based model where each connection spawns a backend process. For high-concurrency applications, external connection poolers such as PgBouncer are often used. In this thesis, all ORM frameworks and the raw SQL driver use a connection pool of size 5 to ensure fair comparison.

- **Foreign Key Constraints with CASCADE**: PostgreSQL supports foreign key constraints with `ON DELETE CASCADE` options, which are used in the `post_categories` junction table to automatically remove many-to-many associations when a post or category is deleted.

In the context of this thesis, PostgreSQL serves as the target database against which all five data access approaches execute their queries. The same database instance, schema, and data are used for all measurements, isolating the variable being tested to the data access layer alone.

### 3.3 Prisma

Prisma is an ORM library released in 2019 by Prisma Inc. (formerly Graphcool). It takes a schema-first approach to data access, where the developer defines the data model in a declarative schema language called Prisma Schema Language (PSL), and Prisma generates a fully type-safe database client based on the schema. This approach differs significantly from traditional ORMs that use decorators or configuration objects inline with application code [4].

Prisma operates through two components: the Prisma Client (a TypeScript/JavaScript library that provides the query API) and the Prisma Query Engine (a standalone Rust binary responsible for generating SQL from the client's method calls). This architecture means that every query made through Prisma's API is translated into SQL by the query engine, which then communicates with the database. The query engine's presence introduces additional latency compared to direct driver execution, but it also enables Prisma to provide features such as automatic query parameterization, type-safe result mapping across multiple databases, and an introspect-and-generate workflow that can adapt to existing databases.

A Prisma schema definition for the users table looks like this:

```prisma
model users {
  id          Int      @id @default(autoincrement())
  username    String   @unique @db.VarChar(50)
  email       String   @unique @db.VarChar(100)
  posts       posts[]
  created_at  DateTime @default(now())
}
```

Querying with Prisma uses a fluent method chain API. A simple insert and read operation look like the following:

```javascript
// Insert a new user
const newUser = await prisma.users.create({
  data: {
    username: 'john_doe',
    email: 'john@example.com'
  }
});

// Retrieve a user by ID
const user = await prisma.users.findUnique({
  where: { id: newUser.id }
});
```

Key features of Prisma include:

- **Schema-First Design**: The entire data model is defined in a single `.prisma` schema file. Changes to the schema can be applied to the database through migrations (`prisma migrate dev`), or the schema can be introspected from an existing database.

- **Type Safety**: Prisma generates TypeScript types directly from the schema definition, providing compile-time type checking for all queries and results. Operations like `await prisma.users.findUnique({ where: { id: 5 } })` are fully typed, with the return type inferred from the database schema.

- **Relation Handling**: Prisma provides a declarative API for managing one-to-one, one-to-many, and many-to-many relationships. Related records can be created, connected, or disconnected through nested writes without requiring transactions to be managed manually.

- **Transaction Support**: Prisma supports both sequential transactions (executing multiple queries in sequence with automatic rollback on failure) and interactive transactions (where queries depend on each other's results within a transaction scope).

- **Batch Operations**: Prisma's `createMany` API allows inserting multiple records in a single query, though it lacks support for updating multiple records with different values in a single statement without falling back to raw SQL.

- **Raw SQL Fallback**: Prisma provides `$queryRaw` for raw SQL queries with type safety and `$executeRaw` for raw SQL execution without result mapping, allowing developers to bypass the ORM when needed.

Limitations of Prisma include its inability to express certain PostgreSQL-specific features natively. Window functions (`RANK() OVER`, `ROW_NUMBER() OVER`), Common Table Expressions (WITH clauses), lateral joins, and full-text search with `tsvector` cannot be expressed through Prisma's type-safe API and require a fallback to `$queryRaw`. Additionally, Prisma's query engine adds measurable latency to each query compared to direct driver execution. The generated client can also be slow to initialize in cold-start scenarios.

In the context of this master's thesis, Prisma represents one of the most modern ORM approaches in the Node.js ecosystem. Its schema-first design and code generation workflow contrast with the decorator-based approach of TypeORM and the programmatic API of Sequelize, making it a useful point of comparison for both performance and developer experience.

### 3.4 TypeORM

TypeORM is an ORM library for TypeScript and JavaScript released in 2016. It is heavily influenced by the design of Java's Hibernate framework and Microsoft's Entity Framework, providing a decorator-based approach where entity classes are annotated with metadata that maps them to database tables. TypeORM supports both Active Record and Data Mapper patterns, giving developers flexibility in how they structure their data access layer [5].

TypeORM's architecture relies on runtime metadata to translate between TypeScript classes and database tables. When an entity class is decorated with `@Entity()`, `@Column()`, and relationship annotations, TypeORM reads these decorators to build an internal representation of the database schema. At query time, TypeORM's query builder constructs SQL strings from the developer's fluent API calls, which are then executed through the underlying database driver.

A TypeORM entity class for the users table looks like this:

```typescript
@Entity('users')
class User {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 50 }) username: string;
  @Column({ length: 100 }) email: string;
  @CreateDateColumn() created_at: Date;
  @OneToMany(() => Post, post => post.author) posts: Post[];
}
```

Querying with TypeORM uses the Repository pattern. A simple insert and read operation look like the following:

```typescript
const userRepository = dataSource.getRepository(User);

// Insert a new user
const newUser = userRepository.create({
  username: 'john_doe',
  email: 'john@example.com'
});
await userRepository.save(newUser);

// Retrieve a user by ID
const user = await userRepository.findOneBy({ id: newUser.id });
```

Key features of TypeORM include:

- **Decorator-Based Entities**: Entity classes are defined using TypeScript decorators (`@Entity`, `@PrimaryGeneratedColumn`, `@Column`, `@OneToMany`, `@ManyToMany`, etc.) that describe the mapping between the class and the database table. This inline approach keeps entity definitions close to the code using them.

- **Repository Pattern**: TypeORM provides the Repository pattern for performing database operations on entities. Each entity type has an associated repository that provides standard CRUD methods (`save`, `find`, `findOne`, `remove`) along with a QueryBuilder for more complex queries.

- **QueryBuilder API**: TypeORM's QueryBuilder uses a fluent, chainable API that closely resembles SQL syntax. It supports JOINs, subqueries, CTEs (Common Table Expressions), GROUP BY, HAVING clauses, and window functions, making it one of the most expressive ORM query builders in the Node.js ecosystem.

- **Relationship Management**: TypeORM provides comprehensive support for one-to-one, one-to-many, many-to-one, and many-to-many relationships with eager and lazy loading options. Many-to-many relationships can be managed through an implicit junction table or through an explicit join entity.

- **Migrations**: TypeORM generates migration files based on entity changes or can run migrations manually. It supports both SQL-based and TypeScript-based migrations.

- **Multiple Database Support**: TypeORM supports PostgreSQL, MySQL, MariaDB, SQLite, Microsoft SQL Server, Oracle, and MongoDB, allowing the same codebase to target different databases with minimal changes.

Limitations of TypeORM include the complexity introduced by decorators, which are runtime-dependent and require the `reflect-metadata` polyfill. The decorator-based approach can be confusing for developers unfamiliar with the pattern, and debugging issues with entity mappings can be challenging. The library's documentation, while comprehensive, is sometimes difficult to navigate due to its mixing of Active Record and Data Mapper examples.

In the context of this master's thesis, TypeORM represents a middle ground between raw SQL and high-level ORMs like Prisma. Its QueryBuilder provides more expressiveness than Prisma's native API for complex queries, but at the cost of increased verbosity. Comparing TypeORM's performance against the other frameworks provides insight into the trade-offs of different ORM design philosophies.

### 3.5 Sequelize

Sequelize is the oldest ORM framework in the Node.js ecosystem, first released in 2010. It has a large community, extensive documentation, and a stable API that has been tested in production applications for over a decade. Sequelize uses a programmatic model definition approach where database models are created by calling `sequelize.define()` with a field specification object, rather than using decorators or a schema file [6].

Sequelize's architecture revolves around a central Sequelize instance that manages the connection pool and model registry. Each model is registered with the instance and can have associations defined through method calls (`hasMany`, `belongsTo`, `belongsToMany`). When a query is executed, Sequelize's query generator translates the JavaScript method calls into SQL strings, which are then executed through the underlying database driver (pg for PostgreSQL).

A Sequelize model definition for the users table looks like this:

```javascript
const User = sequelize.define('users', {
  username: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  email: { type: DataTypes.STRING(100), unique: true, allowNull: false },
});
```

Relationships between models are defined separately using association methods:

```javascript
User.hasMany(Post);
Post.belongsTo(User, { foreignKey: 'author_id' });
```

Querying with Sequelize uses the model instance methods. A simple insert and read operation look like the following:

```javascript
// Insert a new user
const newUser = await User.create({
  username: 'john_doe',
  email: 'john@example.com'
});

// Retrieve a user by ID
const user = await User.findByPk(newUser.id);
```

Key features of Sequelize include:

- **Programmatic Model Definition**: Models are defined using `sequelize.define()` with field specifications that declare data types, constraints, and default values. This approach does not require decorators or code generation, making it straightforward to understand.

- **Association-Based Relationships**: Sequelize provides a clear API for defining one-to-one, one-to-many, and many-to-many relationships. Many-to-many relationships use a junction model defined through `belongsToMany`, and Sequelize automatically manages the junction table.

- **Query Interface**: Sequelize provides multiple ways to query data, including the high-level `findAll`, `findOne`, `findByPk` methods for simple operations, and the more powerful `sequelize.query()` method for raw SQL execution. The find methods support filtering, ordering, pagination, includes (for eager loading related models), and grouping.

- **Hooks and Validations**: Sequelize supports model lifecycle hooks (`beforeCreate`, `afterUpdate`, etc.) that allow developers to inject logic into the data access pipeline. It also provides field-level validation that runs before data is sent to the database.

- **Migrations and Seeding**: Sequelize provides a CLI tool for generating and running migration files, as well as seed scripts for populating databases with test data.

- **Community and Ecosystem**: Being the oldest Node.js ORM, Sequelize has the largest community and the widest range of tutorials and examples available online.

Limitations of Sequelize include performance overhead, particularly for bulk operations where the framework serializes each model instance and executes them individually rather than using bulk INSERT statements. Sequelize's type safety is limited compared to TypeORM and Prisma — the core package relies on TypeScript type inference over plain JavaScript objects, which can lead to subtle type errors.

In the context of this master's thesis, Sequelize represents the traditional ORM approach in the Node.js ecosystem. Its age and maturity make it a useful reference point for comparing how newer frameworks like Prisma and Drizzle have evolved in response to the performance shortcomings of the first generation of Node.js ORMs.

### 3.6 Drizzle

Drizzle is a lightweight, type-safe ORM library for TypeScript released in the early 2020s. It takes a fundamentally different approach from traditional ORMs by not mapping database tables to classes at all. Instead, Drizzle provides a SQL-like API built on composable TypeScript functions and objects that generate SQL strings at compile time through TypeScript's type inference system [7].

Drizzle's architecture eliminates much of the abstraction overhead found in traditional ORMs because it does not perform object-to-table mapping at runtime. The developer writes queries using Drizzle's function composition API, which generates a SQL string that is then executed through the underlying database driver. The type inference system ensures that only valid column names and operations can be used in queries, catching errors at compile time rather than at runtime.

A Drizzle schema definition for the users table looks like this:

```typescript
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  created_at: timestamp('created_at').defaultNow(),
});
```

Querying with Drizzle uses a composable API that closely resembles SQL syntax. A simple insert and read operation look like the following:

```typescript
// Insert a new user
const [newUser] = await db.insert(users).values({
  username: 'john_doe',
  email: 'john@example.com'
}).returning();

// Retrieve a user by ID
const user = await db.select().from(users)
  .where(eq(users.id, newUser.id)).limit(1);
```

Key features of Drizzle include:

- **SQL-Like API**: Drizzle's query API closely mirrors SQL syntax, making it intuitive for developers who already understand SQL. Operations like `select`, `from`, `where`, `join`, `groupBy`, and `orderBy` map directly to their SQL equivalents.

- **Compile-Time Type Safety**: Drizzle's schema definitions are TypeScript objects that provide type inference for all queries. The return type of any query is derived from the columns selected, ensuring type safety without the need for code generation or decorators.

- **No Runtime Overhead**: Because Drizzle generates SQL strings through function composition rather than object mapping at runtime, it introduces minimal overhead compared to the raw SQL baseline. There is no query engine binary, no decorator metadata processing, and no object instantiation per result row.

- **PostgreSQL-Specific Features**: Drizzle provides native support for PostgreSQL array columns, JSONB columns with type-safe extraction, and raw SQL expression injection through the `sql` template literal tag. This makes it more expressive than Prisma and Sequelize for PostgreSQL-specific operations.

- **Migrations**: Drizzle provides a migration toolkit that can generate migration files from schema changes or allow developers to write migrations manually in SQL.

Limitations of Drizzle include its relatively young ecosystem compared to Sequelize and TypeORM. The library's documentation is improving but not as comprehensive. While Drizzle's API is powerful, it still cannot express every PostgreSQL feature natively — lateral joins and some forms of window functions may still require raw SQL fallback.

In the context of this master's thesis, Drizzle represents a middle ground between raw SQL and traditional ORMs. Its minimal overhead and SQL-like API make it a useful contrast to the more abstract approaches of Prisma, TypeORM, and Sequelize.

### 3.7 pg (Node-Postgres)

The `pg` package (often called node-postgres) is a native PostgreSQL client library for Node.js. It provides a direct interface between JavaScript code and a PostgreSQL database through parameterized queries, connection pooling, and transaction support. It does not include any object-relational mapping functionality — it sends SQL strings to the database and returns result sets as plain JavaScript objects [8].

The pg package serves as the baseline implementation in this study because it represents the most direct path between the Node.js application and the PostgreSQL database engine. There is no query translation layer, no object mapping, no automatic eager loading, and no abstraction between the developer's SQL and the database. Any performance overhead observed in the ORM implementations can be attributed to the abstraction layers those frameworks introduce on top of the pg driver.

A raw SQL insert and read operation using the pg driver look like the following:

```javascript
// Insert a new user
const result = await client.query(
  'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
  ['john_doe', 'john@example.com']
);
const newUser = result.rows[0];

// Retrieve a user by ID
const { rows } = await client.query(
  'SELECT * FROM users WHERE id = $1',
  [newUser.id]
);
const user = rows[0];
```

Key features of pg include:

- **Parameterized Queries**: The pg package supports parameterized queries using the `$1`, `$2`, `$3` syntax for positional parameters. This protects against SQL injection and allows PostgreSQL to reuse query execution plans across multiple invocations.

- **Connection Pooling**: The pg package includes a built-in connection pool (`pg.Pool`) that manages a configurable number of database connections. Connections are borrowed from the pool for query execution and returned when the query completes.

- **Transaction Support**: Transactions can be managed manually using `BEGIN`, `COMMIT`, and `ROLLBACK` SQL statements, or through pg's `pool.query()` method which executes queries within a single connection for atomicity.

- **No ORM Overhead**: Since pg does not perform any query translation or object mapping, it introduces minimal overhead beyond the network protocol communication and result serialization. It serves as the 100 percent performance baseline against which ORM overhead is calculated.

Limitations of pg include the requirement for developers to write and maintain raw SQL strings, manage query result parsing manually, and handle schema changes by updating SQL strings throughout the codebase. It provides no compile-time type checking of queries unless paired with a type-generation tool, and no automatic relationship mapping.

In the context of this master's thesis, pg establishes the performance baseline (100 percent) against which all ORM frameworks are measured. ORM performance is expressed as percentage overhead relative to pg execution times for identical operations.

---

## 4. Implementation

### 4.1 Database Schema

The database schema used in this study represents a simplified blogging platform domain. It consists of four tables: `users`, `posts`, `categories`, and `post_categories`. The schema was chosen to be simple enough for fair comparison across all five implementations while complex enough to exercise each ORM's capabilities for handling primary keys, foreign keys, unique constraints, data types, and both one-to-many and many-to-many relationships.

#### 4.1.1 Entity-Relationship Diagram

Figure 1 Database schema. Source: Own elaboration

```
┌──────────────────┐          ┌──────────────────────────────┐
│      users       │  1    N  │           posts              │
├──────────────────┤──────────┤──────────────────────────────┤
│ id       SERIAL  │          │ id          SERIAL           │
│ username VARCHAR │          │ title       VARCHAR(200)     │
│ email    VARCHAR │          │ content     TEXT             │
│ created_at TS    │          │ published   BOOLEAN          │
└──────────────────┘          │ views       INTEGER          │
                              │ author_id   INTEGER (FK) ────┐ │
                              │ created_at  TS               │ │
                              └──────────┬───────────────────┘ │
                                         │ 1                    │
                                         │                      │
                                         │ N                    │
                              ┌──────────┴──────────────────┐  │
                              │     post_categories          │  │
                              ├──────────────────────────────│──┘
                              │ post_id    INTEGER (FK) ←────┘
                              │ category_id INTEGER (FK) ────────┐
                              └──────────────────────────────────┘│
                                                                  │
┌──────────────────┐          N                                   │
│    categories    │──────────┘                                   │
├──────────────────┤                                             │
│ id       SERIAL  │                                             
│ name     VARCHAR │                                            
└──────────────────┘                                           
```

The database schema contains the following relationships:

- **One-to-Many**: Each user can create multiple posts. The `posts` table contains an `author_id` foreign key referencing `users.id`.

- **Many-to-Many**: Each post can belong to multiple categories, and each category can contain multiple posts. This relationship is managed through the `post_categories` junction table, which contains foreign keys to both `posts` and `categories` and uses a composite primary key.

#### 4.1.2 Table Descriptions

The **users** table stores user account information. Each row represents a single registered user with a unique username and email address. The table is the simplest in the schema and serves as the parent entity for the one-to-many relationship with posts.

| Attribute | Type | Description |
|-----------|------|-------------|
| id | SERIAL | Primary key that uniquely identifies the user entity |
| username | VARCHAR(50) | Unique username for display purposes, not null |
| email | VARCHAR(100) | Unique email address for identification, not null |
| created_at | TIMESTAMP | Timestamp of account creation, defaults to current time |

The **posts** table stores blog post entries. Each post is associated with a user through the `author_id` foreign key. The table includes fields for content, publication status, a view counter, and a creation timestamp.

| Attribute | Type | Description |
|-----------|------|-------------|
| id | SERIAL | Primary key that uniquely identifies the post entity |
| title | VARCHAR(200) | Post title, not null |
| content | TEXT | Post body text, nullable |
| published | BOOLEAN | Whether the post is visible publicly, defaults to false |
| views | INTEGER | Number of times the post was viewed, defaults to 0 |
| author_id | INTEGER | Foreign key referencing users(id). Identifies the author of the post |
| created_at | TIMESTAMP | Timestamp of post creation, defaults to current time |

The **categories** table stores post categories. Each category has a unique name and can be associated with multiple posts through the junction table.

| Attribute | Type | Description |
|-----------|------|-------------|
| id | SERIAL | Primary key that uniquely identifies the category entity |
| name | VARCHAR(50) | Unique category name, not null |

The **post_categories** table is a junction table that represents the many-to-many relationship between posts and categories. It uses a composite primary key consisting of both foreign keys.

| Attribute | Type | Description |
|-----------|------|-------------|
| post_id | INTEGER | Foreign key referencing posts(id). Part of the composite primary key |
| category_id | INTEGER | Foreign key referencing categories(id). Part of the composite primary key |

Both foreign keys in the `post_categories` table are configured with `ON DELETE CASCADE`, meaning that deleting a post or a category will automatically remove the associated junction entries.

### 4.2 Raw SQL Implementation

The raw SQL implementation uses the `pg` package (node-postgres) to connect to PostgreSQL and execute queries. A connection pool is created with a maximum size of 5, and each benchmark operation borrows a connection from the pool, executes the query with parameterized values, and returns the result.

The database schema is created using standard SQL DDL statements executed during initialization. An example of the full schema creation:

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

Connection pooling is configured through `pg.Pool({ max: 5, ... })`. Each benchmark operation borrows a client from the pool via `pool.connect()`, executes the query with parameterized values, and releases the client back to the pool when the operation is complete through `client.release()`.

### 4.3 Prisma Implementation

The Prisma implementation begins with a schema definition file written in Prisma Schema Language (PSL). The PSL schema defines the same four entities (users, posts, categories, post_categories) with their relationships expressed through Prisma's declarative relationship syntax:

```prisma
model users {
  id          Int       @id @default(autoincrement())
  username    String    @unique @db.VarChar(50)
  email       String    @unique @db.VarChar(100)
  posts       posts[]
  created_at  DateTime  @default(now())
}

model posts {
  id           Int          @id @default(autoincrement())
  title        String       @db.VarChar(200)
  content      String?
  published    Boolean      @default(false)
  views        Int          @default(0)
  author       users        @relation(fields: [authorId], references: [id])
  authorId     Int
  categories   categories[] @relation("PostToCategory")
  created_at   DateTime     @default(now())
}

model categories {
  id     Int     @id @default(autoincrement())
  name   String  @unique @db.VarChar(50)
  posts  posts[] @relation("PostToCategory")
}
```

After the PSL schema is written, the Prisma CLI generates a TypeScript client using `npx prisma generate`. This client provides type-safe methods for all CRUD operations. For operations that fall outside Prisma's native API capabilities, the implementation falls back to `$queryRaw` to execute raw SQL with type-safe result mapping [4].

Key characteristics of the Prisma implementation include the use of `create()` for single inserts, `createMany()` for bulk inserts, `findUnique()` for primary key lookups, `findMany()` with `where` clauses for filtered queries, and `include` for loading related records in a single call.

### 4.4 TypeORM Implementation

The TypeORM implementation uses TypeScript entity classes decorated with TypeORM decorators. Each table is represented as a class with `@Entity()` annotation, and columns are defined using `@PrimaryGeneratedColumn()`, `@Column()`, and `@CreateDateColumn()` decorators. Relationships are expressed through `@OneToMany()`, `@ManyToOne()`, `@ManyToMany()`, and `@JoinTable()` decorators [5]:

```typescript
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
}
```

For the many-to-many relationship between posts and categories, the `@ManyToMany()` decorator on both entities and an explicit `@JoinTable()` on the Post entity define the junction:

```typescript
@ManyToMany(() => Category)
@JoinTable({
  name: 'post_categories',
  joinColumn: { name: 'post_id' },
  inverseJoinColumn: { name: 'category_id' }
})
categories: Category[];
```

For operations that require more complex SQL constructs, TypeORM's QueryBuilder API is used:

```typescript
const post = await dataSource.getRepository(Post)
  .createQueryBuilder('post')
  .innerJoinAndSelect('post.author', 'user')
  .where('post.id = :id', { id })
  .getOne();
```

### 4.5 Sequelize Implementation

The Sequelize implementation uses programmatic model definitions through `sequelize.define()`. Each table is defined by calling this method with a field configuration object that specifies data types, constraints, and default values. Relationships are defined through association methods (`hasMany`, `belongsTo`, `belongsToMany`), and Sequelize automatically manages the creation of foreign keys and junction tables [6]:

```javascript
const Post = sequelize.define('posts', {
  title: { type: DataTypes.STRING(200), allowNull: false },
  content: { type: DataTypes.TEXT },
  published: { type: DataTypes.BOOLEAN, defaultValue: false },
  views: { type: DataTypes.INTEGER, defaultValue: 0 },
});

const Category = sequelize.define('categories', {
  name: { type: DataTypes.STRING(50), unique: true, allowNull: false },
});

User.hasMany(Post);
Post.belongsTo(User, { foreignKey: 'author_id' });

Post.belongsToMany(Category, { through: 'post_categories' });
Category.belongsToMany(Post, { through: 'post_categories' });
```

Querying with Sequelize uses the model methods — `create()` for inserts, `findByPk()` for primary key lookups, `findAll()` with `where` options for filtered queries, and `include` for eager loading related models. For the many-to-many relationship, the junction model is created automatically through the `through` option in the `belongsToMany` association.

### 4.6 Drizzle Implementation

The Drizzle implementation uses TypeScript schema definitions through function calls that mirror PostgreSQL's SQL syntax. Tables are defined using `pgTable()`, specifying columns through a declarative API that maps directly to PostgreSQL column types:

```typescript
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
```

For many-to-many relationships, Drizzle requires explicit join operations:

```typescript
const postCategories = pgTable('post_categories', {
  postId: integer('post_id').references(() => posts.id).notNull(),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.postId, t.categoryId] }),
}));
```

The query layer uses Drizzle's composable API — `db.insert().into().values()` for inserts, `db.select().from().where()` for queries, `db.update().set().where()` for updates, and `db.delete().from().where()` for deletions. Many-to-many queries require explicit `.innerJoin()` calls.

### 4.7 Benchmark Testing Environment

The benchmark testing environment is configured to ensure consistent and comparable results across all five implementations. The test is conducted on a macOS machine (Sequoia 15.7.3) using Node.js version 20.11.0 LTS, with PostgreSQL 15 running in an isolated Docker container. All connections are made through localhost with zero network latency.

Each operation is measured using Node.js's high-precision timer `process.hrtime.bigint()`, which provides nanosecond-accuracy timing. Memory usage is captured through `process.memoryUsage().heapUsed` before and after each operation to isolate the memory impact of the framework's query execution. To ensure result stability and rule out the influence of buffering or operating system scheduling, each operation is executed 20 times for the 100, 1 000, and 10 000 record datasets, and 10 times for the 100 000 record dataset, preceded by 3 warmup iterations that are excluded from the measurement.

Before each measured iteration, garbage collection is forced using `global.gc()` (enabled via the `--expose-gc` Node.js flag) and a 50-millisecond delay is introduced to allow the garbage collector to settle before timing begins. This approach ensures that the measured execution time reflects the actual database query overhead rather than artifacts of JavaScript memory management or cold cache state.

The dataset consists of four sizes to measure how each framework's overhead scales with data volume:

| Dataset Name | Users | Posts | Categories |
|-------------|-------|-------|------------|
| Small | 100 | 100 | 5 |
| Medium | 1 000 | 1 000 | 10 |
| Large | 10 000 | 10 000 | 15 |
| Stress | 100 000 | 100 000 | 20 |

### 4.8 Test Operations

The following operations are tested across all five implementations. Each operation is precisely defined by the table it targets, the SQL statement that corresponds to it, and the parameters it requires.

#### 4.8.1 Create Operations

- **C1 — Single Insert User**: Inserts one row into the users table with a unique username and email address. The equivalent raw SQL is: `INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *`. Tests each ORM's ability to create a single record and return the generated primary key.

- **C2 — Single Insert Post**: Inserts one row into the posts table with a title, content, and an existing author_id referencing a user. The equivalent raw SQL is: `INSERT INTO posts (title, content, author_id) VALUES ($1, $2, $3) RETURNING *`. Tests each ORM's handling of foreign key fields during creation.

- **C3 — Bulk Insert Posts (10 rows)**: Inserts 10 rows into the posts table in a single call. The equivalent raw SQL is: `INSERT INTO posts (title, content, author_id) VALUES (...), (...), ... RETURNING *`. Tests each ORM's bulk insert API and whether it generates a single SQL INSERT statement or multiple individual statements.

#### 4.8.2 Read Operations

- **R1 — Single Retrieve User by ID**: Retrieves one user row by primary key lookup. The equivalent raw SQL is: `SELECT * FROM users WHERE id = $1`. Tests each ORM's primary key query optimization.

- **R2 — Single Retrieve Post by ID**: Retrieves one post row by primary key lookup. The equivalent raw SQL is: `SELECT * FROM posts WHERE id = $1`. Tests basic entity retrieval across all frameworks.

- **R3 — Paginated Posts**: Retrieves posts ordered by id with LIMIT 20 and OFFSET X. The equivalent raw SQL is: `SELECT * FROM posts ORDER BY id LIMIT 20 OFFSET $1`. Tests each ORM's ability to express LIMIT and OFFSET in pagination queries.

#### 4.8.3 Update Operations

- **U1 — Single Update User**: Updates the email field of one user identified by primary key. The equivalent raw SQL is: `UPDATE users SET email = $1 WHERE id = $2 RETURNING *`. Tests each ORM's single-row update API and its ability to return the updated record.

- **U2 — Single Update Post**: Updates the title and views fields of one post identified by primary key. The equivalent raw SQL is: `UPDATE posts SET title = $1, views = $2 WHERE id = $3 RETURNING *`. Tests multi-field updates through each ORM's update interface.

#### 4.8.4 Delete Operations

- **D1 — Single Delete User by ID**: Deletes one user by primary key. The equivalent raw SQL is: `DELETE FROM users WHERE id = $1`. Tests each ORM's deletion API and foreign key constraint handling.

- **D2 — Bulk Delete Posts by Author**: Deletes all posts where author_id equals a given user id. The equivalent raw SQL is: `DELETE FROM posts WHERE author_id = $1`. Due to `ON DELETE CASCADE`, this also removes associated post_categories entries automatically. Tests each ORM's bulk delete capability and cascade handling.

#### 4.8.5 Relationship Operations

- **J1 — Post with Author (JOIN)**: Retrieves a single post along with its associated author user record using a JOIN on the `author_id` foreign key. The equivalent raw SQL is: `SELECT p.*, u.username FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = $1`. Tests each ORM's relationship loading strategy — whether it generates a single SQL JOIN, uses two separate SELECT queries, or preloads the related entity.

- **M1 — Create Post with Categories (Many-to-Many)**: Inserts a new post and assigns it to 3 categories by inserting 3 rows into the post_categories junction table, all within a single transaction. The equivalent raw SQL is: `INSERT INTO posts (...) VALUES (...) RETURNING id` followed by `INSERT INTO post_categories (post_id, category_id) VALUES ($1, $2), ($1, $3), ($1, $4)`. Tests each ORM's ability to handle many-to-many creation through a single API call.

- **M2 — Retrieve Post with Categories (Many-to-Many)**: Retrieves a post along with all its associated categories, traversing through the post_categories junction table. The equivalent raw SQL is: `SELECT p.*, c.name FROM posts p JOIN post_categories pc ON pc.post_id = p.id JOIN categories c ON c.id = pc.category_id WHERE p.id = $1`. Tests each ORM's many-to-many relationship loading and result assembly.

---

## Bibliography

[1] Domariev, V. (2025). *A comparative study of multi-database and single-database systems: performance and usability*. Master's thesis. Polsko-Japońska Akademia Technik Komputerowych, Warsaw.

[2] OpenJS Foundation. (2024). *Node.js Documentation*. Retrieved from https://nodejs.org/docs/

[3] PostgreSQL Global Development Group. (2024). *PostgreSQL Documentation*. Retrieved from https://www.postgresql.org/docs/

[4] Prisma Inc. (2024). *Prisma Documentation*. Retrieved from https://www.prisma.io/docs/

[5] TypeORM. (2024). *TypeORM Documentation*. Retrieved from https://typeorm.io

[6] Sequelize. (2024). *Sequelize Documentation*. Retrieved from https://sequelize.org/

[7] Drizzle Team. (2024). *Drizzle ORM Documentation*. Retrieved from https://orm.drizzle.team/docs

[8] node-postgres. (2024). *node-postgres Documentation*. Retrieved from https://node-postgres.com/

[9] Stack Overflow. (2021). *Developer Survey Results*. Retrieved from https://stackoverflow.com/insights/survey/
