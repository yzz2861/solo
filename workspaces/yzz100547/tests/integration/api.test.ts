import { setupTest, teardownTest, authHeader, TestContext } from '../setup';
import { createActivity, cancelActivity, addActivityParticipants } from '../../src/services/activityService';
import { createInventoryItem } from '../../src/services/inventoryService';

describe('Integration Tests', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTest();
  });

  afterAll(async () => {
    await teardownTest();
  });

  describe('Auth API', () => {
    it('should register a new user', async () => {
      const response = await ctx.request
        .post('/api/auth/register')
        .send({
          name: '测试用户',
          phone: '13800138999',
          password: '123456',
          role: 'resident',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.phone).toBe('138****8999');
    });

    it('should login with correct credentials', async () => {
      const response = await ctx.request
        .post('/api/auth/login')
        .send({
          phone: '13800138001',
          password: '123456',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const response = await ctx.request
        .post('/api/auth/login')
        .send({
          phone: '13800138001',
          password: 'wrong',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should get current user info', async () => {
      const response = await ctx.request
        .get('/api/auth/me')
        .set(authHeader(ctx.residents[0].token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.name).toBe('张居民');
      expect(response.body.data.user.phone).toBe('138****8001');
    });
  });

  describe('Activity API', () => {
    it('should create activity as social worker', async () => {
      const response = await ctx.request
        .post('/api/activities')
        .set(authHeader(ctx.socialWorker.token))
        .send({
          name: '社区清洁活动',
          description: '周末社区大扫除',
          points_per_person: 100,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activity.name).toBe('社区清洁活动');
    });

    it('should reject creating activity as resident', async () => {
      const response = await ctx.request
        .post('/api/activities')
        .set(authHeader(ctx.residents[0].token))
        .send({
          name: '测试活动',
          points_per_person: 100,
        });

      expect(response.status).toBe(403);
    });

    it('should add participants and award points', async () => {
      const activity = await createActivity('植树活动', 50, '植树节活动');

      const response = await ctx.request
        .post(`/api/activities/${activity.id}/participants`)
        .set(authHeader(ctx.socialWorker.token))
        .send({
          user_ids: [ctx.residents[0].id, ctx.residents[1].id],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.participants.length).toBe(2);
      expect(response.body.data.transactions.length).toBe(2);
    });

    it('should cancel activity and revoke points', async () => {
      const activity = await createActivity('临时活动', 30, '测试活动');
      await addActivityParticipants(activity.id, [ctx.residents[0].id], ctx.socialWorker.id);

      const response = await ctx.request
        .post(`/api/activities/${activity.id}/cancel`)
        .set(authHeader(ctx.socialWorker.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activity.status).toBe('cancelled');
      expect(response.body.data.revokedTransactions.length).toBe(1);
    });
  });

  describe('Inventory API', () => {
    it('should list inventory items publicly', async () => {
      await createInventoryItem('大米', 100, 50, '5kg装大米', '食品');
      await createInventoryItem('食用油', 150, 30, '5L装食用油', '食品');

      const response = await ctx.request.get('/api/inventory');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });

    it('should create inventory item as director', async () => {
      const response = await ctx.request
        .post('/api/inventory')
        .set(authHeader(ctx.director.token))
        .send({
          name: '电影券',
          description: '双人电影兑换券',
          points_cost: 200,
          stock_quantity: 100,
          category: '娱乐',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.item.name).toBe('电影券');
    });
  });

  describe('Exchange API', () => {
    it('should create exchange order with sufficient points and stock', async () => {
      const item = await createInventoryItem('测试商品', 50, 10, '测试用商品', '测试');

      const response = await ctx.request
        .post('/api/exchanges')
        .set(authHeader(ctx.residents[0].token))
        .send({
          inventory_item_id: item.id,
          quantity: 1,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order.total_points).toBe(50);
    });

    it('should reject exchange with insufficient stock', async () => {
      const item = await createInventoryItem('限量商品', 100, 0, '已售罄', '测试');

      const response = await ctx.request
        .post('/api/exchanges')
        .set(authHeader(ctx.residents[0].token))
        .send({
          inventory_item_id: item.id,
          quantity: 1,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('库存不足');
    });

    it('should review exchange order as social worker', async () => {
      const item = await createInventoryItem('高价商品', 2000, 10, '需要复核的高价商品', '测试');

      const createResponse = await ctx.request
        .post('/api/exchanges')
        .set(authHeader(ctx.residents[0].token))
        .send({
          inventory_item_id: item.id,
          quantity: 1,
        });

      expect(createResponse.body.data.needsReview).toBe(true);
      const orderId = createResponse.body.data.order.id;

      const reviewResponse = await ctx.request
        .post(`/api/exchanges/${orderId}/review`)
        .set(authHeader(ctx.socialWorker.token))
        .send({
          status: 'approved',
          note: '复核通过',
        });

      expect(reviewResponse.status).toBe(200);
      expect(reviewResponse.body.success).toBe(true);
      expect(reviewResponse.body.data.order.status).toBe('completed');
    });

    it('should handle idempotency correctly', async () => {
      const item = await createInventoryItem('幂等测试商品', 80, 20, '测试', '测试');
      const idempotencyKey = 'test-idempotency-key-' + Date.now();

      const firstResponse = await ctx.request
        .post('/api/exchanges')
        .set(authHeader(ctx.residents[1].token))
        .set('x-idempotency-key', idempotencyKey)
        .send({
          inventory_item_id: item.id,
          quantity: 1,
        });

      const secondResponse = await ctx.request
        .post('/api/exchanges')
        .set(authHeader(ctx.residents[1].token))
        .set('x-idempotency-key', idempotencyKey)
        .send({
          inventory_item_id: item.id,
          quantity: 1,
        });

      expect(firstResponse.status).toBe(201);
      expect(secondResponse.status).toBe(200);
      expect(firstResponse.body.data.order.id).toBe(secondResponse.body.data.order.id);
    });
  });

  describe('Points API', () => {
    it('should get my transactions', async () => {
      const response = await ctx.request
        .get('/api/points/me')
        .set(authHeader(ctx.residents[0].token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('should get pending reviews as social worker', async () => {
      const response = await ctx.request
        .get('/api/points/pending-reviews')
        .set(authHeader(ctx.socialWorker.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should get public transaction list with masked phone', async () => {
      const response = await ctx.request.get('/api/points/public');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      if (response.body.data.items.length > 0) {
        const phone = response.body.data.items[0].user_phone;
        expect(phone).toMatch(/^\d{3}\*\*\*\*\d{4}$/);
      }
    });

    it('should manually award points as social worker', async () => {
      const response = await ctx.request
        .post('/api/points/award')
        .set(authHeader(ctx.socialWorker.token))
        .send({
          user_id: ctx.residents[1].id,
          amount: 50,
          description: '手动奖励积分',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Report API', () => {
    it('should get points ranking', async () => {
      const response = await ctx.request
        .get('/api/reports/ranking')
        .set(authHeader(ctx.socialWorker.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.rankings)).toBe(true);
    });

    it('should get user summary', async () => {
      const response = await ctx.request
        .get(`/api/reports/user-summary/${ctx.residents[0].id}`)
        .set(authHeader(ctx.socialWorker.token));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.current_balance).toBeDefined();
    });

    it('should export stock as csv for director', async () => {
      const response = await ctx.request
        .get('/api/reports/export/stock')
        .set(authHeader(ctx.director.token));

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
    });

    it('should reject director-only endpoints for social worker', async () => {
      const response = await ctx.request
        .get('/api/reports/export/stock')
        .set(authHeader(ctx.socialWorker.token));

      expect(response.status).toBe(403);
    });
  });

  describe('Phone Masking in Public Lists', () => {
    it('should mask phone in public exchange list', async () => {
      const response = await ctx.request.get('/api/exchanges/public');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      if (response.body.data.items.length > 0) {
        const phone = response.body.data.items[0].user_phone;
        expect(phone).toMatch(/^\d{3}\*\*\*\*\d{4}$/);
      }
    });
  });
});
