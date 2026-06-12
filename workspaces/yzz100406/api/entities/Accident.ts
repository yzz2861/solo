import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AccidentStatus } from '../../shared/types.js';
import { User } from './User.js';
import { Vehicle } from './Vehicle.js';
import { Customer } from './Customer.js';

@Entity('accident')
export class Accident {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 20, name: 'plate_number' })
  plateNumber: string;

  @ManyToOne(() => Vehicle)
  @JoinColumn({ name: 'plate_number' })
  vehicle: Vehicle;

  @Column({ type: 'varchar', length: 36, name: 'customer_id' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'datetime', name: 'accident_time' })
  accidentTime: Date;

  @Column({ type: 'datetime', name: 'return_time', nullable: true })
  returnTime: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  location: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  liability: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'insurance_estimate', nullable: true })
  insuranceEstimate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'assessment_amount', nullable: true })
  assessmentAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'deduction_amount', nullable: true })
  deductionAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'deposit_amount', nullable: true })
  depositAmount: number;

  @Column({ type: 'boolean', name: 'customer_confirmed', default: false })
  customerConfirmed: boolean;

  @Column({ type: 'datetime', name: 'customer_confirm_time', nullable: true })
  customerConfirmTime: Date;

  @Column({ type: 'boolean', name: 'replacement_car', default: false })
  replacementCar: boolean;

  @Column({ type: 'varchar', length: 200, name: 'replacement_car_info', nullable: true })
  replacementCarInfo: string;

  @Column({ type: 'varchar', length: 30, default: AccidentStatus.REGISTERED })
  status: AccidentStatus;

  @Column({ type: 'datetime', name: 'assess_deadline', nullable: true })
  assessDeadline: Date;

  @Column({ type: 'varchar', length: 50, name: 'store_id' })
  storeId: string;

  @Column({ type: 'varchar', length: 36, name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
