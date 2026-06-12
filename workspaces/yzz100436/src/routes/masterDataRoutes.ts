import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getRepository } from '../config/database';
import { User } from '../entities/User';
import { Product } from '../entities/Product';
import { Community } from '../entities/Community';
import { DeliveryRoute } from '../entities/DeliveryRoute';
import { ApiResponse } from '../types/api';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.post('/users', asyncHandler(async (req: Request, res: Response) => {
  const userRepo = getRepository(User);
  const user = new User();
  Object.assign(user, req.body);
  user.id = uuidv4();
  await userRepo.save(user);
  const response: ApiResponse = {
    success: true,
    data: user,
    message: '用户创建成功'
  };
  res.json(response);
}));

router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  const userRepo = getRepository(User);
  const role = req.query.role as string;
  const where = role ? { role: role as any } : {};
  const users = await userRepo.find({ where });
  const response: ApiResponse = {
    success: true,
    data: users
  };
  res.json(response);
}));

router.post('/products', asyncHandler(async (req: Request, res: Response) => {
  const productRepo = getRepository(Product);
  const product = new Product();
  Object.assign(product, req.body);
  product.id = uuidv4();
  await productRepo.save(product);
  const response: ApiResponse = {
    success: true,
    data: product,
    message: '商品创建成功'
  };
  res.json(response);
}));

router.get('/products', asyncHandler(async (req: Request, res: Response) => {
  const productRepo = getRepository(Product);
  const status = req.query.status as string;
  const where = status ? { status: status as any } : {};
  const products = await productRepo.find({ where });
  const response: ApiResponse = {
    success: true,
    data: products
  };
  res.json(response);
}));

router.post('/communities', asyncHandler(async (req: Request, res: Response) => {
  const communityRepo = getRepository(Community);
  const community = new Community();
  Object.assign(community, req.body);
  community.id = uuidv4();
  await communityRepo.save(community);
  const response: ApiResponse = {
    success: true,
    data: community,
    message: '小区创建成功'
  };
  res.json(response);
}));

router.get('/communities', asyncHandler(async (req: Request, res: Response) => {
  const communityRepo = getRepository(Community);
  const communities = await communityRepo.find({ relations: ['route'] });
  const response: ApiResponse = {
    success: true,
    data: communities
  };
  res.json(response);
}));

router.post('/routes', asyncHandler(async (req: Request, res: Response) => {
  const routeRepo = getRepository(DeliveryRoute);
  const route = new DeliveryRoute();
  Object.assign(route, req.body);
  route.id = uuidv4();
  await routeRepo.save(route);
  const response: ApiResponse = {
    success: true,
    data: route,
    message: '配送线路创建成功'
  };
  res.json(response);
}));

router.get('/routes', asyncHandler(async (req: Request, res: Response) => {
  const routeRepo = getRepository(DeliveryRoute);
  const routes = await routeRepo.find({
    relations: ['communities'],
    order: { sortOrder: 'ASC' }
  });
  const response: ApiResponse = {
    success: true,
    data: routes
  };
  res.json(response);
}));

export { router as masterDataRoutes };
