const store = require('../src/store/inMemoryStore');

beforeEach(() => {
  store.clear();
});

afterEach(() => {
  store.clear();
});
