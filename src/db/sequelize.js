const { Sequelize, DataTypes } = require('sequelize');

const { DATABASE_URL } = require('../config');

let sequelize;
let User, Post, Category, PostCategory;

async function init() {
  if (sequelize) return sequelize;

  sequelize = new Sequelize(DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
  });

  await sequelize.authenticate();

  User = sequelize.define('users', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, { tableName: 'users', timestamps: false });

  Post = sequelize.define('posts', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: true },
    published: { type: DataTypes.BOOLEAN, defaultValue: false },
    views: { type: DataTypes.INTEGER, defaultValue: 0 },
    author_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  }, { tableName: 'posts', timestamps: false });

  Category = sequelize.define('categories', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
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

async function createUser(username, email) {
  return User.create({ username, email });
}

async function createPost(title, content, published, views, author_id) {
  return Post.create({ title, content, published, views, author_id });
}

async function bulkInsertPosts(postsArray) {
  return Post.bulkCreate(postsArray);
}

async function getUserById(id) {
  return User.findByPk(id);
}

async function getPostById(id) {
  return Post.findByPk(id);
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

async function updateUser(id, data) {
  const user = await User.findByPk(id);
  if (!user) return null;
  await user.update(data);
  return user;
}

async function updatePost(id, data) {
  const post = await Post.findByPk(id);
  if (!post) return null;
  await post.update(data);
  return post;
}

async function deleteUser(id) {
  const user = await User.findByPk(id);
  if (!user) return false;
  await user.destroy();
  return true;
}

async function deletePost(id) {
  const post = await Post.findByPk(id);
  if (!post) return false;
  await post.destroy();
  return true;
}

module.exports = { init, close, createUser, createPost, bulkInsertPosts, getUserById, getPostById, getPaginatedPosts, getPostWithAuthor, createPostWithCategories, getPostWithCategories, updateUser, updatePost, deleteUser, deletePost };
