import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Order } from './Order';
import { SupplierDelivery } from './SupplierDelivery';
import { SortingList } from './SortingList';

export type CutoffStatus = 'active' | 'closed' | 'delivering' | 'completed';

@Entity()
export class Cutoff {
  @PrimaryColumn()
  id: string = uuidv4();

  @Column()
  name: string;

  @Column({ type: 'datetime' })
  cutoffTime: Date;

  @Column({ type: 'datetime', nullable: true })
  actualCutoffTime?: Date;

  @Column({
    type: 'text',
    default: 'active'
  })
  status: CutoffStatus;

  @Column({ type: 'text', nullable: true })
  createdBy?: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Order, order => order.cutoff)
  orders: Order[];

  @OneToMany(() => SupplierDelivery, delivery => delivery.cutoff)
  deliveries: SupplierDelivery[];

  @OneToMany(() => SortingList, sortingList => sortingList.cutoff)
  sortingLists: SortingList[];
}
