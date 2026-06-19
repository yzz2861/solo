import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { WifiApplication } from './WifiApplication';

@Entity('visitors')
export class Visitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  @Index()
  phone: string;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  idCard: string;

  @OneToMany(() => WifiApplication, (app) => app.visitor)
  applications: WifiApplication[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
