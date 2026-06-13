import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
  DataSource,
} from 'typeorm';
import { DATABASE_URL } from '../config';
import queryLogger from '../query-logger';

@Entity('users')
class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email!: string;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  created_at!: Date;

  @OneToMany(() => Post, (post) => post.author)
  posts!: Post[];
}

@Entity('posts')
class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  content!: string;

  @Column({ type: 'boolean', default: false })
  published!: boolean;

  @Column({ type: 'int', default: 0 })
  views!: number;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  created_at!: Date;

  @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author!: User;

  @ManyToMany(() => Category, (category) => category.posts, { cascade: true })
  @JoinTable({
    name: 'post_categories',
    joinColumn: { name: 'post_id' },
    inverseJoinColumn: { name: 'category_id' },
  })
  categories!: Category[];
}

@Entity('categories')
class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  name!: string;

  @ManyToMany(() => Post, (post) => post.categories)
  posts!: Post[];
}

class TypeORMQueryLogger {
  logQuery(query: string, parameters?: any[]) {
    queryLogger.log('typeorm', query, parameters || []);
  }
  logQueryError(error: string, query: string, parameters?: any[]) {
    queryLogger.log('typeorm', query, parameters || []);
  }
  logQuerySlow(time: number, query: string, parameters?: any[]) {
    queryLogger.log('typeorm', query, parameters || []);
  }
  logSchemaBuild(message: string) {}
  logMigration(message: string) {}
  log(level: string, message: string) {}
}

const dataSource = new DataSource({
  type: 'postgres',
  url: DATABASE_URL,
  synchronize: false,
  logging: process.env.QUERY_LOG ? ['query'] : false,
  logger: process.env.QUERY_LOG ? new TypeORMQueryLogger() : undefined,
  entities: [User, Post, Category],
  poolSize: 10,
});

async function init() {
  await dataSource.initialize();
}

async function close() {
  await dataSource.destroy();
}

async function warmQuery() {
  await dataSource.query('SELECT 1');
}

async function createUser(username: string, email: string) {
  const repo = dataSource.getRepository(User);
  const user = repo.create({ username, email });
  return repo.save(user);
}

async function getUserById(id: number) {
  return dataSource.getRepository(User).findOneBy({ id });
}

async function getPaginatedPosts(offset: number, limit: number) {
  return dataSource.getRepository(Post).find({
    skip: offset,
    take: limit,
    order: { id: 'ASC' },
  });
}

async function getPostWithAuthor(id: number) {
  return dataSource.getRepository(Post).findOne({
    where: { id },
    relations: ['author'],
  });
}

async function createPostWithCategories(postData: any, categoryIds: number[]) {
  const repo = dataSource.getRepository(Post);
  const { author_id, ...rest } = postData;
  const post = repo.create({ ...rest, author: { id: author_id } }) as any;
  post.categories = categoryIds.map((id) => ({ id }));
  return repo.save(post);
}

async function getPostWithCategories(id: number) {
  return dataSource.getRepository(Post).findOne({
    where: { id },
    relations: ['categories'],
  });
}

async function bulkInsertPosts(postList: any[]) {
  const repo = dataSource.getRepository(Post);
  const entities = postList.map(({ author_id, ...rest }) =>
    repo.create({ ...rest, author: { id: author_id } }) as any
  );
  return repo.save(entities);
}

async function updateUser(id: number, data: any) {
  await dataSource.getRepository(User).update(id, data);
}

async function deleteUser(id: number) {
  const result = await dataSource.getRepository(User).delete(id);
  return (result.affected ?? 0) > 0;
}

module.exports = {
  init,
  close,
  warmQuery,
  createUser,
  getUserById,
  getPaginatedPosts,
  getPostWithAuthor,
  createPostWithCategories,
  getPostWithCategories,
  bulkInsertPosts,
  updateUser,
  deleteUser,
};
