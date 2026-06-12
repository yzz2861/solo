import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Accident } from './Accident.js';
import { User } from './User.js';

@Entity('audit_log')
@Index('idx_audit_accident', ['accidentId'])
@Index('idx_audit_time', ['timestamp'])
export class AuditLog {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'accident_id' })
  accidentId: string;

  @ManyToOne(() => Accident)
  @JoinColumn({ name: 'accident_id' })
  accident: Accident;

  @Column({ type: 'varchar', length: 36, name: 'operator_id' })
  operatorId: string;

  @Column({ type: 'varchar', length: 50, name: 'operator_name' })
  operatorName: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @Column({ type: 'varchar', length: 50 })
  operation: string;

  @Column({ type: 'varchar', length: 50, name: 'field_name', nullable: true })
  fieldName: string;

  @Column({ type: 'text', name: 'old_value', nullable: true })
  oldValue: string;

  @Column({ type: 'text', name: 'new_value', nullable: true })
  newValue: string;

  @CreateDateColumn()
  timestamp: Date;
}
