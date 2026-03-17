const request = require('supertest');
const app = require('./testUtils/app');

describe('GET /api/users/featured', () => {
  it('should return 200 and an array', async () => {
    const res = await request(app).get('/api/users/featured');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  }, 10000);
});
