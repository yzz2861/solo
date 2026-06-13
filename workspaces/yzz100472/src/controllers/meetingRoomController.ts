import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const createMeetingRoomSchema = z.object({
  name: z.string().min(1, '会议室名称不能为空'),
  floor: z.string().optional(),
  capacity: z.number().int().min(0).default(0),
  status: z.string().default('ACTIVE'),
});

const updateMeetingRoomSchema = z.object({
  name: z.string().min(1, '会议室名称不能为空').optional(),
  floor: z.string().optional(),
  capacity: z.number().int().min(0).optional(),
  status: z.string().optional(),
});

export const createMeetingRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = createMeetingRoomSchema.parse(req.body);

    const meetingRoom = await prisma.meetingRoom.create({
      data,
    });

    res.status(201).json({
      success: true,
      data: meetingRoom,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const getMeetingRooms = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, keyword } = req.query;

    const where: any = {};

    if (status) {
      where.status = status as string;
    }

    if (keyword) {
      where.name = { contains: keyword as string };
    }

    const meetingRooms = await prisma.meetingRoom.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: meetingRooms,
    });
  } catch (error) {
    next(error);
  }
};

export const getMeetingRoomById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const meetingRoom = await prisma.meetingRoom.findUnique({
      where: { id },
      include: {
        visits: {
          where: {
            status: { in: ['PENDING', 'APPROVED'] },
            endTime: { gt: new Date() },
          },
          orderBy: { startTime: 'asc' },
          take: 10,
        },
      },
    });

    if (!meetingRoom) {
      return next(new AppError('会议室不存在', 404));
    }

    res.json({
      success: true,
      data: meetingRoom,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMeetingRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const data = updateMeetingRoomSchema.parse(req.body);

    const meetingRoom = await prisma.meetingRoom.findUnique({ where: { id } });

    if (!meetingRoom) {
      return next(new AppError('会议室不存在', 404));
    }

    const updatedMeetingRoom = await prisma.meetingRoom.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      data: updatedMeetingRoom,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
};

export const deleteMeetingRoom = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const meetingRoom = await prisma.meetingRoom.findUnique({ where: { id } });

    if (!meetingRoom) {
      return next(new AppError('会议室不存在', 404));
    }

    await prisma.meetingRoom.delete({ where: { id } });

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error) {
    next(error);
  }
};
