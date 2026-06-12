import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Order } from './Order';
import { Product } from './Product';

export type OrderItemStatus = 'normal' | 'out_of_stock' | 'substituted' | 'refunded';

@Entity()
export class OrderItem {
  @PrimaryColumn()
  id: string = uuidv4();

  @Column()
  orderId: string;

  @Column()
  productId: string;

  @Column({ type: 'real' })
  quantity: number;

  @Column({ type: 'real' })
  price: number;

  @Column({ type: 'real' })
  amount: number;

  @Column({
    type: 'text',
    default: 'normal'
  })
  status: OrderItemStatus;

  @Column({ type: 'real', nullable: true })
  actualQuantity?: number;

  @Column({ type: 'real', nullable: true })
  substitutedProductId?: string;

  @Column({ type: 'real', nullable: true })
  substitutedQuantity?: number;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Order, order => order.items)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => Product, product => product.orderItems)
  @JoinColumn({ name: 'productId' })
  product: Product;
}
