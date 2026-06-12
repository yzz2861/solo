import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Order } from './Order';
import { OrderItem } from './OrderItem';
import { Product } from './Product';
import { User } from './User';

export type SubstitutionStatus = 'pending' | 'approved' | 'rejected' | 'completed';
export type CustomerResponse = 'pending' | 'accepted' | 'rejected';

@Entity()
export class Substitution {
  @PrimaryColumn()
  id: string = uuidv4();

  @Column()
  orderId: string;

  @Column()
  orderItemId: string;

  @Column()
  originalProductId: string;

  @Column()
  substituteProductId: string;

  @Column({ type: 'real' })
  originalQuantity: number;

  @Column({ type: 'real' })
  substituteQuantity: number;

  @Column({ type: 'real' })
  originalPrice: number;

  @Column({ type: 'real' })
  substitutePrice: number;

  @Column({ type: 'real', default: 0 })
  priceDifference: number;

  @Column({
    type: 'text',
    default: 'pending'
  })
  status: SubstitutionStatus;

  @Column({
    type: 'text',
    default: 'pending'
  })
  customerResponse: CustomerResponse;

  @Column({ nullable: true })
  confirmedBy?: string;

  @Column({ type: 'text', nullable: true })
  leaderRemark?: string;

  @Column({ type: 'text', nullable: true })
  customerRemark?: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  leaderConfirmedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  customerRespondedAt?: Date;

  @ManyToOne(() => Order, order => order.substitutions)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => OrderItem)
  @JoinColumn({ name: 'orderItemId' })
  orderItem: OrderItem;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'originalProductId' })
  originalProduct: Product;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'substituteProductId' })
  substituteProduct: Product;

  @ManyToOne(() => User, user => user.confirmedSubstitutions)
  @JoinColumn({ name: 'confirmedBy' })
  confirmedByUser?: User;
}
