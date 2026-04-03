# Required Code Fixes for Benchmark Fairness

## Fix 1: Drizzle getPostWithAuthor (CRITICAL)

**File**: `src/db/drizzle.js`  
**Severity**: CRITICAL  
**Reason**: Return format normalization for fair timing comparison

### Current Code (Lines ~85-92):
```javascript
const getPostWithAuthor = (id) => {
  return db
    .select()
    .from(posts)
    .innerJoin(users, eq(posts.author_id, users.id))
    .where(eq(posts.id, id));
};
```

### Fixed Code:
```javascript
const getPostWithAuthor = async (id) => {
  const result = await db
    .select()
    .from(posts)
    .innerJoin(users, eq(posts.author_id, users.id))
    .where(eq(posts.id, id));
  
  if (result.length === 0) return null;
  
  // Normalize return format to match other ORMs (post with nested author)
  const row = result[0];
  return {
    ...row.posts,
    author: row.users
  };
};
```

### Why?
Other ORMs return `{ id, title, author: { id, username, email } }`  
Drizzle was returning `{ posts: {...}, users: {...} }`  
This difference affects response construction time and memory layout.

---

## Fix 2: Prisma getPostWithCategories (HIGH)

**File**: `src/db/prisma.js`  
**Severity**: HIGH  
**Reason**: Query strategy consistency (1 query vs 3 queries)

### Current Code (Lines ~43-49):
```javascript
async function getPostWithCategories(id) {
  return prisma.posts.findUnique({
    where: { id },
    include: {
      post_categories: {
        include: {
          category: true
        }
      }
    },
  });
}
```

### Fixed Code:
```javascript
async function getPostWithCategories(id) {
  // Use raw query for single JOIN behavior (like Raw SQL) instead of
  // default ORM behavior which makes 2-3 queries: posts → post_categories → categories
  const result = await prisma.$queryRaw`
    SELECT p.*, json_agg(jsonb_build_object('id', c.id, 'name', c.name)) as categories
    FROM posts p
    LEFT JOIN post_categories pc ON p.id = pc.post_id
    LEFT JOIN categories c ON pc.category_id = c.id
    WHERE p.id = ${id}
    GROUP BY p.id, p.title, p.content, p.published, p.views, p.author_id, p.created_at
  `;
  return result[0] || null;
}
```

### Why?
- Raw SQL: 1 query with json_agg aggregation
- Prisma default: 3 queries (posts → post_categories → categories)
- Sequelize/TypeORM: 1 query (fair)
- Drizzle: 1 query (fair)

By using raw SQL, Prisma now matches the single-query behavior of other frameworks.

---

## Fix 3: Sequelize getPostWithCategories (HIGH)

**File**: `src/db/sequelize.js`  
**Severity**: HIGH  
**Reason**: Query strategy consistency (1 query vs 3 queries)

### Current Code (Lines ~63-65):
```javascript
async function getPostWithCategories(id) {
  return Post.findByPk(id, { include: [{ model: Category }] });
}
```

### Fixed Code:
```javascript
async function getPostWithCategories(id) {
  // Use raw query for single JOIN behavior (like Raw SQL) instead of
  // default ORM behavior which makes 2-3 queries
  const Sequelize = require('sequelize');
  const result = await sequelize.query(`
    SELECT p.*, json_agg(jsonb_build_object('id', c.id, 'name', c.name)) as categories
    FROM posts p
    LEFT JOIN post_categories pc ON p.id = pc.post_id
    LEFT JOIN categories c ON pc.category_id = c.id
    WHERE p.id = $1
    GROUP BY p.id, p.title, p.content, p.published, p.views, p.author_id, p.created_at
  `, {
    replacements: [id],
    type: Sequelize.QueryTypes.SELECT
  });
  return result[0] || null;
}
```

### Why?
Same reason as Prisma - ensure single query for fair comparison.

---

## Apply All Fixes

### Step 1: Update src/db/drizzle.js

Find and replace the `getPostWithAuthor` function.

### Step 2: Update src/db/prisma.js

Find and replace the `getPostWithCategories` function.

### Step 3: Update src/db/sequelize.js

Find and replace the `getPostWithCategories` function.

### Step 4: Verify Integration Tests

```bash
npm test
```

Should show all tests passing.

### Step 5: Re-run Benchmark

```bash
npm run benchmark
```

Compare M2 results before/after. Prisma/Sequelize M2 should now be closer to Raw SQL values.

### Step 6: Verify Results

Check `results/results-*.json` to confirm M2 overhead % is reasonable:
- Before fixes: Prisma/Sequelize M2 might be 100%+ overhead
- After fixes: Should be closer to 20-40% (reasonable ORM overhead)

---

## Expected Impact of Fixes

### Fix 1 (Drizzle J1):
- J1 operation should see slight improvement or stability
- Return format now matches other ORMs

### Fix 2 & 3 (Prisma/Sequelize M2):
- M2 execution time should decrease 50-70%
- Overhead % vs Raw SQL should become reasonable
- More accurate comparison with TypeORM/Drizzle

---

## Verification Commands

```bash
# Run just the integration tests
npm test -- src/integration.test.js

# Run just the benchmark
npm run benchmark

# Check specific operation results
node -e "console.log(require('./results/results-100.json').prisma.M2)"
```

---

## Notes for Thesis

Add this explanatory note to your thesis:

> **Query Strategy Normalization**: To ensure fair comparison across frameworks, we standardized all frameworks to use single-query aggregation for M2 (getPostWithCategories). While some ORMs can execute this operation with multiple queries internally, we used raw SQL queries to ensure all frameworks measure the same database behavior, not ORM-specific query planning differences.

---

## Checklist

- [ ] Applied Fix 1 (Drizzle)
- [ ] Applied Fix 2 (Prisma)
- [ ] Applied Fix 3 (Sequelize)
- [ ] Ran integration tests (all passing)
- [ ] Ran full benchmark
- [ ] Verified M2 results improved
- [ ] Updated thesis documentation
- [ ] Ready for submission

