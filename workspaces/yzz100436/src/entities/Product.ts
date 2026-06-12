import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrderItem } from './OrderItem';
import { SupplierDelivery } from './SupplierDelivery';

@Entity()
export class Product {
  @PrimaryColumn()
  id: string = uuidv4();

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'real' })
  price: number;

  @Column({ type: 'text' })
  unit: string;

  @Column({ type: 'text', nullable: true })
  category?: string;

  @Column({ type: 'text', default: 'active' })
  status: 'active' | 'inactive';

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => OrderItem, orderItem => orderItem.product)
  orderItems: OrderItem[];

  @OneToMany(() => SupplierDelivery, delivery => delivery.product)
  deliveries: SupplierDelivery[];
}
