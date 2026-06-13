const { PrismaClient } = require('@prisma/client');
const { DATABASE_URL } = require('../config');
const queryLogger = require('../query-logger');

const prismaOptions = {
  datasources: { db: { url: DATABASE_URL + '?connection_limit=10' } },
};

if (process.env.QUERY_LOG) {
  prismaOptions.log = [{ level: 'query', emit: 'event' }];
}

const prisma = new PrismaClient(prismaOptions);

if (process.env.QUERY_LOG) {
  prisma.$on('query', (e) => {
    queryLogger.log('prisma', e.query, e.params ? JSON.parse(e.params) : []);
  });
}

const init = () => prisma.$connect();

async function createUser(username, email) {
  return prisma.users.create({ data: { username, email } });
}

async function getUserById(id) {
  return prisma.users.findUnique({ where: { id } });
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

async function bulkInsertPosts(postList) {
  return prisma.posts.createMany({
    data: postList.map(p => ({
      title: p.title,
      content: p.content,
      published: p.published,
      views: p.views,
      authorId: p.author_id,
    })),
  });
}

async function updateUser(id, data) {
  return prisma.users.update({ where: { id }, data });
}

async function deleteUser(id) {
  return prisma.users.delete({ where: { id } });
}

async function close() {
  await prisma.$disconnect();
}

async function warmQuery() {
  await prisma.$queryRaw`SELECT 1`;
}

module.exports = {
  init, prisma, createUser,
  getUserById, getPaginatedPosts,
  getPostWithAuthor, createPostWithCategories, getPostWithCategories,
  bulkInsertPosts, updateUser, deleteUser,
  close, warmQuery,
};
