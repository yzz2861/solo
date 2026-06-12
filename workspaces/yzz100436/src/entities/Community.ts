import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DeliveryRoute } from './DeliveryRoute';
import { Order } from './Order';
import { SortingBag } from './SortingBag';

@Entity()
export class Community {
  @PrimaryColumn()
  id: string = uuidv4();

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ nullable: true })
  shelfLocation?: string;

  @Column({ nullable: true })
  routeId?: string;

  @ManyToOne(() => DeliveryRoute, route => route.communities)
  @JoinColumn({ name: 'routeId' })
  route?: DeliveryRoute;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Order, order => order.community)
  orders: Order[];

  @OneToMany(() => SortingBag, bag => bag.community)
  sortingBags: SortingBag[];
}
