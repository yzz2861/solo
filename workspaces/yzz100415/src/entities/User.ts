import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  APPROVER = 'APPROVER',
  ADMIN = 'ADMIN',
  LEGAL = 'LEGAL',
  GUARD = 'GUARD',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  department: string | null;

  @Column({
    type: 'simple-enum',
    enum: UserRole,
    default: UserRole.EMPLOYEE,
  })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
