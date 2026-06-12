import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SortingList } from './SortingList';
import { Community } from './Community';

export type SortingBagStatus = 'pending' | 'packed' | 'delivered';

interface BagItem {
  orderItemId: string;
  orderId: string;
  orderNo: string;
  userId: string;
  userName: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  isSubstituted: boolean;
  originalProductName?: string;
}

@Entity()
export class SortingBag {
  @PrimaryColumn()
  id: string = uuidv4();

  @Column()
  sortingListId: string;

  @Column()
  communityId: string;

  @Column()
  bagLabel: string;

  @Column({ type: 'text', nullable: true })
  shelfLocation?: string;

  @Column({
    type: 'text',
    default: 'pending'
  })
  status: SortingBagStatus;

  @Column({ type: 'text' })
  itemsJson: string;

  @Column({ type: 'integer', default: 0 })
  itemCount: number;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  packedAt?: Date;

  @ManyToOne(() => SortingList, list => list.bags)
  @JoinColumn({ name: 'sortingListId' })
  sortingList: SortingList;

  @ManyToOne(() => Community, community => community.sortingBags)
  @JoinColumn({ name: 'communityId' })
  community: Community;

  get items(): BagItem[] {
    return JSON.parse(this.itemsJson || '[]');
  }

  set items(value: BagItem[]) {
    this.itemsJson = JSON.stringify(value);
    this.itemCount = value.length;
  }
}
