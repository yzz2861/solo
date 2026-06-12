import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Order } from './Order';
import { OrderItem } from './OrderItem';
import { User } from './User';

export type RefundStatus = 'pending' | 'approved' | 'transferred' | 'completed' | 'cancelled';
export type RefundReason = 'out_of_stock' | 'substitution_diff' | 'quality_issue' | 'customer_cancel' | 'other';

@Entity()
export class Refund {
  @PrimaryColumn()
  id: string = uuidv4();

  @Column({ unique: true })
  @Index()
  idempotencyKey: string;

  @Column()
  orderId: string;

  @Column({ nullable: true })
  orderItemId?: string;

  @Column({ type: 'real' })
  amount: number;

  @Column({
    type: 'text',
    default: 'pending'
  })
  status: RefundStatus;

  @Column({
    type: 'text',
    default: 'out_of_stock'
  })
  reason: RefundReason;

  @Column({ nullable: true })
  processedBy?: string;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @Column({ type: 'text', nullable: true })
  transferMethod?: string;

  @Column({ type: 'text', nullable: true })
  transferTransactionId?: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  transferredAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @ManyToOne(() => Order, order => order.refunds)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => OrderItem, { nullable: true })
  @JoinColumn({ name: 'orderItemId' })
  orderItem?: OrderItem;

  @ManyToOne(() => User, user => user.processedRefunds)
  @JoinColumn({ name: 'processedBy' })
  processedByUser?: User;
}
