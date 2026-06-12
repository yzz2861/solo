import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from './User';
import { Community } from './Community';
import { Cutoff } from './Cutoff';
import { OrderItem } from './OrderItem';
import { Substitution } from './Substitution';
import { Refund } from './Refund';

export type OrderStatus = 'pending' | 'confirmed' | 'cutoff' | 'sorting' | 'delivered' | 'cancelled';

@Entity()
export class Order {
  @PrimaryColumn()
  id: string = uuidv4();

  @Column()
  orderNo: string;

  @Column()
  userId: string;

  @Column()
  communityId: string;

  @Column()
  cutoffId: string;

  @Column({
    type: 'text',
    default: 'pending'
  })
  status: OrderStatus;

  @Column({ type: 'real', default: 0 })
  totalAmount: number;

  @Column({ type: 'real', default: 0 })
  refundAmount: number;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  updatedAt?: Date;

  @ManyToOne(() => User, user => user.orders)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Community, community => community.orders)
  @JoinColumn({ name: 'communityId' })
  community: Community;

  @ManyToOne(() => Cutoff, cutoff => cutoff.orders)
  @JoinColumn({ name: 'cutoffId' })
  cutoff: Cutoff;

  @OneToMany(() => OrderItem, item => item.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => Substitution, substitution => substitution.order)
  substitutions: Substitution[];

  @OneToMany(() => Refund, refund => refund.order)
  refunds: Refund[];
}
