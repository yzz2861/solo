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

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => SealApplication)
  @JoinColumn({ name: 'applicationId' })
  application: SealApplication;

  @Column({ type: 'uuid' })
  uploaderId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'uploaderId' })
  uploader: User;

  @Column()
  fileName: string;

  @Column()
  filePath: string;

  @Column({ type: 'integer', nullable: true })
  fileSize: number | null;

  @Column({ type: 'text', nullable: true })
  remark: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
