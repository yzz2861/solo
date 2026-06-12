import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { AppDataSource } from '../data-source.js';
import { Photo } from '../entities/Photo.js';
import { User } from '../../shared/types.js';
import { AuditService } from './AuditService.js';

export class PhotoService {
  private photoRepository: Repository<Photo>;
  private auditService: AuditService;
  private uploadDir: string;

  constructor() {
    this.photoRepository = AppDataSource.getRepository(Photo);
    this.auditService = new AuditService();
    this.uploadDir = path.join(process.cwd(), 'uploads', 'photos');
  }

  async uploadPhoto(
    accidentId: string,
    file: Express.Multer.File,
    description: string,
    user: User
  ): Promise<Photo> {
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}-${Date.now()}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);

    await fs.writeFile(filePath, file.buffer);

    const photo = this.photoRepository.create({
      id: uuidv4(),
      accidentId,
      fileName,
      originalName: file.originalname,
      uploaderId: user.id,
      uploaderName: user.name,
      description,
      fileSize: file.size,
      uploadTime: new Date()
    });

    const saved = await this.photoRepository.save(photo);

    await this.auditService.logChange(
      accidentId,
      user,
      'photo_upload',
      '照片上传',
      undefined,
      `${file.originalname} (${(file.size / 1024).toFixed(1)}KB)`
    );

    return saved;
  }

  async getPhotosByAccidentId(accidentId: string): Promise<Photo[]> {
    return await this.photoRepository.find({
      where: { accidentId },
      order: { uploadTime: 'ASC' }
    });
  }

  async getPhotoById(id: string): Promise<Photo | null> {
    return await this.photoRepository.findOne({ where: { id } });
  }

  async getPhotoFilePath(fileName: string): Promise<string> {
    return path.join(this.uploadDir, fileName);
  }

  async deletePhoto(id: string, user: User): Promise<boolean> {
    const photo = await this.photoRepository.findOne({ where: { id } });
    if (!photo) return false;

    const filePath = path.join(this.uploadDir, photo.fileName);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('删除照片文件失败:', error);
    }

    await this.photoRepository.delete(id);

    await this.auditService.logChange(
      photo.accidentId,
      user,
      'photo_delete',
      '照片删除',
      photo.originalName,
      undefined
    );

    return true;
  }
}
