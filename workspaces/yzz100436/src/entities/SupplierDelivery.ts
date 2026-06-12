import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Cutoff } from './Cutoff';
import { Product } from './Product';

export type DeliveryStatus = 'pending' | 'confirmed' | 'partial' | 'completed';

@Entity()
export class SupplierDelivery {
  @PrimaryColumn()
  id: string = uuidv4();

  @Column()
  cutoffId: string;

  @Column()
  productId: string;

  @Column({ type: 'real' })
  expectedQuantity: number;

  @Column({ type: 'real', default: 0 })
  actualQuantity: number;

  @Column({ type: 'real', default: 0 })
  shortageQuantity: number;

  @Column({
    type: 'text',
    default: 'pending'
  })
  status: DeliveryStatus;

  @Column({ type: 'text', nullable: true })
  supplierName?: string;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt?: Date;

  @ManyToOne(() => Cutoff, cutoff => cutoff.deliveries)
  @JoinColumn({ name: 'cutoffId' })
  cutoff: Cutoff;

  @ManyToOne(() => Product, product => product.deliveries)
  @JoinColumn({ name: 'productId' })
  product: Product;
}
