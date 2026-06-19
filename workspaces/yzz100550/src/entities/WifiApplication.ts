import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Visitor } from './Visitor';
import { Tenant } from './Tenant';
import { User } from './User';

export type ApplicationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'expired'
  | 'revoked_manual'
  | 'revoked_auto'
  | 'left_early';

export type VisitReason =
  | 'client_meeting'
  | 'vendor_support'
  | 'interview'
  | 'training'
  | 'audit'
  | 'other';

export type RevokeType = 'manual' | 'auto' | 'early_leave';

@Entity('wifi_applications')
export class WifiApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  visitorId: string;

  @ManyToOne(() => Visitor, (visitor) => visitor.applications, {
    onDelete: 'RESTRICT',
    eager: true,
  })
  @JoinColumn({ name: 'visitorId' })
  visitor: Visitor;

  @Column({ type: 'uuid' })
  @Index()
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.applications, {
    onDelete: 'RESTRICT',
    eager: true,
  })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column({
    type: 'simple-enum',
    enum: [
      'pending',
      'approved',
      'rejected',
      'active',
      'expired',
      'revoked_manual',
      'revoked_auto',
      'left_early',
    ],
    default: 'pending',
  })
  @Index()
  status: ApplicationStatus;

  @Column({
    type: 'simple-enum',
    enum: [
      'client_meeting',
      'vendor_support',
      'interview',
      'training',
      'audit',
      'other',
    ],
  })
  visitReason: VisitReason;

  @Column({ type: 'text', nullable: true })
  visitReasonDetail: string;

  @Column()
  startTime: Date;

  @Column()
  endTime: Date;

  @Column({ nullable: true })
  wifiUsername: string;

  @Column({ nullable: true })
  wifiPassword: string;

  @Column({ nullable: true })
  wifiSsid: string;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string;

  @ManyToOne(() => User, (user) => user.createdApplications, {
    onDelete: 'SET NULL',
    eager: false,
  })
  @JoinColumn({ name: 'createdBy' })
  createdByUser: User;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string;

  @ManyToOne(() => User, (user) => user.reviewedApplications, {
    onDelete: 'SET NULL',
    eager: false,
  })
  @JoinColumn({ name: 'reviewedBy' })
  reviewedByUser: User;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date;

  @Column({ type: 'text', nullable: true })
  rejectReason: string;

  @Column({ type: 'uuid', nullable: true })
  revokedBy: string;

  @Column({ type: 'datetime', nullable: true })
  revokedAt: Date;

  @Column({
    type: 'simple-enum',
    enum: ['manual', 'auto', 'early_leave'],
    nullable: true,
  })
  revokeType: RevokeType;

  @Column({ type: 'text', nullable: true })
  revokeRemark: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
