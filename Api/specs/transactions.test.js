const supertest = require('supertest');

const app = require('../app');
const db = require('../db/connect-test');

const agent = supertest.agent(app);

beforeAll(async () => await db.connect());
beforeEach(async () => await db.clear());
afterEach(() => jest.clearAllMocks());
afterAll(async () => await db.close());

describe('Transactions API', () => {
  test('creates, lists, updates, and deletes a transaction', async () => {
    const payload = {
      type: 'expense',
      amount: 18.75,
      category: 'Groceries',
      date: '2026-07-31',
      description: 'Weekly market run'
    };

    const created = await agent.post('/transactions').send(payload).expect(201);

    expect(created.body).toMatchObject({
      _id: expect.any(String),
      type: 'expense',
      amount: 18.75,
      category: 'Groceries',
      description: 'Weekly market run',
      createdAt: expect.any(String),
      updatedAt: expect.any(String)
    });

    const listed = await agent.get('/transactions?type=expense&sorter=date').expect(200);

    expect(listed.body).toHaveLength(1);
    expect(listed.body[0]._id).toBe(created.body._id);

    const updated = await agent.patch(`/transactions/${created.body._id}`).send({ amount: 20 }).expect(200);

    expect(updated.body.amount).toBe(20);

    await agent.delete(`/transactions/${created.body._id}`).expect(200);

    const afterDelete = await agent.get('/transactions').expect(200);
    expect(afterDelete.body).toHaveLength(0);
  });

  test('rejects an incomplete transaction payload', () =>
    agent
      .post('/transactions')
      .send({ amount: 12 })
      .expect(400)
      .then(res => {
        expect(res.body).toMatchObject({
          error: 201,
          message: 'Missing required parameters'
        });
      }));
});
