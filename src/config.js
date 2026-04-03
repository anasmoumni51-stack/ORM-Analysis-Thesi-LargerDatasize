require('dotenv').config();
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:thesis2026@localhost:5432/orm_benchmark';

const DATASET_SIZES = [
  // { label: '100', users: 100, posts: 100, categories: 5, iterations: 20 },
  { label: '1000', users: 1000, posts: 1000, categories: 10, iterations: 20 },
  // { label: '10000', users: 10000, posts: 10000, categories: 15, iterations: 20 },
  // { label: '100000', users: 100000, posts: 100000, categories: 20, iterations: 10 },
];

module.exports = { DATABASE_URL, DATASET_SIZES };
