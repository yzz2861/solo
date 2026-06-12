import { Entity, PrimaryColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Cutoff } from './Cutoff';
import { DeliveryRoute } from './DeliveryRoute';
import { User } from './User';
import { SortingBag } from './SortingBag';

export type SortingListStatus = 'pending' | 'in_progress' | 'completed';

@Entity()
export class SortingList {
  @PrimaryColumn()
  id: string = uuidv4();

  @Column()
  name: string;

  @Column()
  cutoffId: string;

  @Column({ nullable: true })
  routeId?: string;

  @Column({ nullable: true })
  createdBy?: string;

  @Column({
    type: 'text',
    default: 'pending'
  })
  status: SortingListStatus;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @ManyToOne(() => Cutoff, cutoff => cutoff.sortingLists)
  @JoinColumn({ name: 'cutoffId' })
  cutoff: Cutoff;

  @ManyToOne(() => DeliveryRoute, route => route.sortingLists, { nullable: true })
  @JoinColumn({ name: 'routeId' })
  route?: DeliveryRoute;

  @ManyToOne(() => User, user => user.createdSortingLists)
  @JoinColumn({ name: 'createdBy' })
  createdByUser?: User;

  @OneToMany(() => SortingBag, bag => bag.sortingList, { cascade: true })
  bags: SortingBag[];
}
