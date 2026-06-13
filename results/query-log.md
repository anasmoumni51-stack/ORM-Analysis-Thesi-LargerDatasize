# Generated SQL Comparison

Generated: 2026-06-13T17:09:50.398Z

This report shows the actual SQL each ORM generates for the 7 benchmark operations.

## C1

| Framework | Query # | SQL |
|-----------|---------|-----|
| raw-sql | 1 | `INSERT INTO users (username, email) VALUES ($1, $2)` -- params: ["test_user_C1_rawsql","c1_rawsql@test.com"] |
| prisma | 1 | `INSERT INTO "public"."users" ("username","email","created_at") VALUES ($1,$2,$3) RETURNING "public"."users"."id", "public"."users"."username", "public"."users"."email", "public"."users"."created_at"` -- params: ["test_user_C1_prisma","c1_prisma@test.com","2026-06-13 17:09:50.049 UTC"] |
| typeorm | 1 | `START TRANSACTION` |
| typeorm | 2 | `INSERT INTO "users"("username", "email", "created_at") VALUES ($1, $2, DEFAULT) RETURNING "id", "created_at"` -- params: ["test_user_C1_typeorm","c1_typeorm@test.com"] |
| typeorm | 3 | `COMMIT` |
| sequelize | 1 | `Executing (default): INSERT INTO "users" ("id","username","email","created_at") VALUES (DEFAULT,$1,$2,$3) RETURNING "id","username","email","created_at";` |
| drizzle | 1 | `insert into "users" ("id", "username", "email", "created_at") values (default, $1, $2, default) returning "id", "username", "email", "created_at"` -- params: ["test_user_C1_drizzle","c1_drizzle@test.com"] |

## C3

| Framework | Query # | SQL |
|-----------|---------|-----|
| raw-sql | 1 | `INSERT INTO posts (title, content, published, views, author_id) VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10), ($11, $12, $13, $14, $15), ($16, $17, $18, $19, $20), ($21, $22, $23, $24, $25), ($26, $27, $28, $29, $30), ($31, $32, $33, $34, $35), ($36, $37, $38, $39, $40), ($41, $42, $43, $44, $45), ($46, $47, $48, $49, $50)` -- params: ["bulk_post_0","Bulk content 0",false,0,1,"bulk_post_1","Bulk content 1",false,0,1,"bulk_post_2","Bulk content 2",false,0,1,"bulk_post_3","Bulk content 3",false,0,1,"bulk_post_4","Bulk content 4",false,0,1,"bulk_post_5","Bulk content 5",false,0,1,"bulk_post_6","Bulk content 6",false,0,1,"bulk_post_7","Bulk content 7",false,0,1,"bulk_post_8","Bulk content 8",false,0,1,"bulk_post_9","Bulk content 9",false,0,1] |
| prisma | 1 | `BEGIN` |
| prisma | 2 | `INSERT INTO "public"."posts" ("title","content","published","views","author_id","created_at") VALUES ($1,$2,$3,$4,$5,$6), ($7,$8,$9,$10,$11,$12), ($13,$14,$15,$16,$17,$18), ($19,$20,$21,$22,$23,$24), ($25,$26,$27,$28,$29,$30), ($31,$32,$33,$34,$35,$36), ($37,$38,$39,$40,$41,$42), ($43,$44,$45,$46,$47,$48), ($49,$50,$51,$52,$53,$54), ($55,$56,$57,$58,$59,$60)` -- params: ["bulk_post_0","Bulk content 0",false,0,1,"2026-06-13 17:09:50.055 UTC","bulk_post_1","Bulk content 1",false,0,1,"2026-06-13 17:09:50.055 UTC","bulk_post_2","Bulk content 2",false,0,1,"2026-06-13 17:09:50.055 UTC","bulk_post_3","Bulk content 3",false,0,1,"2026-06-13 17:09:50.055 UTC","bulk_post_4","Bulk content 4",false,0,1,"2026-06-13 17:09:50.055 UTC","bulk_post_5","Bulk content 5",false,0,1,"2026-06-13 17:09:50.055 UTC","bulk_post_6","Bulk content 6",false,0,1,"2026-06-13 17:09:50.055 UTC","bulk_post_7","Bulk content 7",false,0,1,"2026-06-13 17:09:50.055 UTC","bulk_post_8","Bulk content 8",false,0,1,"2026-06-13 17:09:50.055 UTC","bulk_post_9","Bulk content 9",false,0,1,"2026-06-13 17:09:50.055 UTC"] |
| prisma | 3 | `COMMIT` |
| typeorm | 1 | `START TRANSACTION` |
| typeorm | 2 | `INSERT INTO "posts"("title", "content", "published", "views", "created_at", "author_id") VALUES ($1, $2, $3, $4, DEFAULT, $5), ($6, $7, $8, $9, DEFAULT, $10), ($11, $12, $13, $14, DEFAULT, $15), ($16, $17, $18, $19, DEFAULT, $20), ($21, $22, $23, $24, DEFAULT, $25), ($26, $27, $28, $29, DEFAULT, $30), ($31, $32, $33, $34, DEFAULT, $35), ($36, $37, $38, $39, DEFAULT, $40), ($41, $42, $43, $44, DEFAULT, $45), ($46, $47, $48, $49, DEFAULT, $50) RETURNING "id", "published", "views", "created_at"` -- params: ["bulk_post_0","Bulk content 0",false,0,1,"bulk_post_1","Bulk content 1",false,0,1,"bulk_post_2","Bulk content 2",false,0,1,"bulk_post_3","Bulk content 3",false,0,1,"bulk_post_4","Bulk content 4",false,0,1,"bulk_post_5","Bulk content 5",false,0,1,"bulk_post_6","Bulk content 6",false,0,1,"bulk_post_7","Bulk content 7",false,0,1,"bulk_post_8","Bulk content 8",false,0,1,"bulk_post_9","Bulk content 9",false,0,1] |
| typeorm | 3 | `COMMIT` |
| sequelize | 1 | `Executing (default): INSERT INTO "posts" ("id","title","content","published","views","author_id","created_at") VALUES (DEFAULT,'bulk_post_0','Bulk content 0',false,0,1,'2026-06-13 17:09:50.287 +00:00'),(DEFAULT,'bulk_post_1','Bulk content 1',false,0,1,'2026-06-13 17:09:50.288 +00:00'),(DEFAULT,'bulk_post_2','Bulk content 2',false,0,1,'2026-06-13 17:09:50.288 +00:00'),(DEFAULT,'bulk_post_3','Bulk content 3',false,0,1,'2026-06-13 17:09:50.288 +00:00'),(DEFAULT,'bulk_post_4','Bulk content 4',false,0,1,'2026-06-13 17:09:50.288 +00:00'),(DEFAULT,'bulk_post_5','Bulk content 5',false,0,1,'2026-06-13 17:09:50.288 +00:00'),(DEFAULT,'bulk_post_6','Bulk content 6',false,0,1,'2026-06-13 17:09:50.288 +00:00'),(DEFAULT,'bulk_post_7','Bulk content 7',false,0,1,'2026-06-13 17:09:50.288 +00:00'),(DEFAULT,'bulk_post_8','Bulk content 8',false,0,1,'2026-06-13 17:09:50.288 +00:00'),(DEFAULT,'bulk_post_9','Bulk content 9',false,0,1,'2026-06-13 17:09:50.288 +00:00') RETURNING "id","title","content","published","views","author_id","created_at";` |
| drizzle | 1 | `insert into "posts" ("id", "title", "content", "published", "views", "author_id", "created_at") values (default, $1, $2, $3, $4, $5, default), (default, $6, $7, $8, $9, $10, default), (default, $11, $12, $13, $14, $15, default), (default, $16, $17, $18, $19, $20, default), (default, $21, $22, $23, $24, $25, default), (default, $26, $27, $28, $29, $30, default), (default, $31, $32, $33, $34, $35, default), (default, $36, $37, $38, $39, $40, default), (default, $41, $42, $43, $44, $45, default), (default, $46, $47, $48, $49, $50, default) returning "id", "title", "content", "published", "views", "author_id", "created_at"` -- params: ["bulk_post_0","Bulk content 0",false,0,1,"bulk_post_1","Bulk content 1",false,0,1,"bulk_post_2","Bulk content 2",false,0,1,"bulk_post_3","Bulk content 3",false,0,1,"bulk_post_4","Bulk content 4",false,0,1,"bulk_post_5","Bulk content 5",false,0,1,"bulk_post_6","Bulk content 6",false,0,1,"bulk_post_7","Bulk content 7",false,0,1,"bulk_post_8","Bulk content 8",false,0,1,"bulk_post_9","Bulk content 9",false,0,1] |

## R1

| Framework | Query # | SQL |
|-----------|---------|-----|
| raw-sql | 1 | `SELECT id, username, email, created_at FROM users WHERE id = $1` -- params: [1] |
| prisma | 1 | `SELECT "public"."users"."id", "public"."users"."username", "public"."users"."email", "public"."users"."created_at" FROM "public"."users" WHERE ("public"."users"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3` -- params: [1,1,0] |
| typeorm | 1 | `SELECT "User"."id" AS "User_id", "User"."username" AS "User_username", "User"."email" AS "User_email", "User"."created_at" AS "User_created_at" FROM "users" "User" WHERE (("User"."id" = $1)) LIMIT 1` -- params: [1] |
| sequelize | 1 | `Executing (default): SELECT "id", "username", "email", "created_at" FROM "users" AS "users" WHERE "users"."id" = 1;` |
| drizzle | 1 | `select "id", "username", "email", "created_at" from "users" where "users"."id" = $1 limit $2` -- params: [1,1] |

## R3

| Framework | Query # | SQL |
|-----------|---------|-----|
| raw-sql | 1 | `SELECT id, title, content, published, views, author_id, created_at FROM posts ORDER BY id LIMIT $1 OFFSET $2` -- params: [20,0] |
| prisma | 1 | `SELECT "public"."posts"."id", "public"."posts"."title", "public"."posts"."content", "public"."posts"."published", "public"."posts"."views", "public"."posts"."author_id", "public"."posts"."created_at" FROM "public"."posts" WHERE 1=1 ORDER BY "public"."posts"."id" ASC LIMIT $1 OFFSET $2` -- params: [20,0] |
| typeorm | 1 | `SELECT "Post"."id" AS "Post_id", "Post"."title" AS "Post_title", "Post"."content" AS "Post_content", "Post"."published" AS "Post_published", "Post"."views" AS "Post_views", "Post"."created_at" AS "Post_created_at", "Post"."author_id" AS "Post_author_id" FROM "posts" "Post" ORDER BY "Post"."id" ASC LIMIT 20 OFFSET 0` |
| sequelize | 1 | `Executing (default): SELECT "id", "title", "content", "published", "views", "author_id", "created_at" FROM "posts" AS "posts" ORDER BY "posts"."id" ASC LIMIT 20 OFFSET 0;` |
| drizzle | 1 | `select "id", "title", "content", "published", "views", "author_id", "created_at" from "posts" order by "posts"."id" limit $1` -- params: [20] |

## U1

| Framework | Query # | SQL |
|-----------|---------|-----|
| raw-sql | 1 | `UPDATE users SET email = $1 WHERE id = $2` -- params: ["updated@test.com",2] |
| prisma | 1 | `UPDATE "public"."users" SET "email" = $1 WHERE ("public"."users"."id" = $2 AND 1=1) RETURNING "public"."users"."id", "public"."users"."username", "public"."users"."email", "public"."users"."created_at"` -- params: ["updated@test.com",2] |
| typeorm | 1 | `UPDATE "users" SET "email" = $1 WHERE "id" IN ($2)` -- params: ["updated@test.com",2] |
| sequelize | 1 | `Executing (default): UPDATE "users" SET "email"=$1 WHERE "id" = $2` |
| drizzle | 1 | `update "users" set "email" = $1 where "users"."id" = $2` -- params: ["updated@test.com",2] |

## D1

| Framework | Query # | SQL |
|-----------|---------|-----|
| raw-sql | 1 | `DELETE FROM users WHERE id = $1` -- params: [5] |
| prisma | 1 | `DELETE FROM "public"."users" WHERE ("public"."users"."id" = $1 AND 1=1) RETURNING "public"."users"."id", "public"."users"."username", "public"."users"."email", "public"."users"."created_at"` -- params: [5] |
| typeorm | 1 | `DELETE FROM "users" WHERE "id" IN ($1)` -- params: [5] |
| sequelize | 1 | `Executing (default): DELETE FROM "users" WHERE "id" = 5` |
| drizzle | 1 | `delete from "users" where "users"."id" = $1` -- params: [5] |

## J1

| Framework | Query # | SQL |
|-----------|---------|-----|
| raw-sql | 1 | `SELECT p.id, p.title, p.content, p.published, p.views, p.author_id, p.created_at, u.id, u.username, u.email, u.created_at FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = $1` -- params: [1] |
| prisma | 1 | `SELECT "public"."posts"."id", "public"."posts"."title", "public"."posts"."content", "public"."posts"."published", "public"."posts"."views", "public"."posts"."author_id", "public"."posts"."created_at" FROM "public"."posts" WHERE ("public"."posts"."id" = $1 AND 1=1) LIMIT $2 OFFSET $3` -- params: [1,1,0] |
| prisma | 2 | `SELECT "public"."users"."id", "public"."users"."username", "public"."users"."email", "public"."users"."created_at" FROM "public"."users" WHERE "public"."users"."id" IN ($1) OFFSET $2` -- params: [1,0] |
| typeorm | 1 | `SELECT DISTINCT "distinctAlias"."Post_id" AS "ids_Post_id" FROM (SELECT "Post"."id" AS "Post_id", "Post"."title" AS "Post_title", "Post"."content" AS "Post_content", "Post"."published" AS "Post_published", "Post"."views" AS "Post_views", "Post"."created_at" AS "Post_created_at", "Post"."author_id" AS "Post_author_id", "Post__Post_author"."id" AS "Post__Post_author_id", "Post__Post_author"."username" AS "Post__Post_author_username", "Post__Post_author"."email" AS "Post__Post_author_email", "Post__Post_author"."created_at" AS "Post__Post_author_created_at" FROM "posts" "Post" LEFT JOIN "users" "Post__Post_author" ON "Post__Post_author"."id"="Post"."author_id" WHERE (("Post"."id" = $1))) "distinctAlias" ORDER BY "Post_id" ASC LIMIT 1` -- params: [1] |
| typeorm | 2 | `SELECT "Post"."id" AS "Post_id", "Post"."title" AS "Post_title", "Post"."content" AS "Post_content", "Post"."published" AS "Post_published", "Post"."views" AS "Post_views", "Post"."created_at" AS "Post_created_at", "Post"."author_id" AS "Post_author_id", "Post__Post_author"."id" AS "Post__Post_author_id", "Post__Post_author"."username" AS "Post__Post_author_username", "Post__Post_author"."email" AS "Post__Post_author_email", "Post__Post_author"."created_at" AS "Post__Post_author_created_at" FROM "posts" "Post" LEFT JOIN "users" "Post__Post_author" ON "Post__Post_author"."id"="Post"."author_id" WHERE ( (("Post"."id" = $1)) ) AND ( "Post"."id" IN (1) )` -- params: [1] |
| sequelize | 1 | `Executing (default): SELECT "posts"."id", "posts"."title", "posts"."content", "posts"."published", "posts"."views", "posts"."author_id", "posts"."created_at", "user"."id" AS "user.id", "user"."username" AS "user.username", "user"."email" AS "user.email", "user"."created_at" AS "user.created_at" FROM "posts" AS "posts" LEFT OUTER JOIN "users" AS "user" ON "posts"."author_id" = "user"."id" WHERE "posts"."id" = 1;` |
| drizzle | 1 | `select "posts"."id", "posts"."title", "posts"."content", "posts"."published", "posts"."views", "posts"."author_id", "posts"."created_at", "users"."id", "users"."username", "users"."email", "users"."created_at" from "posts" inner join "users" on "posts"."author_id" = "users"."id" where "posts"."id" = $1` -- params: [1] |

## M1

| Framework | Query # | SQL |
|-----------|---------|-----|
| raw-sql | 1 | `INSERT INTO posts (title, content, published, views, author_id) VALUES ($1, $2, $3, $4, $5) RETURNING id` -- params: ["M1 Test","M1 content",true,0,3] |
| raw-sql | 2 | `INSERT INTO post_categories (post_id, category_id) VALUES ($1, $2), ($1, $3), ($1, $4)` -- params: [21,1,2,3] |
| prisma | 1 | `BEGIN` |
| prisma | 2 | `INSERT INTO "public"."posts" ("title","content","published","views","author_id","created_at") VALUES ($1,$2,$3,$4,$5,$6) RETURNING "public"."posts"."id"` -- params: ["M1 Test","M1 content",true,0,3,"2026-06-13 17:09:50.076 UTC"] |
| prisma | 3 | `INSERT INTO "public"."post_categories" ("post_id","category_id") VALUES ($1,$2), ($3,$4), ($5,$6)` -- params: [21,1,21,2,21,3] |
| prisma | 4 | `SELECT "public"."posts"."id", "public"."posts"."title", "public"."posts"."content", "public"."posts"."published", "public"."posts"."views", "public"."posts"."author_id", "public"."posts"."created_at" FROM "public"."posts" WHERE "public"."posts"."id" = $1 LIMIT $2 OFFSET $3` -- params: [21,1,0] |
| prisma | 5 | `COMMIT` |
| typeorm | 1 | `SELECT "Category"."id" AS "Category_id", "Category"."name" AS "Category_name" FROM "categories" "Category" WHERE "Category"."id" IN ($1, $2, $3)` -- params: [1,2,3] |
| typeorm | 2 | `START TRANSACTION` |
| typeorm | 3 | `INSERT INTO "posts"("title", "content", "published", "views", "created_at", "author_id") VALUES ($1, $2, $3, $4, DEFAULT, $5) RETURNING "id", "published", "views", "created_at"` -- params: ["M1 Test","M1 content",true,0,3] |
| typeorm | 4 | `INSERT INTO "post_categories"("post_id", "category_id") VALUES ($1, $2), ($3, $4), ($5, $6)` -- params: [21,1,21,2,21,3] |
| typeorm | 5 | `COMMIT` |
| sequelize | 1 | `Executing (default): INSERT INTO "posts" ("id","title","content","published","views","author_id","created_at") VALUES (DEFAULT,$1,$2,$3,$4,$5,$6) RETURNING "id","title","content","published","views","author_id","created_at";` |
| sequelize | 2 | `Executing (default): SELECT "post_id", "category_id" FROM "post_categories" AS "post_categories" WHERE "post_categories"."post_id" = 21;` |
| sequelize | 3 | `Executing (default): INSERT INTO "post_categories" ("post_id","category_id") VALUES (21,1),(21,2),(21,3) RETURNING "post_id","category_id";` |
| drizzle | 1 | `insert into "posts" ("id", "title", "content", "published", "views", "author_id", "created_at") values (default, $1, $2, $3, $4, $5, default) returning "id", "title", "content", "published", "views", "author_id", "created_at"` -- params: ["M1 Test","M1 content",true,0,3] |
| drizzle | 2 | `insert into "post_categories" ("post_id", "category_id") values ($1, $2), ($3, $4), ($5, $6)` -- params: [21,1,21,2,21,3] |

## Summary: Query Count per Operation

| Framework | C1 | C3 | R1 | R3 | U1 | D1 | J1 | M1 |
|-----------|---|---|---|---|---|---|---|---|
| raw-sql | 1 1 1 1 1 1 1 2 |
| prisma | 1 3 1 1 1 1 2 5 |
| typeorm | 3 3 1 1 1 1 2 5 |
| sequelize | 1 1 1 1 1 1 1 3 |
| drizzle | 1 1 1 1 1 1 1 2 |
