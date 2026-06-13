const { Sequelize, DataTypes } = require('sequelize');

const { DATABASE_URL } = require('../config');
const queryLogger = require('../query-logger');

let sequelize;
let User, Post, Category, PostCategory;

async function init() {
  if (sequelize) return sequelize;

  sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.QUERY_LOG ? (sql) => queryLogger.log('sequelize', sql) : false,
    pool: { max: 10, min: 0 },
  });

  await sequelize.authenticate();

  User = sequelize.define('users', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(50), allowNull: false },
    email: { type: DataTypes.STRING(100), allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, { tableName: 'users', timestamps: false });

  Post = sequelize.define('posts', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: true },
    published: { type: DataTypes.BOOLEAN, defaultValue: false },
    views: { type: DataTypes.INTEGER, defaultValue: 0 },
    author_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, { tableName: 'posts', timestamps: false });

  Category = sequelize.define('categories', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
  }, { tableName: 'categories', timestamps: false });

  PostCategory = sequelize.define('post_categories', {
    post_id: { type: DataTypes.INTEGER, primaryKey: true },
    category_id: { type: DataTypes.INTEGER, primaryKey: true },
  }, { tableName: 'post_categories', timestamps: false });

  User.hasMany(Post, { foreignKey: 'author_id' });
  Post.belongsTo(User, { foreignKey: 'author_id' });
  Post.belongsToMany(Category, { through: PostCategory, foreignKey: 'post_id', otherKey: 'category_id' });
  Category.belongsToMany(Post, { through: PostCategory, foreignKey: 'category_id', otherKey: 'post_id' });

  return sequelize;
}

async function close() {
  if (sequelize) await sequelize.close();
}

async function warmQuery() {
  await sequelize.query('SELECT 1');
}

async function createUser(username, email) {
  return User.create({ username, email });
}

async function getUserById(id) {
  return User.findByPk(id);
}

async function getPaginatedPosts(offset, limit) {
  return Post.findAll({ offset, limit, order: [['id', 'ASC']] });
}

async function getPostWithAuthor(id) {
  return Post.findByPk(id, { include: [{ model: User }] });
}

async function createPostWithCategories(postData, categoryIds) {
  const post = await Post.create(postData);
  await post.setCategories(categoryIds);
  return post;
}

async function getPostWithCategories(id) {
  return Post.findByPk(id, { include: [{ model: Category }] });
}

async function bulkInsertPosts(postList) {
  return Post.bulkCreate(postList);
}

async function updateUser(id, data) {
  return User.update(data, { where: { id } });
}

async function deleteUser(id) {
  return (await User.destroy({ where: { id } })) > 0;
}

module.exports = { init, close, warmQuery, createUser, getUserById, getPaginatedPosts, getPostWithAuthor, createPostWithCategories, getPostWithCategories, bulkInsertPosts, updateUser, deleteUser };
