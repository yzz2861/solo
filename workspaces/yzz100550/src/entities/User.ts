import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WifiApplication } from './WifiApplication';

export type UserRole = 'reception' | 'tenant_admin' | 'admin' | 'night_shift';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  name: string;

  @Column({
    type: 'simple-enum',
    enum: ['reception', 'tenant_admin', 'admin', 'night_shift'],
  })
  role: UserRole;

  @Column({ nullable: true })
  tenantId: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => WifiApplication, (app) => app.createdByUser)
  createdApplications: WifiApplication[];

  @OneToMany(() => WifiApplication, (app) => app.reviewedByUser)
  reviewedApplications: WifiApplication[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
