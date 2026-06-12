import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

export enum BorrowType {
  USE_IN_OFFICE = 'USE_IN_OFFICE',
  TAKE_OUT = 'TAKE_OUT',
}

export enum MaterialType {
  CONTRACT = 'CONTRACT',
  CERTIFICATE = 'CERTIFICATE',
  AGREEMENT = 'AGREEMENT',
  LETTER = 'LETTER',
  OTHER = 'OTHER',
}

export enum ApplicationStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PICKED_UP = 'PICKED_UP',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  TRACKING = 'TRACKING',
}

@Entity('seal_applications')
export class SealApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'simple-enum',
    enum: BorrowType,
  })
  borrowType: BorrowType;

  @Column({
    type: 'simple-enum',
    enum: MaterialType,
  })
  materialType: MaterialType;

  @Column()
  materialName: string;

  @Column({ type: 'int', nullable: true })
  materialPages: number | null;

  @Column({ type: 'real', nullable: true })
  materialAmount: number | null;

  @Column({ type: 'text', nullable: true })
  materialDescription: string | null;

  @Column({ type: 'datetime', nullable: true })
  expectedReturnDate: Date | null;

  @Column({
    type: 'simple-enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING_APPROVAL,
  })
  status: ApplicationStatus;

  @Column({ type: 'uuid' })
  applicantId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'applicantId' })
  applicant: User;

  @Column({ type: 'uuid' })
  approverId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'approverId' })
  approver: User;

  @Column({ type: 'uuid', nullable: true })
  handlerId: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'handlerId' })
  handler: User | null;

  @Column({ type: 'text', nullable: true })
  rejectReason: string | null;

  @Column({ type: 'datetime', nullable: true })
  approvalTime: Date | null;

  @Column({ type: 'datetime', nullable: true })
  pickedUpTime: Date | null;

  @Column({ type: 'uuid', nullable: true })
  pickedUpByAdminId: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'pickedUpByAdminId' })
  pickedUpByAdmin: User | null;

  @Column({ type: 'datetime', nullable: true })
  returnedTime: Date | null;

  @Column({ type: 'int', nullable: true })
  returnedPages: number | null;

  @Column({ type: 'uuid', nullable: true })
  returnedByAdminId: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true })
  @JoinColumn({ name: 'returnedByAdminId' })
  returnedByAdmin: User | null;

  @Column({ default: false })
  isOverdue: boolean;

  @Column({ type: 'text', nullable: true })
  trackingNote: string | null;

  @Column({ type: 'datetime', nullable: true })
  trackingStartAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
