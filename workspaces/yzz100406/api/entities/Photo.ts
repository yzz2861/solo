import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Accident } from './Accident.js';
import { User } from './User.js';

@Entity('photo')
@Index('idx_photo_accident', ['accidentId'])
@Index('idx_photo_time', ['uploadTime'])
export class Photo {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'accident_id' })
  accidentId: string;

  @ManyToOne(() => Accident)
  @JoinColumn({ name: 'accident_id' })
  accident: Accident;

  @Column({ type: 'varchar', length: 100, name: 'file_name' })
  fileName: string;

  @Column({ type: 'varchar', length: 200, name: 'original_name' })
  originalName: string;

  @Column({ type: 'varchar', length: 36, name: 'uploader_id' })
  uploaderId: string;

  @Column({ type: 'varchar', length: 50, name: 'uploader_name' })
  uploaderName: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploader_id' })
  uploader: User;

  @CreateDateColumn({ name: 'upload_time' })
  uploadTime: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  @Column({ type: 'integer', name: 'file_size' })
  fileSize: number;
}
