const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const init = () => prisma.$connect();

async function createUser(username, email) {
  return prisma.users.create({ data: { username, email } });
}

async function createPost(title, content, published, views, author_id) {
  return prisma.posts.create({
    data: { title, content, published, views, authorId: author_id },
  });
}

async function bulkInsertPosts(postsData) {
  const prismaPosts = postsData.map(p => ({
    title: p.title, content: p.content, published: p.published,
    views: p.views, authorId: p.author_id,
  }));
  return prisma.posts.createMany({ data: prismaPosts });
}

async function getUserById(id) {
  return prisma.users.findUnique({ where: { id } });
}

async function getPostById(id) {
  return prisma.posts.findUnique({ where: { id } });
}

async function getPaginatedPosts(offset, limit) {
  return prisma.posts.findMany({
    skip: offset, take: limit, orderBy: { id: 'asc' },
  });
}

async function getPostWithAuthor(id) {
  return prisma.posts.findUnique({
    where: { id }, include: { author: true },
  });
}

async function createPostWithCategories(postData, categoryIds) {
  const post = await prisma.posts.create({
    data: {
      title: postData.title,
      content: postData.content,
      published: postData.published,
      views: postData.views,
      authorId: postData.author_id,
      post_categories: {
        create: categoryIds.map((catId) => ({ category_id: catId }))
      }
    },
  });
  return post;
}

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

async function updateUser(id, data) {
  return prisma.users.update({ where: { id }, data });
}

async function updatePost(id, data) {
  return prisma.posts.update({ where: { id }, data });
}

async function deleteUser(id) {
  return prisma.users.delete({ where: { id } });
}

async function deletePost(id) {
  return prisma.posts.delete({ where: { id } });
}

// D2: Bulk delete posts by author_id
async function deletePostsByAuthor(authorId) {
  const result = await prisma.posts.deleteMany({ where: { authorId } });
  return result.count;
}

async function close() {
  await prisma.$disconnect();
}

async function warmQuery() {
  await prisma.$queryRaw`SELECT 1`;
}

module.exports = {
  init, prisma, createUser, createPost, bulkInsertPosts,
  getUserById, getPostById, getPaginatedPosts,
  getPostWithAuthor, createPostWithCategories, getPostWithCategories,
  updateUser, updatePost, deleteUser, deletePost, deletePostsByAuthor,
  close, warmQuery,
};
