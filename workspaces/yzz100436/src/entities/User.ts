import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Order } from './Order';
import { Substitution } from './Substitution';
import { Refund } from './Refund';
import { SortingList } from './SortingList';

export type UserRole = 'customer' | 'leader' | 'sorter' | 'finance' | 'supplier';

@Entity()
export class User {
  @PrimaryColumn()
  id: string = uuidv4();

  @Column()
  name: string;

  @Column({ unique: true })
  phone: string;

  @Column({
    type: 'text',
    default: 'customer'
  })
  role: UserRole;

  @Column({ nullable: true })
  communityId?: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Order, order => order.user)
  orders: Order[];

  @OneToMany(() => Substitution, substitution => substitution.confirmedBy)
  confirmedSubstitutions: Substitution[];

  @OneToMany(() => Refund, refund => refund.processedBy)
  processedRefunds: Refund[];

  @OneToMany(() => SortingList, sortingList => sortingList.createdBy)
  createdSortingLists: SortingList[];
}
