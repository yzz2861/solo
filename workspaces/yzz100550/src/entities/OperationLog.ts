import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type OperationType =
  | 'application_create'
  | 'application_approve'
  | 'application_reject'
  | 'application_activate'
  | 'application_expire'
  | 'application_revoke_manual'
  | 'application_revoke_auto'
  | 'application_early_leave'
  | 'tenant_create'
  | 'tenant_update'
  | 'user_create'
  | 'user_update';

@Entity('operation_logs')
export class OperationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'simple-enum',
    enum: [
      'application_create',
      'application_approve',
      'application_reject',
      'application_activate',
      'application_expire',
      'application_revoke_manual',
      'application_revoke_auto',
      'application_early_leave',
      'tenant_create',
      'tenant_update',
      'user_create',
      'user_update',
    ],
  })
  @Index()
  operationType: OperationType;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  targetId: string;

  @Column({ type: 'uuid', nullable: true })
  operatorId: string;

  @Column({ nullable: true })
  operatorName: string;

  @Column({ type: 'text', nullable: true })
  detail: string;

  @Column({ type: 'text', nullable: true })
  beforeData: string;

  @Column({ type: 'text', nullable: true })
  afterData: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
