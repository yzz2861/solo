import Joi from 'joi';
import { PickupMethod, AuthorizedType, MailStatus, StaffRole } from '../types';

export const createAuthorizationSchema = Joi.object({
  batch_no: Joi.string().required().messages({
    'any.required': '报告批次号不能为空'
  }),
  pickup_method: Joi.string().valid(PickupMethod.SELF, PickupMethod.AUTHORIZED, PickupMethod.MAIL).required().messages({
    'any.required': '领取方式不能为空',
    'any.only': '领取方式必须是 self、authorized 或 mail'
  }),
  authorized_type: Joi.string().valid(AuthorizedType.FAMILY, AuthorizedType.COMPANY).when('pickup_method', {
    is: PickupMethod.AUTHORIZED,
    then: Joi.required()
  }),
  authorized_person_name: Joi.string().when('pickup_method', {
    is: PickupMethod.AUTHORIZED,
    then: Joi.required()
  }),
  authorized_person_id_card: Joi.string().length(18).when('pickup_method', {
    is: PickupMethod.AUTHORIZED,
    then: Joi.required()
  }),
  authorized_person_phone: Joi.string().pattern(/^1[3-9]\d{9}$/),
  authorization_material: Joi.string(),
  created_by: Joi.number().integer().positive().required()
});

export const revokeAuthorizationSchema = Joi.object({
  authorization_id: Joi.number().integer().positive().required(),
  reason: Joi.string().min(2).required(),
  revoked_by: Joi.number().integer().positive().required()
});

export const pickupSchema = Joi.object({
  batch_no: Joi.string().required(),
  pickup_method: Joi.string().valid(PickupMethod.SELF, PickupMethod.AUTHORIZED).required(),
  pickup_person_name: Joi.string().required(),
  pickup_person_id_card: Joi.string().length(18).required(),
  authorization_id: Joi.number().integer().positive(),
  picked_up_by: Joi.number().integer().positive().required()
});

export const createMailSchema = Joi.object({
  batch_no: Joi.string().required(),
  receiver_name: Joi.string().required(),
  receiver_phone: Joi.string().pattern(/^1[3-9]\d{9}$/).required(),
  receiver_address: Joi.string().min(5).required(),
  courier_company: Joi.string().required(),
  tracking_no: Joi.string().required(),
  mailed_by: Joi.number().integer().positive().required()
});

export const updateMailStatusSchema = Joi.object({
  status: Joi.string().valid(MailStatus.PENDING, MailStatus.SHIPPED, MailStatus.DELIVERED, MailStatus.RETURNED).required(),
  delivered_at: Joi.string().when('status', {
    is: MailStatus.DELIVERED,
    then: Joi.required()
  })
});

export const logExceptionSchema = Joi.object({
  batch_no: Joi.string(),
  report_batch_id: Joi.number().integer().positive(),
  attempt_person_name: Joi.string().required(),
  attempt_person_id_card: Joi.string().length(18).required(),
  attempt_type: Joi.string().required(),
  intercepted_by: Joi.number().integer().positive().required(),
  reason: Joi.string().min(2).required()
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  page_size: Joi.number().integer().min(1).max(100).default(20)
});

export const dateRangeSchema = Joi.object({
  start_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  end_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)
});

export const staffRoleSchema = Joi.object({
  staff_id: Joi.number().integer().positive().required(),
  role: Joi.string().valid(StaffRole.RECEPTIONIST, StaffRole.CUSTOMER_SERVICE, StaffRole.SUPERVISOR).required()
});
