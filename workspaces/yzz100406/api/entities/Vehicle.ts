import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('vehicle')
export class Vehicle {
  @PrimaryColumn({ type: 'varchar', length: 20, name: 'plate_number' })
  plateNumber: string;

  @Column({ type: 'varchar', length: 100 })
  model: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  color: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  vin: string;
}
