const { init, createUser, createPostWithCategories } = require('./src/db/typeorm');
(async () => {
  await init();
  try {
     const res = await createPostWithCategories({ title: 'T1', author_id: 1 }, [1, 2]);
     console.log(res);
  } catch(e) {
     console.error(e);
  }
  process.exit();
})();
