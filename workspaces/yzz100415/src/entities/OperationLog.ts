import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('operation_logs')
export class OperationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  applicationId: string | null;

  @Column({ type: 'uuid', nullable: true })
  operatorId: string | null;

  @Column({ type: 'varchar', nullable: true })
  operatorName: string | null;

  @Column()
  action: string;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @Column({ type: 'varchar', nullable: true })
  ip: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
