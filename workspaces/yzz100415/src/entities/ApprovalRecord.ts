import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SealApplication } from './SealApplication';
import { User } from './User';

export enum ApprovalAction {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('approval_records')
export class ApprovalRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => SealApplication)
  @JoinColumn({ name: 'applicationId' })
  application: SealApplication;

  @Column({ type: 'uuid' })
  approverId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'approverId' })
  approver: User;

  @Column({
    type: 'simple-enum',
    enum: ApprovalAction,
  })
  action: ApprovalAction;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
