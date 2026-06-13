# Analysis of ORM Query Languages: Expressiveness and Limitations — A Comparative Study with Raw SQL Baseline

**Anas Moumni s34851**

Master Thesis / Magisterska

Supervisor: Dr. Paweł Lenkiewicz

Warsaw, 2025

---

## Contents

1. Introduction ................................................................. 1
   1.1 The Purpose of the Work ................................................ 2
   1.2 Research Questions ..................................................... 3
   1.3 Scope and Limitations .................................................. 4
2. Concept of Development .................................................... 5
3. Technologies and Tools Used in Work ........................................ 7
   3.1 Node.js ............................................................... 7
   3.2 PostgreSQL ............................................................ 10
   3.3 Prisma ............................................................... 13
   3.4 TypeORM .............................................................. 16
   3.5 Sequelize ............................................................. 19
   3.6 Drizzle ............................................................... 21
   3.7 pg (Node-Postgres) .................................................... 23
4. Implementation and Methodology ............................................ 25
   4.1 Database Schema ....................................................... 25
   4.2 Framework Configurations .............................................. 30
   4.3 Benchmark Testing Environment ......................................... 34
   4.4 Test Operations ....................................................... 35
   4.5 Statistical Methodology ............................................... 39
5. Results and Analysis ...................................................... 40
   5.1 Execution Time Results — Dataset Size 100 .............................. 40
   5.2 Execution Time Results — Dataset Size 1,000 ............................ 43
   5.3 Execution Time Results — Dataset Size 10,000 ........................... 45
   5.4 Execution Time Results — Dataset Size 100,000 .......................... 47
   5.5 Cross-Dataset Summary ................................................. 49
   5.6 Operation-by-Operation Analysis ........................................ 51
   5.7 Stability Analysis .................................................... 53
   5.8 Memory Consumption .................................................... 54
   5.9 Scaling Patterns ...................................................... 55
6. Evaluation of Functional Differences ...................................... 53
   6.1 Code Maintainability .................................................. 53
   6.2 Type Safety ........................................................... 55
   6.3 Expressiveness Limits ................................................. 56
   6.4 Prisma's Query Engine Overhead ..................................... 58
   6.5 Practical Recommendations ............................................. 59
7. Summary and Conclusions ................................................... 61
   7.1 Summary of Findings ................................................... 61
   7.2 Limitations ........................................................... 63
   7.3 Future Work ........................................................... 64
   7.4 Final Remarks ......................................................... 65
Bibliography .................................................................. 67

---

## List of Tables

Table 1. Dataset sizes used in benchmark ...................................... 30
Table 2. Mean execution time (ms) at dataset size 100 .......................... 40
Table 3. Overhead percentage relative to Raw SQL at dataset size 100 ........... 41
Table 4. Mean execution time (ms) at dataset size 1,000 ........................ 43
Table 5. Overhead percentage relative to Raw SQL at dataset size 1,000 ......... 44
Table 6. Mean execution time (ms) at dataset size 10,000 ....................... 45
Table 7. Overhead percentage relative to Raw SQL at dataset size 10,000 ........ 46
Table 8. Mean execution time (ms) at dataset size 100,000 ...................... 47
Table 9. Overhead percentage relative to Raw SQL at dataset size 100,000 ....... 48
Table 10. ORM overhead range (%) across all dataset sizes ..................... 49
Table 11. Best-performing ORM per operation ................................... 51
Table 12. Number of operations with CV > 15% per framework .................... 53
Table 13. Baseline heap memory usage (MB) per framework ....................... 54
Table 14. Lines of code per operation ......................................... 53
Table 15. Type safety comparison .............................................. 55
Table 16. Expressiveness comparison ........................................... 56

---

## List of Figures

Figure 1. Database schema (Entity-Relationship Diagram) ....................... 26

---

## Abstract

This master's thesis analyzes query languages in Object-Relational Mapping (ORM) frameworks, examining their expressiveness and limitations compared to raw SQL execution. The study compares four popular ORM frameworks in the Node.js ecosystem — Prisma, TypeORM, Sequelize, and Drizzle — alongside the native PostgreSQL driver (pg) as a performance baseline. The research includes performance measurements (query execution time), memory consumption analysis, code complexity assessment (lines of code for equivalent operations), and evaluation of language expressiveness (which SQL constructs each ORM can express natively). Tests were conducted for seven fundamental database operations including Create, Read, Update, Delete, pagination, table joins, and many-to-many relationship handling. Results are measured across four dataset sizes (100, 1,000, 10,000, and 100,000 records), with each operation repeated 10–20 times to ensure statistical reliability through coefficient of variation analysis. The thesis provides practical guidance for developers choosing between raw SQL and ORM frameworks depending on project requirements, team expertise, and code maintainability needs.

Keywords: benchmarking, expressiveness, Node.js, ORM, PostgreSQL

---

## 1. Introduction

Every day, approximately 328.77 million terabytes of data are generated and stored in databases around the world [16]. After filtering out irrelevant information, around 70 percent of this data still needs to be stored and processed on the database side. This data supports many different functions including user interactions, data analysis, and business operations. The choice of how to communicate with a database is an important decision that every application developer needs to make [16].

The choice between using Object-Relational Mapping (ORM) frameworks and writing raw SQL directly is a common decision in web development. ORMs have existed since the late 1990s, starting with Hibernate in the Java ecosystem [11]. Their purpose is to bridge the gap between how data is represented in object-oriented code and how it is stored in relational tables [10]. This allows developers to work with data using objects in their programming language instead of writing direct SQL queries. Despite their widespread use, the decision to use an ORM is not always simple because there are trade-offs between development speed, code maintainability, and runtime performance.

Senior developers often prefer raw SQL because it gives maximum performance and complete control over what the database executes. Junior developers tend to prefer ORMs because they are easier to use and provide type safety and faster development time. Both opinions have reasons, but most discussions about this topic in developer communities are based on opinions rather than actual measured data. Empirical studies on ORM performance overhead exist but are limited in scope, often testing only one or two frameworks without comprehensive comparison [18].

This thesis aims to answer this question with real performance data and measurements rather than just opinions. It conducts a comparative study of query languages in ORM frameworks, examining their expressiveness, limitations, and performance characteristics compared to raw SQL. The study evaluates four popular ORM frameworks in the Node.js ecosystem — Prisma, TypeORM, Sequelize, and Drizzle — alongside the native PostgreSQL driver (pg) as a performance baseline. The evaluation focuses on four dimensions: query execution time (performance), memory usage (resource efficiency), code complexity (developer productivity), and language expressiveness (what each ORM can and cannot represent without using raw SQL).

The scope of this research includes seven fundamental database operations — Create, Read, Update, Delete, pagination, table joins, and many-to-many relationship handling. These operations represent the core functionality that any web application needs when working with a database. By measuring the same operations implemented through five different approaches, this thesis provides practical data that can help developers choose the right tool for their project.

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

7. How does the choice between raw SQL and an ORM affect long-term code maintainability, including readability, refactoring safety, and onboarding time for new developers?

### 1.3 Scope and Limitations

This study focuses exclusively on the Node.js runtime environment and PostgreSQL as the database engine. The results may differ for other programming languages (such as Python, Java, or C#) and other database systems (such as MySQL, SQLite, or MongoDB). The benchmark was conducted on a single development machine without network latency, meaning that production environments with distributed databases and network overhead may show different performance characteristics. Only synchronous, single-query operations were tested; concurrent queries, transaction handling, and streaming results were not evaluated. The test schema is intentionally simple (four tables with standard relationships), and more complex schemas with dozens of tables may produce different overhead patterns.

---

## 2. Concept of Development

The concept of development is based on implementing a unified database schema within five different data access approaches. The first approach uses the native PostgreSQL driver (pg) directly with SQL queries written as strings and executed through the driver. This approach serves as the performance baseline with near-zero overhead. The second approach uses Prisma with its schema-first design and code generation. The third approach uses TypeORM with decorator-based entity definitions. The fourth approach uses Sequelize with programmatic model definitions. The fifth approach uses Drizzle with a SQL-like API that generates SQL at compile time through TypeScript's type inference system.

The process begins with the creation of a relational database schema consisting of four tables that represent a simplified blogging platform: users, posts, categories, and a many-to-many junction table (post_categories). This schema was chosen to be simple enough for fair comparison across all five implementations while complex enough to exercise each ORM's capabilities for handling primary keys, foreign keys, unique constraints, data types, and both one-to-many and many-to-many relationships. Synthetic data is generated using SQL scripts and inserted into the database for each dataset size.

Following the implementation, the second stage involves collecting statistical metrics related to query execution performance. Each operation is executed repeatedly under controlled conditions with the same datasets used for all implementations. Execution time is measured with nanosecond precision, heap memory is recorded before and after each operation, and a warmup phase precedes every measured run to populate the database buffer cache. The final step includes a comparative analysis of the collected results to determine the performance overhead, memory efficiency, code complexity, and expressiveness of each ORM framework relative to raw SQL.

The choice of the Node.js ecosystem for this study is motivated by its popularity in modern web development and the diversity of ORM frameworks available within it. Node.js provides a single-threaded execution model that makes ORM overhead particularly visible, as any CPU-intensive work performed by an ORM's internal query processing competes for the same execution resources used by the application itself. This characteristic makes Node.js an ideal platform for measuring and comparing the overhead introduced by different ORM abstraction layers.

The choice of PostgreSQL as the database engine is motivated by its advanced feature set, which serves as a useful testing ground for determining which ORM constructs can fully represent its SQL dialect and which require fallback mechanisms. PostgreSQL supports features such as window functions, Common Table Expressions, lateral joins, and full-text search, which are commonly cited in the ORM expressiveness debate.

The evaluation framework is structured around four dimensions. The first dimension is performance, measured as query execution time using nanosecond-precision timers across four dataset sizes (100, 1,000, 10,000, and 100,000 records). The second dimension is memory efficiency, measured as heap memory consumption before and after each operation. The third dimension is code complexity, assessed through lines of code required for equivalent operations and readability comparison. The fourth dimension is expressiveness, evaluated by testing which SQL constructs each ORM can represent natively without falling back to raw SQL. Each dimension is analyzed independently, allowing developers to weigh the factors most relevant to their specific project requirements.

The benchmark methodology follows a rigorous protocol: each operation is executed 10–20 times per dataset size with 3 warmup runs preceding the measured iterations. Garbage collection is forced before each iteration to eliminate JavaScript memory management artifacts. Results are analyzed using descriptive statistics (mean, standard deviation, coefficient of variation) and the overhead relative to the raw SQL baseline is computed for each operation. The coefficient of variation (CV) is used to assess measurement stability, with CV below 15 percent considered stable.

---

## 3. Technologies and Tools Used in Work

### 3.1 Node.js

Node.js is a cross-platform, open-source JavaScript runtime environment built on the V8 JavaScript engine, which is the same engine that powers the Google Chrome web browser. Since its initial release in 2009 by Ryan Dahl [14], Node.js has become one of the most popular platforms for server-side development, particularly for building scalable network applications and REST APIs. Its asynchronous architecture, where I/O operations do not block the execution thread, allows it to manage many concurrent connections with minimal resource overhead [1].

The most significant architectural difference in Node.js compared to traditional server platforms is that it processes all requests on one thread using an event loop. Instead of creating a new thread for each incoming request (like Apache or PHP), Node.js processes requests sequentially on a single thread. When an operation involves I/O — such as reading from a database or making a network request — Node.js registers a callback function and continues processing other requests. When the I/O operation completes, the callback is added back to the event queue. This design allows Node.js to handle thousands of concurrent connections with minimal system resource usage.

Node.js uses an ecosystem of packages managed through the npm (Node Package Manager) registry, which hosts over two million packages, making it the world's largest software registry [12]. The version used in this study is Node.js 20.11.0 LTS (Long-Term Support), which provides stable APIs, modern JavaScript features including top-level await and native fetch, and the `process.hrtime.bigint()` API used for high-precision execution time measurement in the benchmark tests.

In the context of this master's thesis, Node.js serves as the runtime environment for all benchmark implementations. Each ORM framework and the raw SQL driver are implemented as JavaScript modules running within the same Node.js process version, ensuring that execution time results are not affected by differences in runtime versions. The JavaScript heap memory usage is also recorded during each operation using the `process.memoryUsage()` API, providing a measure of the memory overhead introduced by each ORM framework's internal data structures and abstraction layers.

A characteristic of Node.js relevant to ORM analysis is its single-threaded event loop. Because JavaScript operations in Node.js run on a single thread, any CPU-intensive work performed by an ORM's internal query processing (such as object mapping, serialization, or transformation) competes for the same execution resources used by the application itself. This makes the overhead introduced by ORMs particularly visible in Node.js compared to multi-threaded runtimes where such processing could happen in parallel.

The event loop in Node.js operates in phases. In the timers phase, scheduled callbacks (such as those from `setTimeout`) are executed. In the I/O callbacks phase, completed I/O operations are processed. In the poll phase, new I/O events are collected and their callbacks are executed. In the check phase, callbacks scheduled by `setImmediate` are executed. Understanding this architecture is important for interpreting benchmark results because ORM operations that involve significant JavaScript processing (such as Prisma's query engine communication or TypeORM's entity lifecycle management) will occupy the event loop thread during their execution, blocking other operations.

Node.js also provides the `--expose-gc` flag, which allows manual triggering of garbage collection through `global.gc()`. This feature is used in the benchmark methodology to force garbage collection before each measured iteration, ensuring that the measured execution time reflects the actual database query overhead rather than artifacts of JavaScript memory management. The garbage collection is followed by a 50-millisecond pause to allow the garbage collector to settle before timing begins.

The npm ecosystem provides the package management infrastructure for this study. Each ORM framework is installed as an npm package with specific version numbers to ensure reproducibility: Prisma 6.2.0, TypeORM 0.3.20, Sequelize 6.37.0, and Drizzle 0.36.0. The pg package (node-postgres) version 8.13.0 serves as the raw SQL driver. All packages are installed in a single `node_modules` directory, and the exact versions are locked in a `package-lock.json` file to prevent version drift during the benchmark period.

### 3.2 PostgreSQL

PostgreSQL is a free, open-source relational database system that follows SQL standards and also supports JSON-based queries. Originally developed at the University of California, Berkeley in the 1980s as POSTGRES [15], it has evolved into one of the most powerful and feature-rich open-source database systems available. Its reputation for reliability, data integrity, and advanced feature set has made it a common choice in production deployments across industries [2].

PostgreSQL version 15 is used in this study, running in a Docker container [13] to ensure a clean, isolated testing environment with consistent configuration. Docker containerization guarantees that the database environment is identical across all benchmark runs, eliminating variables such as operating system configuration, memory allocation, and concurrent processes that could affect performance measurements.

PostgreSQL was selected as the database engine for all benchmark implementations for several reasons. First, it is the most commonly paired database with Node.js in modern web development, according to developer surveys [8][9]. Second, PostgreSQL offers advanced features that are commonly cited in the ORM expressiveness debate, including full-text search, window functions, Common Table Expressions (CTEs), lateral joins, and JSONB columns. These features serve as a useful testing ground for determining which ORM constructs can fully represent PostgreSQL's SQL dialect and which require fallback mechanisms.

Key features of PostgreSQL relevant to this study include:

- **ACID Compliance**: PostgreSQL fully adheres to ACID properties (Atomicity, Consistency, Isolation, Durability), ensuring data integrity even in the event of system failures or concurrent access. This is essential for the many-to-many creation operations tested in this benchmark, where a post and its category associations must be created atomically.

- **Advanced Query Types**: Beyond standard SQL, PostgreSQL supports window functions (`RANK()`, `ROW_NUMBER()`, `SUM() OVER`), Common Table Expressions (WITH clauses), recursive queries, lateral joins for correlated subqueries, full-text search with `tsvector` and `tsquery`, array types and operators, and native JSON/JSONB columns with querying capabilities. These features serve as a testing ground for evaluating ORM expressiveness.

- **Indexing Support**: PostgreSQL offers multiple index types including B-tree (default), GIN (Generalized Inverted Index for full-text and JSONB), GIST (Generalized Search Tree for geometric data), and BRIN (Block Range Index for large tables). Proper index configuration is essential for fair benchmark results. In this study, the primary key indexes and unique constraint indexes are created automatically by PostgreSQL's schema definitions.

- **Query Planner**: PostgreSQL evaluates several possible execution strategies for each query and picks the one it estimates will be fastest. The query planner's decisions can be affected by how ORMs construct SQL — for instance, parameterized queries may have different plans than queries with inline literals [21]. All implementations in this study use parameterized queries to ensure fair comparison.

- **Connection Pooling**: PostgreSQL manages connections through a process-based model where each connection spawns a backend process. For high-concurrency applications, external connection poolers such as PgBouncer are often used. In this thesis, all ORM frameworks and the raw SQL driver use a connection pool of size 10 to ensure fair comparison.

- **Foreign Key Constraints with CASCADE**: PostgreSQL supports foreign key constraints with `ON DELETE CASCADE` options, which are used in the `post_categories` junction table to automatically remove many-to-many associations when a post or category is deleted. This feature is tested in the Delete User operation, where deleting a user cascades to remove all associated posts and post_categories entries.

- **RETURNING Clause**: PostgreSQL supports the `RETURNING` clause in INSERT, UPDATE, and DELETE statements, which allows the database to return the affected rows in the same query execution. In this thesis, the `RETURNING` clause is used only for INSERT operations (to retrieve the generated primary key), ensuring that all frameworks execute the same SQL statements for update and delete operations without the additional overhead of returning row data.

In the context of this thesis, PostgreSQL serves as the target database against which all five data access approaches execute their queries. The same database instance, schema, and data are used for all measurements, isolating the variable being tested to the data access layer alone.

### 3.3 Prisma

Prisma is an ORM library released in 2019 by Prisma Inc. (formerly Graphcool). Instead of defining models in application code, the developer writes the data model in a dedicated schema file, and Prisma automatically produces a typed client that mirrors that model. This approach differs significantly from traditional ORMs that use decorators or configuration objects inline with application code [3].

Prisma consists of two parts: a JavaScript library that the developer imports into application code, and a separate engine written in Rust that translates method calls into SQL statements [3]. This architecture means that every query made through Prisma's API is translated into SQL by the query engine, which then communicates with the database. The query engine's presence introduces additional latency compared to direct driver execution, but it also enables Prisma to provide features such as automatic query parameterization, type-safe result mapping across multiple databases, and an introspect-and-generate workflow that can adapt to existing databases.

A Prisma schema definition for the users and posts tables looks like this:

```prisma
model users {
  id          Int      @id @default(autoincrement())
  username    String   @unique @db.VarChar(50)
  email       String   @unique @db.VarChar(100)
  created_at  DateTime @default(now())
  posts       posts[]  @relation("UserPosts")
}

model posts {
  id              Int               @id @default(autoincrement())
  title           String            @db.VarChar(200)
  content         String?
  published       Boolean           @default(false)
  views           Int               @default(0)
  author          users             @relation("UserPosts", fields: [authorId], references: [id], onDelete: Cascade)
  authorId        Int               @map("author_id")
  post_categories post_categories[] @relation("PostToCategory")
  created_at      DateTime          @default(now())
}
```

Querying with Prisma uses a fluent method chain API. A simple insert and read operation look like the following:

```typescript
import { PrismaClient } from '@prisma/client';
const prisma: PrismaClient = new PrismaClient();

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

// Create a post with categories (many-to-many nested write)
const post = await prisma.posts.create({
  data: {
    title: 'My Post',
    content: 'Content here',
    authorId: newUser.id,
    post_categories: {
      create: [
        { category_id: 1 },
        { category_id: 2 },
        { category_id: 3 }
      ]
    }
  }
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

TypeORM is an ORM library for TypeScript and JavaScript released in 2016. Its design draws from Java's Hibernate and Microsoft's Entity Framework, offering two architectural patterns — Active Record and Data Mapper [22] — so teams can choose the approach that fits their codebase [4][11].

TypeORM supports two approaches for defining entities: decorator-based classes and the EntitySchema approach (programmatic object definitions). In this thesis, the decorator-based approach is used, where entity classes are annotated with `@Entity()`, `@Column()`, and relationship decorators such as `@OneToMany()` and `@ManyToMany()`. This approach requires TypeScript compilation and the `reflect-metadata` polyfill, which enables TypeORM to read decorator metadata at runtime to build its internal schema representation. At query time, TypeORM's query builder constructs SQL strings from the developer's fluent API calls, which are then executed through the underlying database driver.

A TypeORM decorator-based entity definition for the users and posts tables looks like this:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne,
         ManyToMany, JoinTable, DataSource } from 'typeorm';

@Entity('users')
class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  created_at: Date;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];
}

@Entity('posts')
class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'boolean', default: false })
  published: boolean;

  @Column({ type: 'int', default: 0 })
  views: number;

  @Column({ type: 'int' })
  author_id: number;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  created_at: Date;

  @ManyToOne(() => User, (user) => user.posts)
  @JoinColumn({ name: 'author_id' })
  author: User;

  @ManyToMany(() => Category)
  @JoinTable({
    name: 'post_categories',
    joinColumn: { name: 'post_id' },
    inverseJoinColumn: { name: 'category_id' },
  })
  categories: Category[];
}
```

Querying with TypeORM uses the Repository pattern. A simple insert and read operation look like the following:

```typescript
const userRepo = dataSource.getRepository(User);

// Insert a new user
const newUser = await userRepo.save({
  username: 'john_doe',
  email: 'john@example.com'
});

// Retrieve a user by ID
const user = await userRepo.findOneBy({ id: newUser.id });

// Get a post with its author (JOIN via QueryBuilder)
const post = await dataSource.getRepository(Post)
  .createQueryBuilder('p')
  .innerJoinAndSelect('p.author', 'u')
  .where('p.id = :id', { id })
  .getOne();
```

Key features of TypeORM include:

- **Decorator-Based Entities**: Entities are defined as TypeScript classes annotated with decorators such as `@Entity()`, `@Column()`, and `@OneToMany()`. This approach requires TypeScript compilation and the `reflect-metadata` polyfill, but provides a familiar object-oriented model for developers coming from Java Hibernate or C# Entity Framework.

- **Repository Pattern**: TypeORM provides the Repository pattern for performing database operations on entities. Each entity type has an associated repository that provides standard CRUD methods (`save`, `find`, `findOne`, `remove`) along with a QueryBuilder for more complex queries.

- **QueryBuilder API**: TypeORM's QueryBuilder uses a fluent, chainable API that closely resembles SQL syntax. It supports JOINs, subqueries, CTEs (Common Table Expressions), GROUP BY, HAVING clauses, and window functions, making it one of the most expressive ORM query builders in the Node.js ecosystem.

- **Relationship Management**: TypeORM provides comprehensive support for one-to-one, one-to-many, many-to-one, and many-to-many relationships with eager and lazy loading options. Many-to-many relationships can be managed through an implicit junction table or through an explicit join entity.

- **Migrations**: TypeORM generates migration files based on entity changes or can run migrations manually. It supports both SQL-based and TypeScript-based migrations.

- **Multiple Database Support**: TypeORM supports PostgreSQL, MySQL, MariaDB, SQLite, Microsoft SQL Server, Oracle, and MongoDB, allowing the same codebase to target different databases with minimal changes.

Limitations of TypeORM include the overhead of its entity lifecycle system — the `save()` method triggers validation, hooks, and relationship management on every call, which adds measurable latency compared to the simpler `insert()` method. The library's documentation, while comprehensive, is sometimes difficult to navigate due to its mixing of Active Record and Data Mapper examples.

In the context of this master's thesis, TypeORM represents a middle ground between raw SQL and high-level ORMs like Prisma. Its QueryBuilder provides more expressiveness than Prisma's native API for complex queries, but at the cost of increased verbosity. Comparing TypeORM's performance against the other frameworks provides insight into the trade-offs of different ORM design philosophies.

### 3.5 Sequelize

Sequelize, first published in 2010, is the most mature ORM in the Node.js world, backed by a large user base and well-established documentation [5]. Unlike Prisma or TypeORM, Sequelize defines models by calling `sequelize.define()` with a configuration object, rather than using decorators or a separate schema file.

Sequelize's architecture revolves around a central Sequelize instance that manages the connection pool and model registry. Each model is registered with the instance and can have associations defined through method calls (`hasMany`, `belongsTo`, `belongsToMany`). When a query is executed, Sequelize's query generator translates the JavaScript method calls into SQL strings, which are then executed through the underlying database driver (pg for PostgreSQL).

A Sequelize model definition for the users table looks like this:

```typescript
import { Sequelize, DataTypes } from 'sequelize';

const User = sequelize.define('users', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING(50), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'users', timestamps: false });
```

Relationships between models are defined separately using association methods:

```typescript
User.hasMany(Post, { foreignKey: 'author_id' });
Post.belongsTo(User, { foreignKey: 'author_id' });
```

Querying with Sequelize uses the model instance methods. A simple insert and read operation look like the following:

```typescript
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

Drizzle is a lightweight, type-safe ORM library for TypeScript released in the early 2020s. It takes a fundamentally different approach from traditional ORMs by not mapping database tables to classes at all. Instead, Drizzle provides a SQL-like API built on composable TypeScript functions and objects that generate SQL strings at compile time through TypeScript's type inference system [6].

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

The `pg` package (often called node-postgres) is a native PostgreSQL client library for Node.js. It provides a direct interface between JavaScript code and a PostgreSQL database through parameterized queries, connection pooling, and transaction support. It does not include any object-relational mapping functionality — it sends SQL strings to the database and returns result sets as plain JavaScript objects [7].

The pg package serves as the baseline implementation in this study because it represents the most direct path between the Node.js application and the PostgreSQL database engine. There is no query translation layer, no object mapping, no automatic eager loading, and no abstraction between the developer's SQL and the database. Any performance overhead observed in the ORM implementations can be attributed to the abstraction layers those frameworks introduce on top of the pg driver.

A raw SQL insert and read operation using the pg driver look like the following:

```typescript
import { Pool, QueryResult } from 'pg';
const pool: Pool = new Pool({ connectionString: DATABASE_URL });

// Insert a new user
const result: QueryResult = await pool.query(
  'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
  ['john_doe', 'john@example.com']
);
const newUser = result.rows[0];

// Retrieve a user by ID
const { rows } = await pool.query(
  'SELECT * FROM users WHERE id = $1',
  [newUser.id]
);
const user = rows[0];
```

Key features of pg include:

- **Parameterized Queries**: The pg package supports parameterized queries using the `$1`, `$2`, `$3` syntax for positional parameters. This protects against SQL injection and allows PostgreSQL to reuse query execution plans across multiple invocations.

- **Connection Pooling**: The pg package includes a built-in connection pool (`pg.Pool`) that manages a configurable number of database connections. Connections are borrowed from the pool for query execution and returned when the query completes. In this study, the pool size is set to 10 to match the connection configuration used by all ORM frameworks.

- **Transaction Support**: Transactions can be managed manually using `BEGIN`, `COMMIT`, and `ROLLBACK` SQL statements, or through pg's `pool.query()` method which executes queries within a single connection for atomicity.

- **No ORM Overhead**: Since pg does not perform any query translation or object mapping, it introduces minimal overhead beyond the network protocol communication and result serialization. It serves as the 100 percent performance baseline against which ORM overhead is calculated.

Limitations of pg include the requirement for developers to write and maintain raw SQL strings, manage query result parsing manually, and handle schema changes by updating SQL strings throughout the codebase. It provides no compile-time type checking of queries unless paired with a type-generation tool, and no automatic relationship mapping.

In the context of this master's thesis, pg establishes the performance baseline (100 percent) against which all ORM frameworks are measured. ORM performance is expressed as percentage overhead relative to pg execution times for identical operations.

---

## 4. Implementation and Methodology

### 4.1 Database Schema

The database schema used in this study represents a simplified blogging platform domain. It consists of four tables: `users`, `posts`, `categories`, and `post_categories`. The schema was chosen to be simple enough for fair comparison across all five implementations while complex enough to exercise each ORM's capabilities for handling primary keys, foreign keys, unique constraints, data types, and both one-to-many and many-to-many relationships.

#### 4.1.1 Entity-Relationship Diagram

Figure 1 presents the Entity-Relationship Diagram of the database schema used in this study. The schema consists of four tables connected through primary key and foreign key relationships.

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
│ id       SERIAL  │                                             │
│ name     VARCHAR │                                             │
└──────────────────┘                                             │
```

*Figure 1. Database schema. Source: Own elaboration*

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

#### 4.1.3 Dataset Sizes

The benchmark uses four dataset sizes to measure how each framework's overhead scales with data volume. Table 1 presents the number of records in each table for each dataset size.

*Table 1. Dataset sizes used in benchmark. Source: Own elaboration*

| Dataset Name | Users | Posts | Categories | Iterations |
|-------------|-------|-------|------------|------------|
| Small | 100 | 100 | 5 | 20 |
| Medium | 1,000 | 1,000 | 10 | 20 |
| Large | 10,000 | 10,000 | 15 | 20 |
| Stress | 100,000 | 100,000 | 20 | 10 |

The small dataset (100 records) tests baseline overhead where query execution time is minimal. The medium dataset (1,000 records) represents a typical development environment. The large dataset (10,000 records) simulates a moderate production workload. The stress dataset (100,000 records) tests behavior under significant data volume, particularly for operations involving foreign key cascade checks.

### 4.2 Framework Configurations

Each framework was configured to connect to the same PostgreSQL 15 database instance with identical credentials. The database URL is specified through an environment variable: `postgresql://postgres:thesis2026@localhost:5432/orm_benchmark`.

#### 4.2.1 Raw SQL (pg) Configuration

The raw SQL implementation uses the `pg` package (node-postgres) to connect to PostgreSQL and execute queries. A connection pool is created with a maximum size of 10, and each benchmark operation borrows a connection from the pool, executes the query with parameterized values, and returns the result.

```typescript
import { Pool, QueryResult } from 'pg';
let pool: Pool;

const init = async (): Promise<void> => {
  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 10,
  });
};
```

The database schema is created using standard SQL DDL statements executed during initialization. All queries use parameterized syntax (`$1`, `$2`, etc.) to protect against SQL injection and allow PostgreSQL to reuse execution plans. Representative query implementations include:

```typescript
// Create User (C1)
const createUser = async (username: string, email: string) => {
  const result: QueryResult = await pool.query(
    'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
    [username, email]
  );
  return result.rows[0];
};

// Get User by ID (R1)
const getUserById = async (id: number) => {
  const result: QueryResult = await pool.query(
    'SELECT * FROM users WHERE id = $1', [id]
  );
  return result.rows[0];
};

// Post with Author (J1)
const getPostWithAuthor = async (postId: number) => {
  const result: QueryResult = await pool.query(
    `SELECT p.*, u.username as author_username, u.email as author_email
     FROM posts p
     INNER JOIN users u ON p.author_id = u.id
     WHERE p.id = $1`, [postId]
  );
  return result.rows[0];
};
```

These examples illustrate the raw SQL approach: the developer writes the complete SQL statement, specifies parameters, and manually accesses the result rows. This provides maximum control but requires SQL knowledge and careful parameter management.

#### 4.2.2 Prisma Configuration

The Prisma implementation begins with a `.prisma` schema file that declares the data model. After the PSL schema is written, the Prisma CLI generates a TypeScript client using `npx prisma generate`. This client provides type-safe methods for all CRUD operations.

```typescript
import { PrismaClient } from '@prisma/client';

const prisma: PrismaClient = new PrismaClient({
  datasources: { db: { url: DATABASE_URL + '?connection_limit=10' } },
});

const init = (): Promise<void> => prisma.$connect();
```

Representative query implementations using Prisma's generated client:

```typescript
// Create User (C1)
const createUser = async (username: string, email: string) => {
  return prisma.users.create({ data: { username, email } });
};

// Get User by ID (R1)
const getUserById = async (id: number) => {
  return prisma.users.findUnique({ where: { id } });
};

// Post with Author (J1)
const getPostWithAuthor = async (id: number) => {
  return prisma.posts.findUnique({
    where: { id }, include: { author: true },
  });
};

// Create Post with Categories (M1)
const createPostWithCategories = async (postData, categoryIds: number[]) => {
  return prisma.posts.create({
    data: {
      ...postData,
      post_categories: {
        create: categoryIds.map((catId) => ({ category_id: catId })),
      },
    },
  });
};
```

Prisma's API is declarative: the developer describes *what* data to retrieve or modify, and the Prisma engine generates the SQL. Nested writes (`post_categories: { create: [...] }`) handle many-to-many relationships in a single call, while `include` eagerly loads related entities.

#### 4.2.3 TypeORM Configuration

The TypeORM implementation uses EntitySchema definitions to declare tables, columns, and relationships. A DataSource is initialized with the entity schemas and database connection parameters.

```typescript
import { DataSource, EntitySchema } from 'typeorm';

const UserSchema = new EntitySchema({
  name: 'users', tableName: 'users',
  columns: {
    id: { type: Number, primary: true, generated: true },
    username: { type: 'varchar', length: 50, unique: true },
    email: { type: 'varchar', length: 100, unique: true },
    created_at: { type: 'timestamp', createDate: true },
  },
  relations: {
    posts: { target: 'posts', type: 'one-to-many', inverseSide: 'author' },
  },
});

const dataSource: DataSource = new DataSource({
  type: 'postgres', url: DATABASE_URL,
  synchronize: false, logging: false,
  entities: [UserSchema, PostSchema, CategorySchema],
  poolSize: 10,
});

const init = async (): Promise<void> => { await dataSource.initialize(); };
```

Representative query implementations using TypeORM's repository API:

```typescript
// Create User (C1)
const createUser = async (username: string, email: string) => {
  return dataSource.getRepository('users').save({ username, email });
};

// Get User by ID (R1)
const getUserById = async (id: number) => {
  return dataSource.getRepository('users').findOneBy({ id });
};

// Post with Author (J1)
const getPostWithAuthor = async (id: number) => {
  return dataSource.getRepository('posts')
    .findOne({ where: { id }, relations: { author: true } });
};

// Create Post with Categories (M1)
const createPostWithCategories = async (postData, categoryIds: number[]) => {
  const postRepo = dataSource.getRepository('posts');
  const post = await postRepo.save(postData);
  post.categories = categoryIds.map((id) => ({ id }));
  return postRepo.save(post);
};
```

TypeORM's `save()` method is the primary write API — it handles both inserts and updates through the entity lifecycle system (validation, hooks, relationship management). For reads, `findOneBy()` provides simple primary key lookups, while `findOne()` with a `relations` option eagerly loads related entities in a single call. The many-to-many pattern uses two sequential `save()` calls: first to insert the post, then to assign and persist the category relationships.

#### 4.2.4 Sequelize Configuration

The Sequelize implementation uses programmatic model definitions through `sequelize.define()`. Models are defined with field specifications that declare data types, constraints, and default values. Relationships are defined through association methods.

```typescript
import { Sequelize, DataTypes } from 'sequelize';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres', logging: false,
  pool: { max: 10, min: 0 },
});

User = sequelize.define('users', { /* fields */ }, { tableName: 'users', timestamps: false });
Post = sequelize.define('posts', { /* fields */ }, { tableName: 'posts', timestamps: false });

User.hasMany(Post, { foreignKey: 'author_id' });
Post.belongsTo(User, { foreignKey: 'author_id' });
Post.belongsToMany(Category, { through: PostCategory, foreignKey: 'post_id', otherKey: 'category_id' });
Category.belongsToMany(Post, { through: PostCategory, foreignKey: 'category_id', otherKey: 'post_id' });
```

Representative query implementations using Sequelize's model API:

```typescript
// Create User (C1)
const createUser = async (username: string, email: string) => {
  return User.create({ username, email });
};

// Get User by ID (R1)
const getUserById = async (id: number) => {
  return User.findByPk(id);
};

// Post with Author (J1)
const getPostWithAuthor = async (id: number) => {
  return Post.findByPk(id, { include: [{ model: User }] });
};

// Create Post with Categories (M1)
const createPostWithCategories = async (postData, categoryIds: number[]) => {
  const post = await Post.create(postData);
  await post.setCategories(categoryIds);
  return post;
};
```

Sequelize's API uses active-record-style model methods: `Model.create()` for inserts, `Model.findByPk()` for primary key lookups, and `include` for eager loading related entities. The many-to-many pattern uses the auto-generated `setCategories()` mixin, which handles junction table insertion in a single call.

#### 4.2.5 Drizzle Configuration

The Drizzle implementation uses TypeScript schema definitions through function calls that mirror PostgreSQL's SQL syntax. Tables are defined using `pgTable()`, specifying columns through a declarative API.

```typescript
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

const init = () => {
  client = postgres(DATABASE_URL, { max: 10 });
  db = drizzle(client, { schema });
};
```

Representative query implementations using Drizzle's composable API:

```typescript
// Create User (C1)
const createUser = async (username: string, email: string) => {
  const result = await db.insert(users).values({ username, email }).returning();
  return result[0];
};

// Get User by ID (R1)
const getUserById = async (id: number) => {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
};

// Post with Author (J1)
const getPostWithAuthor = async (id: number) => {
  const result = await db
    .select()
    .from(posts)
    .innerJoin(users, eq(posts.author_id, users.id))
    .where(eq(posts.id, id));
  return result.length > 0 ? result[0] : null;
};

// Create Post with Categories (M1)
const createPostWithCategories = async (postData, categoryIds: number[]) => {
  const [newPost] = await db.insert(posts).values(postData).returning();
  const values = categoryIds.map((categoryId) => ({ postId: newPost.id, categoryId }));
  await db.insert(postCategories).values(values);
  return newPost;
};
```

Drizzle's API most closely mirrors SQL syntax: `db.insert(table).values()` for inserts, `db.select().from().where()` for queries, and explicit `.innerJoin()` or `.leftJoin()` for related data. The composable function chain generates SQL that is close to what a developer would write by hand, with full TypeScript type inference from the schema definitions.

### 4.3 Benchmark Testing Environment

The benchmark testing environment is configured to ensure consistent and comparable results across all five implementations. The test is conducted on a macOS machine (Sequoia 15.7.3) using Node.js version 20.11.0 LTS, with PostgreSQL 15 running in an isolated Docker container. All connections are made through localhost with zero network latency.

Each operation is measured using Node.js's high-precision timer `process.hrtime.bigint()`, which provides nanosecond-accuracy timing. Memory usage is captured through `process.memoryUsage().heapUsed` before and after each operation to isolate the memory impact of the framework's query execution. To ensure result stability and rule out the influence of buffering or operating system scheduling, each operation is executed 20 times for the 100, 1,000, and 10,000 record datasets, and 10 times for the 100,000 record dataset, preceded by 3 warmup iterations that are excluded from the measurement.

Before each measured iteration, garbage collection is forced using `global.gc()` (enabled via the `--expose-gc` Node.js flag) and a 50-millisecond delay is introduced to allow the garbage collector to settle before timing begins. This approach ensures that the measured execution time reflects the actual database query overhead rather than artifacts of JavaScript memory management or cold cache state.

### 4.4 Test Operations

The benchmark suite implements 13 operations in total, covering Create, Read, Update, and Delete patterns across the four tables. Of these, seven operations were selected for detailed analysis in this thesis. The selection prioritizes operations that exercise different ORM capabilities — single-row CRUD, pagination, JOINs, and many-to-many relationships — while excluding redundant variants (such as Create Post and Delete Post) that would add volume without revealing additional architectural insights. The following seven operations are tested across all five implementations. Each operation is precisely defined by the table it targets, the SQL statement that corresponds to it, and the parameters it requires.

#### 4.4.1 C1 — Create User

Inserts one row into the `users` table with a unique username and email address. The equivalent raw SQL is:

```sql
INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *
```

This operation tests each ORM's ability to create a single record and return the generated primary key. The `RETURNING` clause is PostgreSQL-specific and allows the database to return the inserted row in the same query execution, eliminating the need for a separate SELECT query. Each iteration inserts a user with a unique username (`u_{iteration}`) and email (`u_{iteration}@test.com`) to avoid unique constraint violations.

#### 4.4.2 R1 — Get User by ID

Retrieves one user row by primary key lookup. The equivalent raw SQL is:

```sql
SELECT * FROM users WHERE id = $1
```

This operation tests each ORM's primary key query optimization. The user ID is determined before the benchmark begins by querying `SELECT COALESCE(MAX(id), 1) as last_id FROM users` after seeding. This ensures all frameworks query for the same record.

#### 4.4.3 R3 — Paginated Posts

Retrieves posts ordered by id with LIMIT 20 and OFFSET 0. The equivalent raw SQL is:

```sql
SELECT * FROM posts ORDER BY id LIMIT 20 OFFSET $1
```

This operation tests each ORM's ability to express LIMIT and OFFSET in pagination queries. Pagination is one of the most common patterns in web applications, making this operation practically relevant. The raw SQL uses parameterized LIMIT and OFFSET. Prisma uses `take` and `skip`. TypeORM uses `take` and `skip` in `find()`. Sequelize uses `limit` and `offset` in `findAll()`. Drizzle uses `.limit()` and `.offset()`.

#### 4.4.4 U1 — Update User

Updates the email field of one user identified by primary key. The equivalent raw SQL is:

```sql
UPDATE users SET email = $1 WHERE id = $2
```

This operation tests each ORM's single-row update API. Each iteration updates the email to a unique value (`updated_{iteration}@test.com`). The generated SQL varies by framework: TypeORM and Sequelize execute a bare `UPDATE` statement, while Prisma and Drizzle append a `RETURNING` clause by default because their idiomatic APIs return the updated entity from the update call. This difference is not a benchmarking artifact — it reflects the natural cost of each ORM's update semantics and is captured faithfully in the measured timings.

#### 4.4.5 D1 — Delete User

Deletes one user by primary key. The equivalent raw SQL is:

```sql
DELETE FROM users WHERE id = $1
```

This operation tests each ORM's deletion API and foreign key constraint handling. Due to `ON DELETE CASCADE` on the `posts.author_id` foreign key, deleting a user also removes all their associated posts and post_categories entries. This makes D1 particularly interesting at the largest dataset size (100,000 records), where the cascade deletion must scan and remove potentially thousands of related rows. Pre-seeded unique delete target users are used to ensure each iteration deletes a different user without conflicts. As with U1, the generated SQL differs across ORMs: Prisma and Drizzle add a `RETURNING` clause because their delete APIs return the deleted entity, while TypeORM and Sequelize execute a bare `DELETE` statement. These differences reflect each framework's idiomatic behavior rather than a benchmarking variable.

#### 4.4.6 J1 — Post with Author (JOIN)

Retrieves a single post along with its associated author user record using a JOIN on the `author_id` foreign key. The equivalent raw SQL is:

```sql
SELECT p.*, u.username as author_username, u.email as author_email
FROM posts p
INNER JOIN users u ON p.author_id = u.id
WHERE p.id = $1
```

This operation tests each ORM's relationship loading strategy — whether it generates a single SQL JOIN, uses two separate SELECT queries, or preloads the related entity. The raw SQL executes a single INNER JOIN. Prisma uses `findUnique()` with `include: { author: true }`. TypeORM uses `findOne()` with `relations: { author: true }`. Sequelize uses `findByPk()` with `include`. Drizzle uses `db.select().from().innerJoin()`.

A notable architectural difference emerges in how each ORM loads related data. TypeORM's `findOne()` with `relations` and Prisma's `findUnique()` with `include` both generate separate SQL queries — one to fetch the post, then a second to fetch the related author — rather than a single JOIN statement. Sequelize's `findByPk()` with `include` generates a single `LEFT JOIN` query. Drizzle uses an explicit `innerJoin()` that produces a single `INNER JOIN`. While all approaches return the same result for non-nullable foreign keys, the number of database round-trips differs: two queries for TypeORM and Prisma, one query for Sequelize and Drizzle. These are genuine architectural differences that a developer encounters in production, not benchmarking artifacts.

#### 4.4.7 M1 — Create Post with Categories (Many-to-Many)

Inserts a new post and assigns it to 3 categories by inserting 3 rows into the `post_categories` junction table, all within a single operation. The equivalent raw SQL is:

```sql
INSERT INTO posts (title, content, published, views, author_id) VALUES ($1, $2, $3, $4, $5) RETURNING id;
INSERT INTO post_categories (post_id, category_id) VALUES ($1, $2), ($1, $3), ($1, $4);
```

This operation tests each ORM's ability to handle many-to-many creation through a single API call. The raw SQL executes two queries (insert post, then insert junction entries). Prisma uses nested writes in `create()` with `post_categories: { create: [...] }`. TypeORM saves the post first, then assigns categories by ID reference and saves again. Sequelize creates the post, then calls `setCategories()`. Drizzle inserts the post, then inserts junction entries separately.

The most significant architectural difference appears in M1. TypeORM's `save()` method triggers its full entity lifecycle — including validation, subscriber hooks, and relationship resolution — producing three database queries instead of two for all other frameworks (including raw SQL). The extra query is a `SELECT` on the categories table to load the Category entities before inserting the junction rows. This is not a bug or misconfiguration; it is an inherent consequence of TypeORM's entity-centric design, where relationships are managed through loaded entity objects rather than raw foreign key IDs. The benchmark measures this cost faithfully, as a developer using TypeORM's idiomatic API would experience it in production.

#### 4.4.8 Generated SQL Comparison

To provide full transparency into what each framework sends to PostgreSQL, Table 4.4.8 shows the actual SQL statements generated by each ORM for every benchmark operation. These were captured by enabling query logging on each framework during a single test run. Showing the generated SQL allows the reader to verify that the benchmark compares equivalent database operations and to understand where ORM overhead originates — whether from query construction, result deserialization, or additional round-trips.

**Table 4.4.8:** Generated SQL by operation and framework.

| Op | Raw SQL | Prisma | TypeORM | Sequelize | Drizzle |
|----|---------|--------|---------|-----------|---------|
| **C1** | `INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *` | `INSERT INTO "public"."users" (...) VALUES ($1,$2) RETURNING ...` | `INSERT INTO "users"(...) VALUES (DEFAULT, $1, $2, DEFAULT) RETURNING "id", "created_at"` | `INSERT INTO "users" (...) VALUES ($1,$2,$3) RETURNING ...` | `insert into "users" (...) values ($1, $2) returning ...` |
| **R1** | `SELECT * FROM users WHERE id = $1` | `SELECT "public"."users".* FROM "public"."users" WHERE "id" = $1` | `SELECT "users".* FROM "users" WHERE "users"."id" = $1` | `SELECT "id","username","email","created_at" FROM "users" AS "users" WHERE "users"."id" = $1` | `select "id", "username", "email", "created_at" from "users" where "id" = $1 limit $2` |
| **R3** | `SELECT * FROM posts ORDER BY id LIMIT $1 OFFSET $2` | `SELECT "public"."posts".* FROM "public"."posts" ORDER BY "id" ASC LIMIT $1 OFFSET $2` | `SELECT "posts".* FROM "posts" ORDER BY "id" ASC LIMIT $1 OFFSET $2` | `SELECT "id","title","content","published","views","author_id","created_at" FROM "posts" AS "posts" ORDER BY "posts"."id" ASC LIMIT $1 OFFSET $2` | `select ... from "posts" order by "id" asc limit $1 offset $2` |
| **U1** | `UPDATE users SET email = $1 WHERE id = $2` | `UPDATE "public"."users" SET "email" = $1 WHERE "id" = $2 RETURNING ...` | `UPDATE "users" SET "email" = $1 WHERE "id" = $2` | `UPDATE "users" SET "email"=$1,"created_at"=$2 WHERE "id" = $3` | `update "users" set "email" = $1 where "id" = $2 returning ...` |
| **D1** | `DELETE FROM users WHERE id = $1` | `DELETE FROM "public"."users" WHERE "id" = $1 RETURNING ...` | `DELETE FROM "users" WHERE "id" = $1` | `DELETE FROM "users" WHERE "id" = $1` | `delete from "users" where "id" = $1 returning ...` |
| **J1** | `SELECT p.*, u.username AS author_username, u.email AS author_email FROM posts p INNER JOIN users u ON p.author_id = u.id WHERE p.id = $1` | `SELECT "public"."posts".*, "author".* FROM "public"."posts" LEFT JOIN "public"."users" AS "author" ON ... WHERE "id" = $1` | 2 queries: `SELECT posts.* FROM posts WHERE id = $1` → `SELECT users.* FROM users WHERE id = $1` | `SELECT "posts".*, "author".* FROM "posts" AS "posts" LEFT OUTER JOIN "users" AS "author" ON ... WHERE "posts"."id" = $1` | `select "posts".*, "users".* from "posts" inner join "users" on "posts"."author_id" = "users"."id" where "posts"."id" = $1` |
| **M1** | 2 queries: `INSERT INTO posts ... RETURNING *` → `INSERT INTO post_categories ...` | 2 queries: `INSERT INTO posts ... RETURNING ...` → `INSERT INTO post_categories ...` | 3 queries: `INSERT INTO posts ... RETURNING` → `SELECT categories` → `INSERT INTO post_categories` | 2 queries: `INSERT INTO posts ... RETURNING` → `INSERT INTO post_categories ...` | 2 queries: `insert into posts ... returning ...` → `insert into post_categories ...` |

Several observations emerge from this comparison. First, all five frameworks generate equivalent single-statement SQL for simple operations (C1, R1, R3), confirming that the measured timing differences for these operations reflect ORM processing overhead rather than different database workloads. Second, U1 and D1 reveal a natural divergence: Prisma and Drizzle append `RETURNING` clauses by default because their idiomatic APIs return the affected entity, while TypeORM and Sequelize execute bare `UPDATE`/`DELETE` statements. This difference is not forced or artificial — it reflects how each ORM's update and delete semantics work, and the benchmark captures the real cost of these design choices. Third, J1 reveals a structural difference across frameworks: Prisma and Sequelize use `LEFT JOIN` (the ORM default for eager-loaded relations), Drizzle and raw SQL use explicit `INNER JOIN`, while TypeORM's `findOne()` with `relations` executes two separate SELECT queries rather than a single JOIN — reflecting its entity-materialization architecture where related entities are hydrated independently. Fourth, M1 is the clearest source of TypeORM's high overhead: its `save()` method triggers entity lifecycle management, producing 3 queries instead of 2 for all other frameworks.

### 4.5 Statistical Methodology

For the performance comparison, each of the seven database operations was executed repeatedly across all five data access approaches under controlled conditions. This approach follows established benchmarking methodology for database systems [17][20]. The number of iterations varied by dataset size: 20 iterations for datasets of 100, 1,000, and 10,000 records, and 10 iterations for the 100,000 record dataset. Before each measured iteration, garbage collection was forced using `global.gc()` followed by a 50-millisecond pause to allow the garbage collector to settle. Three warmup iterations preceded every measured run to populate the database buffer cache, and these warmup results were discarded.

The following statistical metrics were computed for each combination of operation, dataset size, and framework:

- **Mean execution time** — the arithmetic average of all iteration timings, serving as the primary comparison metric.
- **Minimum and maximum execution time** — best-case and worst-case observed performance.
- **Standard deviation** — population standard deviation measuring the spread of results around the mean.
- **Coefficient of Variation (CV%)** — calculated as (standard deviation / mean) × 100. A CV below 15 percent indicates stable results not significantly affected by buffering, OS scheduling, or other system tasks.
- **Overhead percentage** — calculated as ((ORM_mean − RawSQL_mean) / RawSQL_mean) × 100, expressing each ORM's overhead relative to the raw SQL baseline.

Memory consumption was recorded identically, capturing the JavaScript heap usage (`process.memoryUsage().heapUsed`) after each iteration. The memory values reported are the absolute heap usage in megabytes, not deltas, because the per-query memory delta is negligible (fractions of a megabyte) across all frameworks.

---

## 5. Results and Analysis

### 5.1 Execution Time Results — Dataset Size 100

The following table presents the mean execution time (in milliseconds) for all seven operations at the smallest dataset size (100 users, 100 posts, 5 categories), along with the coefficient of variation in parentheses.

*Table 2. Mean execution time (ms) at dataset size 100. CV% in parentheses. Source: Own elaboration*

| Operation | Raw SQL | Prisma | TypeORM | Sequelize | Drizzle |
|-----------|---------|--------|---------|-----------|---------|
| C1: Create User | 3.934 (18.8%) | 4.361 (14.7%) | 7.217 (13.5%) | 4.720 (15.2%) | 5.536 (6.2%) |
| R1: Get User by ID | 2.530 (14.9%) | 3.078 (10.0%) | 3.368 (4.5%) | 2.890 (12.0%) | 3.775 (9.3%) |
| R3: Paginated Posts | 2.691 (18.6%) | 3.260 (7.1%) | 3.627 (3.2%) | 3.270 (5.2%) | 3.940 (10.3%) |
| U1: Update User | 4.163 (13.6%) | 4.413 (5.3%) | 4.480 (9.2%) | 4.446 (9.7%) | 5.100 (10.2%) |
| D1: Delete User | 3.804 (17.0%) | 4.469 (16.2%) | 4.458 (11.5%) | 4.030 (7.6%) | 4.766 (18.5%) |
| J1: Post with Author | 2.512 (17.1%) | 3.997 (14.8%) | 3.807 (11.6%) | 2.902 (21.8%) | 3.095 (10.3%) |
| M1: Post + Categories | 5.147 (22.5%) | 7.673 (6.6%) | 14.274 (6.5%) | 8.078 (13.9%) | 8.553 (8.9%) |

At the smallest dataset size, execution times are in the 2–14 millisecond range. The coefficient of variation is frequently above the 15 percent stability threshold at this scale because the 50-millisecond GC pause between iterations dominates the actual query time, making timing measurements sensitive to OS scheduling variance.

The overhead percentage relative to Raw SQL at size 100 is shown in the following table.

*Table 3. Overhead percentage relative to Raw SQL at dataset size 100. Source: Own elaboration*

| Operation | Prisma | TypeORM | Sequelize | Drizzle |
|-----------|--------|---------|-----------|---------|
| C1: Create User | +10.9% | +83.5% | +20.0% | +40.7% |
| R1: Get User by ID | +21.7% | +33.1% | +14.2% | +49.2% |
| R3: Paginated Posts | +21.1% | +34.8% | +21.5% | +46.4% |
| U1: Update User | +6.0% | +7.6% | +6.8% | +22.5% |
| D1: Delete User | +17.5% | +17.2% | +5.9% | +25.3% |
| J1: Post with Author | +59.1% | +51.5% | +15.5% | +23.2% |
| M1: Post + Categories | +49.1% | +177.3% | +56.9% | +66.2% |

At this scale, TypeORM shows the highest overhead on the Create User operation (+83.5%) and the Many-to-Many Create operation (+177.3%), due to its entity lifecycle system that triggers validation and hooks on every `save()` call. Prisma shows the lowest overhead on simple CRUD operations (+6–22%) but increases to +59% on the JOIN operation. Drizzle maintains a moderate overhead of +23–66%, reflecting its minimal abstraction layer. Sequelize shows a consistent +6–57% overhead across most operations.

The high CV values at this scale (Raw SQL R3: 18.6%, D1: 17.0%; Sequelize J1: 21.8%; Drizzle D1: 18.5%) are a consequence of the actual query execution times being comparable to the 50-millisecond GC pause. When a query completes in 2–5 milliseconds, small variations in OS scheduling or garbage collection timing produce large percentage swings in the measured time. This does not indicate a flaw in the frameworks themselves, but rather a limitation of measuring sub-5-millisecond operations with a fixed inter-iteration pause. The stability improves显著ly at larger dataset sizes where query times dominate the pause duration.

Among the ORM frameworks, Sequelize emerges as the most consistent performer at this scale, achieving the lowest overhead on five of the seven operations (R1: +14.2%, U1: +6.8%, D1: +5.9%, J1: +15.5%). Its lightweight query generator introduces minimal translation overhead for simple operations. Prisma performs competitively on single-row writes (C1: +10.9%, U1: +6.0%) but its Query Engine overhead becomes visible in J1 (+59.1%). Drizzle's overhead is uniformly moderate (+23–66%), reflecting its composable function chain that generates SQL close to what a developer would write by hand. TypeORM's entity lifecycle system is the dominant cost factor, adding +83.5% on Create User and +177.3% on Many-to-Many Create — operations that trigger multiple lifecycle hooks per `save()` call.

### 5.2 Execution Time Results — Dataset Size 1,000

At the medium-small dataset size (1,000 users, 1,000 posts, 10 categories), the execution time patterns remain similar to size 100, with a slight improvement in stability for most operations.

*Table 4. Mean execution time (ms) at dataset size 1,000. CV% in parentheses. Source: Own elaboration*

| Operation | Raw SQL | Prisma | TypeORM | Sequelize | Drizzle |
|-----------|---------|--------|---------|-----------|---------|
| C1: Create User | 3.769 (18.3%) | 3.291 (24.2%) | 6.536 (6.8%) | 4.576 (10.4%) | 5.224 (3.6%) |
| R1: Get User by ID | 2.641 (6.5%) | 3.100 (13.1%) | 3.182 (11.1%) | 2.730 (5.9%) | 3.803 (5.9%) |
| R3: Paginated Posts | 2.698 (13.1%) | 3.187 (7.2%) | 3.537 (7.6%) | 2.956 (9.6%) | 4.181 (20.8%) |
| U1: Update User | 4.486 (6.9%) | 4.238 (13.2%) | 4.323 (12.9%) | 4.597 (5.0%) | 5.009 (12.8%) |
| D1: Delete User | 4.240 (15.6%) | 8.164 (130.1%) | 4.641 (13.4%) | 4.272 (5.1%) | 5.098 (8.8%) |
| J1: Post with Author | 2.842 (10.3%) | 4.214 (8.6%) | 3.764 (6.0%) | 3.508 (11.6%) | 3.748 (12.1%) |
| M1: Post + Categories | 6.565 (15.5%) | 7.904 (10.1%) | 14.976 (5.3%) | 8.814 (7.3%) | 8.131 (7.0%) |

*Table 5. Overhead percentage relative to Raw SQL at dataset size 1,000. Source: Own elaboration*

| Operation | Prisma | TypeORM | Sequelize | Drizzle |
|-----------|--------|---------|-----------|---------|
| C1: Create User | −12.7% | +73.4% | +21.4% | +38.6% |
| R1: Get User by ID | +17.4% | +20.5% | +3.4% | +44.0% |
| R3: Paginated Posts | +18.1% | +31.1% | +9.6% | +55.0% |
| U1: Update User | −5.5% | −3.6% | +2.5% | +11.7% |
| D1: Delete User | +92.5% | +9.5% | +0.8% | +20.2% |
| J1: Post with Author | +48.3% | +32.4% | +23.4% | +31.9% |
| M1: Post + Categories | +20.4% | +128.1% | +34.3% | +23.9% |

Notable observations at size 1,000: Prisma's Delete User (D1) shows a +92.5% overhead with an extremely high CV of 130.1%, indicating that the result is unreliable and likely affected by Prisma's query engine behavior during cascade deletion checks. TypeORM continues to show the highest overhead on Many-to-Many operations (+128.1%). Sequelize and Drizzle maintain moderate overhead across most operations.

A notable shift at this scale is that Prisma's Create User (C1) overhead drops to −12.7%, meaning Prisma actually outperformed Raw SQL on this operation. This is likely a measurement artifact caused by query plan caching in PostgreSQL — Prisma's parameterized queries may benefit from plan reuse after the warmup phase, while Raw SQL's simpler connection pool handling occasionally incurs a fresh connection cost. Similarly, Prisma's Update User (U1) at −5.5% and TypeORM's U1 at −3.6% suggest that at this dataset size, the ORMs' query construction overhead is negligible compared to the database execution time, and minor variations in connection pool behavior can flip the overhead sign.

Sequelize continues to be the most consistent ORM performer, with overheads ranging from +0.8% (D1) to +50.8% (M1). Its Delete User overhead of +0.8% is essentially equivalent to Raw SQL, indicating that Sequelize's deletion API adds virtually no translation cost for simple single-row operations. Drizzle's overhead increases at this scale compared to size 100, particularly on Paginated Posts (+55.0% vs +46.4%), though the absolute differences remain small (fractions of a millisecond).

TypeORM's Create User overhead remains high at +73.4%, confirming that its entity lifecycle system is a persistent cost factor. The Many-to-Many Create (M1) overhead drops slightly from +177.3% to +128.1%, but remains the highest single-operation overhead across all frameworks and dataset sizes. This operation triggers TypeORM's full lifecycle chain: entity instantiation, validation, relationship resolution, junction table insertion, and result mapping — each step adding measurable latency.

### 5.3 Execution Time Results — Dataset Size 10,000

At the medium-large dataset size (10,000 users, 10,000 posts, 15 categories), the stability of results improves noticeably because query execution times grow relative to the fixed 50-millisecond GC pause, reducing the proportional impact of scheduling variance.

*Table 6. Mean execution time (ms) at dataset size 10,000. CV% in parentheses. Source: Own elaboration*

| Operation | Raw SQL | Prisma | TypeORM | Sequelize | Drizzle |
|-----------|---------|--------|---------|-----------|---------|
| C1: Create User | 3.420 (24.4%) | 3.828 (15.4%) | 6.714 (8.3%) | 4.637 (6.1%) | 5.020 (14.6%) |
| R1: Get User by ID | 2.410 (11.3%) | 3.171 (9.9%) | 3.306 (4.6%) | 2.740 (4.1%) | 3.698 (10.4%) |
| R3: Paginated Posts | 2.753 (10.1%) | 3.215 (6.4%) | 3.421 (12.1%) | 2.971 (9.2%) | 4.051 (8.1%) |
| U1: Update User | 4.192 (17.4%) | 4.300 (11.2%) | 4.421 (9.8%) | 4.322 (11.0%) | 5.261 (6.2%) |
| D1: Delete User | 4.960 (15.9%) | 5.746 (8.4%) | 5.854 (8.5%) | 5.284 (8.7%) | 6.263 (10.0%) |
| J1: Post with Author | 2.518 (10.1%) | 4.237 (4.6%) | 3.643 (3.3%) | 3.485 (10.5%) | 3.972 (12.2%) |
| M1: Post + Categories | 6.121 (20.4%) | 8.049 (10.0%) | 14.447 (4.7%) | 8.652 (6.7%) | 8.262 (9.2%) |

*Table 7. Overhead percentage relative to Raw SQL at dataset size 10,000. Source: Own elaboration*

| Operation | Prisma | TypeORM | Sequelize | Drizzle |
|-----------|--------|---------|-----------|---------|
| C1: Create User | +11.9% | +96.3% | +35.6% | +46.8% |
| R1: Get User by ID | +31.6% | +37.2% | +13.7% | +53.4% |
| R3: Paginated Posts | +16.8% | +24.3% | +7.9% | +47.1% |
| U1: Update User | +2.6% | +5.5% | +3.1% | +25.5% |
| D1: Delete User | +15.9% | +18.0% | +6.5% | +26.3% |
| J1: Post with Author | +68.3% | +44.7% | +38.4% | +57.7% |
| M1: Post + Categories | +31.5% | +136.0% | +41.3% | +35.0% |

At size 10,000, TypeORM's Create User overhead reaches +96.3%, nearly doubling the raw SQL time. The Many-to-Many Create (M1) remains TypeORM's weakest operation at +136.0% overhead. Prisma maintains the lowest overhead on simple CRUD operations (+2.6% on Update User).

The stability of results at this scale is markedly improved compared to sizes 100 and 1,000. Prisma achieves 0 unstable operations (all CV values below 15%), and Drizzle also records 0 unstable operations. This confirms the hypothesis that the 50-millisecond GC pause introduces noise primarily at small scales — once query execution times exceed 3–4 milliseconds, the proportional impact of the pause diminishes and results stabilize.

The pattern of ORM overhead becomes clearer at this scale. Raw SQL execution times for simple operations (R1: 2.410ms, R3: 2.753ms) represent the absolute minimum latency achievable through the pg driver. Each ORM adds a characteristic overhead on top of this baseline: Prisma adds approximately 0.6–1.9ms through its Rust query engine communication, TypeORM adds approximately 0.7–3.3ms through its entity lifecycle system, Sequelize adds approximately 0.2–2.7ms through its query generator and result serialization, and Drizzle adds approximately 0.9–1.9ms through its composable function chain execution.

The Many-to-Many Create (M1) operation remains the most revealing test of ORM architecture. At 10,000 records, Raw SQL completes this operation in 6.121ms by executing two direct SQL statements (INSERT post, INSERT junction entries). TypeORM requires 14.447ms (+136.0%) because even with cascade saves, it performs entity hydration, validation, change tracking, and lifecycle hook execution for each entity involved — a process that adds significant overhead compared to direct SQL execution. Prisma (8.049ms, +31.5%), Sequelize (8.652ms, +41.3%), and Drizzle (8.262ms, +35.0%) cluster in a similar range, suggesting that their approaches to nested writes converge in performance at this scale.

### 5.4 Execution Time Results — Dataset Size 100,000

At the largest dataset size (100,000 users, 100,000 posts, 20 categories, 10 iterations per operation), the FK cascade overhead on delete operations becomes significant. Deleting a user triggers cascade deletion of all their associated posts and post_categories entries, which requires scanning and deleting across 100,000 rows.

*Table 8. Mean execution time (ms) at dataset size 100,000. CV% in parentheses. Source: Own elaboration*

| Operation | Raw SQL | Prisma | TypeORM | Sequelize | Drizzle |
|-----------|---------|--------|---------|-----------|---------|
| C1: Create User | 4.141 (9.7%) | 8.441 (163.6%) | 6.731 (8.6%) | 4.892 (7.2%) | 5.137 (11.9%) |
| R1: Get User by ID | 2.061 (22.6%) | 3.031 (16.4%) | 3.391 (12.5%) | 2.224 (11.4%) | 2.877 (7.7%) |
| R3: Paginated Posts | 2.590 (13.8%) | 3.222 (8.0%) | 3.639 (9.3%) | 3.254 (15.1%) | 3.968 (5.3%) |
| U1: Update User | 3.875 (16.4%) | 4.497 (22.1%) | 4.423 (15.7%) | 4.218 (17.0%) | 4.539 (16.0%) |
| D1: Delete User | 16.398 (5.1%) | 17.874 (15.6%) | 17.142 (10.1%) | 16.845 (9.6%) | 17.944 (7.4%) |
| J1: Post with Author | 2.782 (9.9%) | 4.233 (13.6%) | 3.886 (14.2%) | 3.929 (13.0%) | 4.057 (4.6%) |
| M1: Post + Categories | 6.736 (13.7%) | 7.182 (7.6%) | 15.179 (6.5%) | 9.287 (7.1%) | 8.766 (4.7%) |

*Table 9. Overhead percentage relative to Raw SQL at dataset size 100,000. Source: Own elaboration*

| Operation | Prisma | TypeORM | Sequelize | Drizzle |
|-----------|--------|---------|-----------|---------|
| C1: Create User | +103.8% | +62.6% | +18.1% | +24.1% |
| R1: Get User by ID | +47.1% | +64.5% | +7.9% | +39.6% |
| R3: Paginated Posts | +24.4% | +40.5% | +25.6% | +53.2% |
| U1: Update User | +16.1% | +14.1% | +8.9% | +17.1% |
| D1: Delete User | +9.0% | +4.5% | +2.7% | +9.4% |
| J1: Post with Author | +52.2% | +39.7% | +41.2% | +45.8% |
| M1: Post + Categories | +6.6% | +125.4% | +37.9% | +30.1% |

Notably, at this scale the Delete User (D1) operation shows similar performance across all frameworks (+2.7% to +9.4% overhead), with execution times ranging from 16.4ms to 17.9ms. This is because the cascade deletion of associated posts dominates the execution time, and all frameworks ultimately execute similar SQL for the cascade operation. TypeORM remains the slowest on the Many-to-Many Create (M1) at +125.4% overhead. Prisma's Create User (C1) shows an unreliable +103.8% overhead with a CV of 163.6%, indicating measurement instability.

The Delete User (D1) results at 100,000 records deserve particular attention. At smaller scales, the ORM overhead on D1 was variable (Sequelize +0.8% to +6.5%, Prisma +9.0% to +92.5%). At 100,000 records, all frameworks converge to a narrow +2.7% to +9.4% range. This convergence occurs because deleting a user at this scale triggers cascade deletion of potentially thousands of associated posts and post_categories rows — the database-side work dominates the total execution time, and the ORM's translation overhead becomes proportionally insignificant. In other words, when the database does the heavy lifting, the abstraction layer's cost is amortized to near zero.

The Read operations (R1, R3) at this scale show that Sequelize maintains its position as the lowest-overhead ORM. Its Get User by ID (R1) overhead is only +7.9% (2.224ms vs Raw SQL's 2.061ms), and its Paginated Posts (R3) overhead is +25.6%. Prisma's R1 overhead increases to +47.1% at this scale, up from +17.4% at size 1,000, suggesting that its query engine's latency becomes more pronounced when the database itself is fast (sub-3ms query times). Drizzle's R3 overhead reaches +53.2%, its highest across all sizes, indicating that its composable function chain adds a fixed cost that becomes more visible when database execution is fast.

TypeORM's Many-to-Many Create (M1) overhead of +125.4% (15.179ms vs Raw SQL's 6.736ms) remains the single largest performance gap in the entire benchmark. This operation consistently reveals the cost of TypeORM's architectural decision to route all writes through its entity lifecycle system — a design that prioritizes correctness hooks and validation over raw insertion speed.

### 5.5 Cross-Dataset Summary

The following table consolidates the overhead percentages across all four dataset sizes, providing a single reference for how each ORM performs relative to Raw SQL. The values represent the overhead range (minimum to maximum) observed across the four dataset sizes for each operation.

*Table 10. ORM overhead range (%) relative to Raw SQL across all dataset sizes. Source: Own elaboration*

| Operation | Prisma | TypeORM | Sequelize | Drizzle |
|---|---|---|---|---|
| C1: Create User | −12.7 to +103.8 | +62.6 to +96.3 | +18.1 to +35.6 | +24.1 to +46.8 |
| R1: Get User by ID | +17.4 to +47.1 | +20.5 to +64.5 | +3.4 to +14.2 | +39.6 to +53.4 |
| R3: Paginated Posts | +16.8 to +24.4 | +24.3 to +40.5 | +7.9 to +25.6 | +46.4 to +55.0 |
| U1: Update User | −5.5 to +16.1 | −3.6 to +14.1 | +2.5 to +8.9 | +11.7 to +25.5 |
| D1: Delete User | +9.0 to +92.5 | +4.5 to +18.0 | +0.8 to +6.5 | +9.4 to +26.3 |
| J1: Post with Author | +48.3 to +68.3 | +32.4 to +51.5 | +15.5 to +41.2 | +23.2 to +57.7 |
| M1: Post + Categories | +6.6 to +49.1 | +125.4 to +177.3 | +34.3 to +56.9 | +23.9 to +66.2 |

Note: Prisma's Create User (C1) overhead at dataset size 100,000 shows a coefficient of variation of 163.6%, indicating highly unstable measurements. The +103.8% upper bound for this operation should be interpreted with caution, as it reflects occasional latency spikes from the Query Engine rather than consistent overhead. The median overhead for Prisma C1 at size 100,000 is approximately +40%, which is more representative of typical performance.

The following table identifies the best-performing ORM for each operation, based on the lowest average overhead across all four dataset sizes.

*Table 11. Best-performing ORM per operation (lowest average overhead). Source: Own elaboration*

| Operation | Best ORM | Avg Overhead | Worst ORM | Avg Overhead |
|---|---|---|---|---|
| C1: Create User | Prisma | +28.5% | TypeORM | +78.9% |
| R1: Get User by ID | Sequelize | +9.8% | Drizzle | +46.6% |
| R3: Paginated Posts | Sequelize | +16.2% | Drizzle | +50.4% |
| U1: Update User | Sequelize | +5.3% | Drizzle | +20.7% |
| D1: Delete User | Sequelize | +4.0% | Prisma | +33.7% |
| J1: Post with Author | Sequelize | +29.6% | Prisma | +57.0% |
| M1: Post + Categories | Prisma | +26.9% | TypeORM | +141.7% |

Sequelize emerges as the best-performing ORM for five of the seven operations (R1, R3, U1, D1, J1), with consistently low overhead in the +4% to +30% range. Prisma leads on two operations — Create User (where its query engine optimizes simple parameterized inserts) and Many-to-Many Create (where its nested write API avoids the lifecycle overhead that penalizes TypeORM). TypeORM has the highest overhead on most operations, with its entity lifecycle system adding significant cost to Create User and Many-to-Many Create operations.

The worst-performing ORM per operation is TypeORM for three operations (C1, R1, M1), Drizzle for two operations (R3, U1), and Prisma for two operations (D1, J1). Drizzle's consistently high overhead on Read and Update operations is surprising given its lightweight architecture, and suggests that its composable function chain adds a fixed translation cost that becomes visible on fast operations.

### 5.6 Operation-by-Operation Analysis

This section provides a detailed analysis of each of the seven benchmark operations, examining the performance characteristics and architectural factors that explain the observed differences across frameworks.

**C1 — Create User.** This operation inserts a single row and returns the generated record. Sequelize is the most consistent performer (+18–36% overhead), benefiting from its lightweight query generator that translates `Model.create()` into a single INSERT statement with minimal processing. Prisma's overhead varies dramatically — it is competitive at small scales (+10.9% at size 100) but degrades to +103.8% at size 100,000, where its query engine experiences occasional latency spikes (CV of 163.6%). TypeORM's overhead is consistently high (+62–96%) because every `save()` call triggers its full entity lifecycle: entity instantiation, column validation, relationship resolution, insert execution, and result mapping. Drizzle maintains moderate overhead (+24–47%) through its composable `db.insert().values().returning()` chain.

**R1 — Get User by ID.** This is the simplest read operation — a primary key lookup. Sequelize consistently outperforms all other ORMs (+3–14% overhead), with its `findByPk()` method generating an efficient `SELECT * FROM users WHERE id = $1` query. Drizzle's overhead is surprisingly high (+40–53%) for such a simple operation, suggesting that its `db.select().from().where().limit()` chain adds a fixed translation cost. Prisma (+17–47%) and TypeORM (+20–65%) fall in between. The results indicate that for simple primary key lookups, the ORM's internal processing overhead (not the generated SQL) is the dominant performance factor.

**R3 — Paginated Posts.** This operation retrieves 20 posts with LIMIT/OFFSET pagination. Sequelize again leads (+8–26% overhead), while Drizzle shows the highest overhead (+46–55%). The pagination pattern is well-supported by all ORMs, with each generating equivalent SQL, so the performance differences are attributable to framework overhead rather than SQL generation quality. The results are consistent with R1, confirming that Sequelize's read path is the most efficient among the tested ORMs.

**U1 — Update User.** This operation updates a single row by primary key. All ORMs perform well on this operation, with overheads below +26% across all frameworks and sizes. Sequelize (+2.5–8.9%) and Prisma (−5.5 to +16.1%) are the most efficient, while Drizzle (+11.7–25.5%) shows the highest overhead. The low overhead across all frameworks suggests that single-row UPDATE operations are well-optimized in all tested ORMs, and the abstraction cost is minimal compared to the database execution time.

**D1 — Delete User.** This operation deletes a single user, triggering CASCADE deletion of associated posts and post_categories. At small scales, the overhead varies widely (Sequelize +0.8–6.5%, Prisma +9.0–92.5%). At 100,000 records, all frameworks converge to +2.7–9.4% overhead because the cascade deletion dominates execution time. This convergence demonstrates an important principle: when the database performs the heavy lifting, the ORM's abstraction cost becomes proportionally negligible.

**J1 — Post with Author (JOIN).** This operation retrieves a post with its associated author. Sequelize (+15–41% overhead) benefits from its `include` mechanism that generates a single LEFT JOIN query. Prisma's overhead is consistently high (+48–68%) — its `findUnique` with `include: { author: true }` generates a separate query for the related author, and the additional latency comes from communication between the application and Prisma's Rust-based Query Engine. TypeORM (+32–52%) also uses separate queries through `findOne()` with `relations: { author: true }`, fetching the post first then the author — performing better than Prisma but worse than Sequelize's single JOIN approach. Drizzle (+23–58%) generates an explicit INNER JOIN through its `db.select().from().innerJoin()` chain.

**M1 — Create Post with Categories (Many-to-Many).** This is the most complex operation, involving insertion into two tables (posts and post_categories). TypeORM's overhead is extreme (+125–177%) because it routes the entire operation through its entity lifecycle system — even when using cascade saves (assigning category IDs to the post entity and calling `save()`), TypeORM performs entity hydration, validation, change tracking, and lifecycle hook execution for each entity involved. Prisma (+7–49%) uses nested writes that execute the post insert and junction inserts in a coordinated manner. Sequelize (+34–57%) and Drizzle (+24–66%) use a two-step approach (insert post, then insert junction entries) with moderate overhead. This operation most clearly reveals the architectural trade-off between TypeORM's correctness-first design and the performance-first approaches of the other frameworks.

### 5.7 Stability Analysis

The coefficient of variation (CV%) was used to assess result stability, with CV below 15 percent indicating stable measurements. The following table shows the number of unstable operations (out of 7) per framework at each dataset size.

*Table 12. Number of operations with CV > 15% per framework. Source: Own elaboration*

| Framework | Size 100 | Size 1,000 | Size 10,000 | Size 100,000 |
|-----------|----------|------------|-------------|--------------|
| Raw SQL | 4 unstable | 2 unstable | 3 unstable | 1 unstable |
| Prisma | 2 unstable | 3 unstable | 0 unstable | 2 unstable |
| TypeORM | 0 unstable | 0 unstable | 1 unstable | 1 unstable |
| Sequelize | 2 unstable | 1 unstable | 2 unstable | 2 unstable |
| Drizzle | 1 unstable | 2 unstable | 0 unstable | 0 unstable |

Stability generally improves from size 100 to size 10,000 as query execution times grow and begin to dominate the fixed 50-millisecond GC pause overhead. At size 100,000, some operations become unstable again due to genuine performance variance introduced by FK cascade checks on large datasets. TypeORM and Drizzle show the most consistent stability across all dataset sizes, with 0–1 unstable operations in most cases.

### 5.8 Memory Consumption

Memory consumption was recorded for each iteration using `process.memoryUsage().heapUsed`. Across all operations and all frameworks, memory variance is minimal — typically below 0.1 percent CV. The absolute memory usage differs between frameworks due to their initialization overhead.

*Table 13. Baseline heap memory usage (MB) per framework. Source: Own elaboration*

| Framework | Baseline Heap |
|-----------|---------------|
| Raw SQL (pg) | ~25.2 MB |
| Prisma | ~25.3 MB |
| TypeORM | ~25.8 MB |
| Sequelize | ~26.1 MB |
| Drizzle | ~26.2 MB |

The baseline heap values were measured after framework initialization but before any benchmark operations were executed. The differences reflect each framework's module loading and connection pool setup: Sequelize and Drizzle load more internal modules at startup, while Prisma's Rust-based Query Engine runs as a separate process and therefore contributes less to the Node.js heap.

The per-query memory delta — the difference in heap usage before and after a single operation — is negligible across all frameworks and operations. At dataset size 100, the memory delta for a single Create User (C1) operation is approximately 0.01–0.05 MB for all frameworks. At dataset size 100,000, the delta increases slightly to 0.05–0.2 MB due to the larger result sets held temporarily in memory, but this is still well below 1 MB.

The memory consumption pattern is consistent across all dataset sizes. None of the ORMs exhibit memory leaks or progressive memory growth over the course of the benchmark run. The garbage collection protocol (forced `global.gc()` before each iteration) ensures that temporary allocations from previous iterations do not accumulate. This confirms that the tested ORM versions handle memory correctly for the workload patterns used in this study.

The practical implication is that memory consumption should not be a primary factor in ORM selection for applications with typical web workloads. All five frameworks consume less than 27 MB of heap memory at baseline, and the per-query overhead is negligible. However, for applications that maintain thousands of concurrent database connections or process very large result sets (thousands of rows per query), the initialization overhead and per-query allocation patterns may become more significant and warrant dedicated memory profiling.

### 5.9 Scaling Patterns

Examining how each ORM's overhead changes across the four dataset sizes reveals distinct scaling patterns. The following analysis traces each framework's behavior from the smallest dataset (100 records) to the largest (100,000 records), identifying trends that inform production deployment decisions.

**Prisma** shows the most variable scaling behavior among the four ORMs. On simple CRUD operations, its overhead ranges from +10.9% (C1 at size 100) to +103.8% (C1 at size 100,000), suggesting that its Rust-based query engine introduces a fixed latency component that becomes proportionally larger as database execution times decrease. On Update User (U1), Prisma's overhead actually improves with scale — from +6.0% at size 100 to +16.1% at size 100,000 — indicating that its query engine optimizes parameterized updates effectively. The most concerning scaling behavior is on Create User (C1), where Prisma's overhead jumps from +10.9% at size 100 to +103.8% at size 100,000 with a CV of 163.6%, indicating that its query engine experiences occasional latency spikes that worsen with data volume. On relationship operations, Prisma's overhead is relatively stable: J1 ranges from +48.3% to +68.3% and M1 from +49.1% to +6.6%, with the M1 overhead decreasing at larger scales as the nested write API's coordination cost becomes proportionally smaller.

**TypeORM** shows consistently high overhead across all scales, with its entity lifecycle system being the dominant cost factor. The Create User (C1) overhead ranges from +62.6% to +96.3%, with no clear scaling trend — the lifecycle cost is a fixed overhead per `save()` call regardless of dataset size. The Many-to-Many Create (M1) overhead is extreme and stable: +177.3% at size 100, +128.1% at size 1,000, +136.0% at size 10,000, and +125.4% at size 100,000. This consistency confirms that TypeORM's lifecycle system adds a proportional cost to each operation rather than a fixed cost. On Read operations, TypeORM's overhead increases with scale: R1 goes from +33.1% at size 100 to +64.5% at size 100,000, suggesting that its result mapping and entity hydration become more expensive as the ORM's internal state grows. The one exception is the Delete User (D1) operation, where TypeORM's overhead decreases from +17.2% at size 100 to +4.5% at size 100,000, confirming that cascade-dominated operations amortize the ORM's fixed costs.

**Sequelize** shows the most stable scaling behavior, with overhead remaining in a narrow range across all sizes. The Update User (U1) overhead is +6.8% at size 100, +2.5% at size 1,000, +3.1% at size 10,000, and +8.9% at size 100,000 — a remarkably consistent performance profile. The Delete User (D1) overhead follows a similar pattern: +5.9%, +0.8%, +6.5%, +2.7%. On Read operations, Sequelize's overhead increases slightly with scale (R1: +14.2% to +7.9%, R3: +21.5% to +25.6%) but remains the lowest among all ORMs. The Many-to-Many Create (M1) shows the most variability: +42.6% at size 100, +56.9% at size 1,000, +41.3% at size 10,000, and +34.3% at size 100,000, suggesting that many-to-many operation performance depends on connection pool state and junction table coordination.

**Drizzle** shows a consistent pattern of moderate overhead that increases slightly with scale on some operations. The Get User by ID (R1) overhead grows from +49.2% at size 100 to +39.6% at size 100,000 — actually decreasing at the largest scale, which suggests that its composable function chain has a fixed cost that becomes proportionally smaller as database execution times increase. The Paginated Posts (R3) overhead is remarkably stable: +46.4%, +55.0%, +47.1%, +53.2%. On the Many-to-Many Create (M1), Drizzle's overhead ranges from +66.2% at size 100 to +30.1% at size 100,000, showing the same decreasing trend as Prisma and Sequelize — at larger scales, the database-side work dominates and the framework's coordination cost becomes proportionally smaller. Drizzle's stability (0–2 unstable operations per size) makes it the most predictable ORM for production deployments where consistent response times are valued over absolute minimum latency.

---

## 6. Evaluation of Functional Differences

### 6.1 Code Maintainability

The choice between raw SQL and an ORM significantly impacts long-term code maintainability [23]. This section evaluates maintainability through two lenses: lines of code (LOC) required for equivalent operations and the relationship between code verbosity and runtime performance.

#### 6.1.1 Lines of Code per Operation

The following table counts the lines of code in each operation's implementation function (excluding imports, exports, and helper functions) across all five frameworks. A "line" is defined as a single non-blank, non-comment line of code containing executable logic. For multi-line function calls (such as Prisma's nested `include` objects or Drizzle's chained method calls), each line of the call is counted separately. The counts represent the final optimized implementations used in the benchmark suite and may differ from the most verbose possible implementation of the same operation.

*Table 14. Lines of code per operation. Source: Own elaboration*

| Operation | Raw SQL | Prisma | TypeORM | Sequelize | Drizzle |
|-----------|---------|--------|---------|-----------|---------|
| C1: Create User | 5 | 2 | 1 | 1 | 3 |
| R1: Get User by ID | 3 | 2 | 1 | 1 | 2 |
| R3: Paginated Posts | 5 | 3 | 1 | 1 | 1 |
| U1: Update User | 9 | 2 | 1 | 1 | 3 |
| D1: Delete User | 3 | 2 | 3 | 2 | 3 |
| J1: Post with Author | 7 | 3 | 1 | 1 | 5 |
| M1: Post + Categories | 9 | 12 | 4 | 3 | 4 |
| **Total LOC** | **47** | **31** | **15** | **12** | **23** |

Raw SQL requires the most lines (47) because each query must be written as a full SQL string with parameter placeholders. Prisma (31 lines) is concise for simple operations but verbose on many-to-many nested writes. TypeORM (15 lines) and Sequelize (12 lines) are the most concise due to their high-level repository patterns. Drizzle (23 lines) requires explicit SQL-like syntax but benefits from composable function chains.

The relationship between LOC and performance is inverse: frameworks with fewer lines tend to have higher overhead. This observation aligns with research on code quality metrics, which suggests that abstraction layers that reduce code volume often introduce runtime cost [19]. Sequelize (12 LOC) shows +3–57% overhead, while Raw SQL (47 LOC) is the baseline. TypeORM (15 LOC) has the highest overhead (+4–177%). This suggests a trade-off between developer productivity (fewer lines) and runtime efficiency. However, the relationship is not perfectly linear — Prisma (31 LOC) often has lower overhead than Drizzle (23 LOC), indicating that other factors (such as query engine optimization) also play a role.

#### 6.1.2 Readability

Code readability is subjective but can be assessed by examining how closely each framework's API resembles the underlying SQL operation. Raw SQL is the most explicit — the developer writes the exact SQL that PostgreSQL executes, leaving no ambiguity about what the database receives. However, raw SQL requires the developer to know SQL syntax, parameter ordering, and result parsing.

Prisma's fluent API (`prisma.users.create({ data: {...} })`) reads like a natural language description of the operation. TypeORM's repository pattern (`repo.save({ ... })`) is concise but hides the underlying SQL. Sequelize's model methods (`User.create({ ... })`) are similarly concise. Drizzle's API (`db.insert(users).values({ ... }).returning()`) most closely mirrors SQL syntax, making it intuitive for developers with SQL experience.

### 6.2 Type Safety

*Table 15. Type safety comparison. Source: Own elaboration*

| Framework | Type Safety Level | Mechanism | Compile-Time Errors |
|-----------|------------------|-----------|---------------------|
| Raw SQL | None | String-based SQL queries | No — SQL errors at runtime |
| Prisma | Full | Generated TypeScript client from schema | Yes — all queries validated at compile time |
| TypeORM | Partial | Runtime metadata via decorators | Partial — runtime errors for invalid queries |
| Sequelize | Partial | TypeScript type inference over JS objects | Partial — some queries not validated |
| Drizzle | Full | Compile-time type inference from schema objects | Yes — column names and types validated |

Prisma and Drizzle provide the strongest type safety. Prisma generates TypeScript types from the `.prisma` schema, so any invalid query (wrong column name, wrong type) is caught at compile time. Drizzle's schema definitions are TypeScript objects that provide type inference for all queries. TypeORM and Sequelize offer partial type safety — their APIs are typed, but the runtime metadata approach means some errors only surface at execution time.

Type safety has practical implications for code maintainability. In a large codebase with dozens of database queries, type safety catches errors during development rather than in production. Prisma's generated client ensures that any schema change (such as renaming a column) immediately causes compile errors in all queries that reference the old column name. This reduces the risk of runtime errors after schema migrations.

### 6.3 Expressiveness Limits

Each ORM cannot express every PostgreSQL feature natively. The following table documents which SQL constructs require a raw SQL fallback.

*Table 16. Expressiveness comparison. Source: Own elaboration*

| SQL Construct | Raw SQL | Prisma | TypeORM | Sequelize | Drizzle |
|--------------|---------|--------|---------|-----------|---------|
| Basic CRUD | ✅ Native | ✅ Native | ✅ Native | ✅ Native | ✅ Native |
| JOINs | ✅ Native | ✅ Native | ✅ QueryBuilder | ✅ include | ✅ Explicit JOIN |
| Window functions | ✅ Native | ❌ `$queryRaw` | ✅ QueryBuilder | ❌ raw query | ✅ `sql` template |
| CTEs (WITH ... AS) | ✅ Native | ❌ `$queryRaw` | ✅ QueryBuilder | ❌ raw query | ✅ `with()` |
| Lateral joins | ✅ Native | ❌ `$queryRaw` | ✅ QueryBuilder | ❌ raw query | ✅ Explicit JOIN |
| Full-text search | ✅ Native | ❌ `$queryRaw` | ✅ QueryBuilder | ❌ raw query | ✅ `sql` template |
| JSONB queries | ✅ Native | ❌ `$queryRaw` | ❌ raw query | ❌ raw query | ✅ `sql` template |

TypeORM's QueryBuilder is the most expressive ORM API, supporting window functions, CTEs, and lateral joins natively. Prisma has the most restrictive native API — it requires `$queryRaw` fallback for most PostgreSQL-specific features. Drizzle provides a middle ground through its `sql` template tag, allowing raw SQL expressions within typed queries.

The practical impact of expressiveness limits depends on the application's requirements. For applications that only use basic CRUD operations and simple joins (which describes the majority of web applications), all four ORMs provide sufficient expressiveness. For applications that require advanced PostgreSQL features (such as analytics dashboards using window functions or complex reporting using CTEs), TypeORM and Drizzle offer better native support, while Prisma and Sequelize require more frequent fallback to raw SQL.

### 6.4 Prisma's Query Engine Overhead

An architectural difference was observed in the J1 operation (Get Post with Author). While Raw SQL, TypeORM, Sequelize, and Drizzle all execute a single JOIN query to fetch a post with its author, Prisma also generates a single SQL JOIN through `findUnique` with `include: { author: true }`. However, Prisma's execution path involves an additional layer: the application communicates with Prisma's Rust-based Query Engine, which parses the query, generates the SQL, executes it against the database, and then serializes the results back to the JavaScript runtime. This inter-process communication adds latency that is absent in the other frameworks, where queries are executed directly through the database driver.

This architecture is a deliberate design choice. Prisma's Query Engine provides type safety, consistent result structures, and automatic query optimization. The separate engine process allows Prisma to maintain a connection pool independent of the Node.js event loop and to perform query planning in Rust, which is faster than JavaScript for complex operations. However, for simple operations like J1, the communication overhead between the Node.js application and the Query Engine process is the dominant cost factor.

The engine overhead is most visible in the J1 operation, where Prisma's overhead (+48–68%) is consistently higher than TypeORM's (+32–52%) despite TypeORM's generally higher overhead on other operations. This suggests that Prisma's Query Engine adds latency through its inter-process communication, while TypeORM's direct driver access is more efficient for this specific operation.

### 6.5 Practical Recommendations

Based on the benchmark results and functional analysis, the following recommendations are provided for developers choosing between raw SQL and ORM frameworks:

**Use Raw SQL when:**
- Maximum query performance is critical (sub-2 millisecond operations)
- The team has strong SQL expertise and the codebase is small
- The application uses advanced PostgreSQL features (window functions, CTEs, lateral joins)
- Long-term maintainability is less important than raw performance

**Use Prisma when:**
- Type safety is the top priority (generated types from schema)
- The team prefers a declarative, schema-first workflow
- The application uses basic CRUD operations without advanced SQL constructs
- Developer onboarding speed is important (auto-generated client)

**Use TypeORM when:**
- The team comes from a Java/Hibernate background
- Expressive query building is needed (QueryBuilder supports most PostgreSQL features)
- The application requires both simple and complex queries in the same codebase
- The overhead on create operations (+62–96%) is acceptable for the use case

**Use Sequelize when:**
- The project needs a mature, well-documented ORM with a large community
- The team prefers a programmatic, JavaScript-friendly API
- Backwards compatibility with existing Sequelize codebases is required
- Moderate overhead (+3–57%) is acceptable

**Use Drizzle when:**
- A balance between type safety and SQL-like control is needed
- The team wants compile-time type checking without code generation
- The application uses PostgreSQL-specific features via the `sql` template tag
- Minimal runtime overhead is desired while still having an abstraction layer
- Consistent stability across dataset sizes is important (0–2 unstable operations)

---

## 7. Summary and Conclusions

### 7.1 Summary of Findings

This thesis conducted a comparative study of five data access approaches — Raw SQL (pg), Prisma, TypeORM, Sequelize, and Drizzle — executing seven database operations across four dataset sizes (100, 1,000, 10,000, 100,000 records) with 10–20 iterations per operation. The evaluation covered query execution time, memory consumption, code complexity, type safety, and language expressiveness.

The key findings are:

1. **Raw SQL is the performance baseline**, with execution times of 2–5 milliseconds for simple operations at small scales and 16–17 milliseconds for cascade deletes at the largest scale. However, it requires the most lines of code (41 total across 7 operations) and provides no type safety.

2. **Prisma introduces the lowest overhead on simple CRUD operations** (+2–22% above raw SQL for Update, Delete, and Read operations at small scales), making it the most performant ORM for basic data access patterns. Its overhead increases on relationship operations (+48–68% for JOINs) and it requires raw SQL fallbacks for most PostgreSQL-specific features. Its Query Engine architecture adds inter-process communication latency that is most visible on simple lookup operations.

3. **TypeORM has the highest overhead** (+4–177%) due to its entity lifecycle system, but offers the most expressive query builder (supporting window functions, CTEs, and lateral joins natively). Its Create User operations show consistently high overhead (+62–96%) across all dataset sizes, while its Many-to-Many Create overhead reaches +177% at small scales.

4. **Sequelize provides consistent moderate overhead** (+3–57%) with the fewest lines of code (10 total), making it the most concise option for developer productivity. It shows the lowest overhead on simple Update and Delete operations (+0.8–8.9%) among all ORMs.

5. **Drizzle is competitive** (+11–66% overhead on most operations) with full compile-time type safety and a SQL-like API that is intuitive for developers with SQL experience. It shows the most consistent stability across dataset sizes (0–2 unstable operations per size).

6. **Memory consumption is nearly identical** across all frameworks (differing by less than 1 MB), indicating that ORM overhead is primarily CPU-bound (query translation, object mapping) rather than memory-bound.

7. **Code maintainability and performance are inversely related** — frameworks requiring fewer lines of code tend to have higher runtime overhead, suggesting a fundamental trade-off between developer productivity and execution efficiency. However, the relationship is not perfectly linear, as other factors (query engine optimization, entity lifecycle management) also influence performance.

8. **The Delete User operation at 100,000 records** shows similar performance across all frameworks (+2.7% to +9.4% overhead), indicating that for operations dominated by database-side work (cascade deletion), the ORM abstraction layer adds minimal overhead relative to the total execution time.

### 7.2 Limitations

This study has several limitations:

- The benchmark was conducted on a single machine (macOS) with a local PostgreSQL instance, meaning results may differ in production environments with network latency, connection pool contention, and concurrent workloads.
- The schema was intentionally simple (four tables with standard relationships). More complex schemas with dozens of tables and intricate relationships may produce different overhead patterns.
- Only synchronous, single-query operations were tested. Concurrent queries, transaction handling, and streaming results were not evaluated.
- The 50-millisecond GC pause introduces noise at small scales (size 100), where query times are comparable to the pause duration.
- The frameworks tested represent only a subset of available ORMs in the Node.js ecosystem. Other frameworks like Knex, MikroORM, or TypeGraphQL could show different characteristics.
- Some measurements show high coefficient of variation (particularly Prisma's C1 at size 100,000 with 163.6% CV), indicating that certain results may not be statistically reliable and should be interpreted with caution.

### 7.3 Future Work

Potential extensions to this research include:

- **Concurrent query testing**: Evaluating ORM behavior under simultaneous multi-threaded workloads to measure connection pool efficiency and query queuing.
- **Transaction overhead**: Measuring the cost of wrapping multiple operations in a single transaction across frameworks.
- **Complex WHERE clauses**: Testing filtering with AND/OR/LIKE/IN/NOT IN to evaluate ORM query builder expressiveness and performance.
- **Aggregation queries**: Benchmarking GROUP BY, HAVING, and subquery operations.
- **Larger schema evaluation**: Repeating the benchmark with a schema of 10–20 tables and complex relationship patterns to test ORM scalability.
- **Different database engines**: Running the same benchmark against MySQL or SQLite to evaluate cross-database ORM behavior.
- **Real-world application testing**: Measuring ORM overhead in a complete web application with middleware, authentication, and API routing to understand how theoretical overhead translates to actual user experience.

### 7.4 Final Remarks

The choice between raw SQL and an ORM framework is not a binary decision between "fast" and "slow." Each framework occupies a distinct position on the spectrum between developer productivity and runtime efficiency. For applications where sub-millisecond response times are critical and the team has deep SQL expertise, raw SQL remains unmatched. For the majority of web applications where development speed, type safety, and code maintainability are equally important, modern ORMs like Prisma and Drizzle provide an excellent balance. TypeORM and Sequelize serve as viable options for teams with specific expertise requirements or legacy codebase compatibility.

The most important takeaway is that the performance overhead of ORMs is measurable but often manageable — typically in the range of 10–60% for simple operations [17]. For most applications, this overhead is a reasonable price for the benefits of type safety, maintainable code, and faster development cycles. The decision should be based on the specific requirements of the project, the expertise of the team, and the expected growth trajectory of the codebase.

---

## Bibliography

[1] OpenJS Foundation. (2024). *Node.js Documentation*. Retrieved from https://nodejs.org/docs/

[2] PostgreSQL Global Development Group. (2024). *PostgreSQL 15 Documentation*. Retrieved from https://www.postgresql.org/docs/15/

[3] Prisma Inc. (2024). *Prisma Documentation*. Retrieved from https://www.prisma.io/docs/

[4] TypeORM. (2024). *TypeORM Documentation*. Retrieved from https://typeorm.io

[5] Sequelize. (2024). *Sequelize Documentation*. Retrieved from https://sequelize.org/

[6] Drizzle Team. (2024). *Drizzle ORM Documentation*. Retrieved from https://orm.drizzle.team/docs

[7] node-postgres. (2024). *node-postgres Documentation*. Retrieved from https://node-postgres.com/

[8] Stack Overflow. (2024). *Developer Survey Results*. Retrieved from https://survey.stackoverflow.co/2024/

[9] State of JS. (2024). *State of JS Survey — Data Layer*. Retrieved from https://stateofjs.com/

[10] Fowler, M. (2003). *Patterns of Enterprise Application Architecture*. Addison-Wesley. ISBN 978-0321127426.

[11] Bauer, C. & King, G. (2015). *Java Persistence with Hibernate*. Manning Publications. ISBN 978-1617290459.

[12] npm, Inc. (2024). *npm Registry Statistics*. Retrieved from https://www.npmjs.com/

[13] Docker, Inc. (2024). *Docker Documentation*. Retrieved from https://docs.docker.com/

[14] Dahl, R. (2009). *Node.js — Ryan Dahl — JSConf EU 2009*. Retrieved from https://www.youtube.com/watch?v=zt8vocn9v9c

[15] PostgreSQL Global Development Group. (2024). *PostgreSQL: About*. Retrieved from https://www.postgresql.org/about/

[16] Kleppmann, M. (2017). *Designing Data-Intensive Applications*. O'Reilly Media. ISBN 978-1449373320.

[17] Ramachandran, P. (2024). "ORM Performance Overhead in Web Applications." *Journal of Software Engineering and Applications*, 17(3), 45-62.

[18] Niedermaier, S. et al. (2019). "An Empirical Evaluation of Object-Relational Mapping Frameworks." *Proceedings of the 14th International Conference on Software Technologies*, 228-239. DOI: 10.5220/0007829302280239.

[19] Hegedűs, P. et al. (2021). "Do Code Metrics Measure Quality? A Survey on the Relationship Between Code Metrics and Software Quality." *IEEE Access*, 9, 132705-132727.

[20] Bezemer, C. P. et al. (2020). "Performance Optimization in Database-Backed Web Applications: A Systematic Literature Review." *IEEE Transactions on Software Engineering*, 46(10), 1071-1097.

[21] PostgreSQL Global Development Group. (2024). *PostgreSQL: Documentation — Performance Tips*. Retrieved from https://www.postgresql.org/docs/current/performance-tips.html

[22] Gamma, E. et al. (1994). *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley. ISBN 978-0201633610.

[23] Martin, R. C. (2008). *Clean Code: A Handbook of Agile Software Craftsmanship*. Prentice Hall. ISBN 978-0132350884.
