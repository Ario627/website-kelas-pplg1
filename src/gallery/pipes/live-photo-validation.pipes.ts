import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";

@Injectable()
export class LivePhotoValidation implements PipeTransform {
  private readonly imageMaxSize = 10 * 1024 * 1024; // 10MB
  private readonly videoMaxSize = 20 * 1024 * 1024
  private readonly allowedImageMimes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  ];
  private readonly allowedVideoMimes = [
    'video/mp4', //MOV
    'video/quicktime',
  ];

  transform(files: { image?: Express.Multer.File[], video?: Express.Multer.File[] }) {
    console.log('ISI FILES DARI POSTMAN:', files);
    const image = files?.image?.[0];
    const video = files?.video?.[0];

    if (!image) throw new BadRequestException('File gambar (image) wajib diupload untuk Live Photo');

    if (!this.allowedImageMimes.includes(image.mimetype)) {
      throw new BadRequestException(`Format gambar tidak didukung: ${image.mimetype}`);
    }

    if (image.size > this.imageMaxSize) {
      throw new BadRequestException(`Gambar terlalu besar: ${(image.size / 1024 / 1024).toFixed(1)}MB. Max 10MB`);
    }

    if (video) {
      if (!this.allowedVideoMimes.includes(video.mimetype)) {
        throw new BadRequestException(`Format video tidak didukung: ${video.mimetype}. Gunakan .MOV atau .MP4`);
      }

      if (video.size > this.videoMaxSize) {
        throw new BadRequestException(`Video terlalu besar: ${(video.size / 1024 / 1024).toFixed(1)}MB. Max 20MB`);
      }
    }
    return { image, video };
  }
}
