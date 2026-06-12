import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Community } from './Community';
import { SortingList } from './SortingList';

@Entity()
export class DeliveryRoute {
  @PrimaryColumn()
  id: string = uuidv4();

  @Column()
  name: string;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Community, community => community.route)
  communities: Community[];

  @OneToMany(() => SortingList, sortingList => sortingList.route)
  sortingLists: SortingList[];
}
