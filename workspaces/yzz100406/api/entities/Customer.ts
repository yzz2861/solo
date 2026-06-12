import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('customer')
export class Customer {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 30, name: 'id_card', nullable: true })
  idCard: string;
}
