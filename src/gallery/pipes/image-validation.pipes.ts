import { PipeTransform, Injectable, BadRequestException, ArgumentMetadata } from "@nestjs/common";

@Injectable()
export class ImageValidation implements PipeTransform {
  private readonly maxSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
  ];

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!this.allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Format file tidak didukung: ${file.mimetype}. ` +
        `Format yang dibolehkan: ${this.allowedMimes.join(', ')}`,
      );
    }

    if (file.size > this.maxSize) {
      const maxMb = this.maxSize / (1024 * 1024);
      const fileMb = (file.size / (1024 * 1024)).toFixed(2);
      throw new BadRequestException(
        `Ukuran file terlalu besar: ${fileMb} MB. ` +
        `Maksimal ukuran file adalah ${maxMb} MB.`,
      );
    }

    return file
  }
}
