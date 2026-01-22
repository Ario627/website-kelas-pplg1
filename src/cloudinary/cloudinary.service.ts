import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from "cloudinary";
import * as streamifier from 'streamifier';

export interface CloudinaryUploudResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  thumbnailUrl: string;
}

export interface UploudOptions {
  folder?: string;
  maxWidth?: number;
  quality?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly defaultFolder: string;
  private readonly maxWidth: number;

  constructor(private readonly configService: ConfigService) {
    this.defaultFolder = configService.get<string>('CLOUDINARY_DEFAULT_FOLDER', 'class-website');
    this.maxWidth = configService.get<number>('CLOUDINARY_MAX_WIDTH', 1920);
  }

  async uploadImage(
    file: Express.Multer.File,
    options?: UploudOptions,
  ): Promise<CloudinaryUploudResult> {
    const folder = options?.folder || this.defaultFolder;
    const maxWidth = options?.maxWidth || this.maxWidth;

    return new Promise((resolve, reject) => {
      const uploudStream = cloudinary.uploader.upload_stream(
        {
          folder: `${this.defaultFolder}/${folder}`,
          resource_type: options?.resourceType || 'image',
          transformation: [
            {
              width: maxWidth,
              crop: 'limit',
              quality: 'auto:good',
              fetcch_format: 'auto',
            },
          ],

          eager: [
            { width: 400, height: 400, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
            { width: 200, height: 200, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
          ],
          eager_async: true,
        },
        (error: UploadApiErrorResponse, result: UploadApiResponse) => {
          if (error) {
            this.logger.log(`Cloudinary upload error: ${error.message}`);
            reject(new BadRequestException(`Cloudinary upload error: ${error.message}`));
            return;
          }

          if (!result) {
            reject(new BadRequestException('Cloudinary upload failed: No result returned'));
            return;
          }

          this.logger.log(`Cloudinary upload success: ${result.public_id}`);

          resolve({
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
            thumbnailUrl: this.generateThumbnailUrl(result.public_id, 400),
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploudStream);
    });
  }


  async uploudFile(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<CloudinaryUploudResult> {
    const targetFolder = folder || 'files';

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `${this.defaultFolder}/${targetFolder}`,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            reject(new BadRequestException(`Cloudinary upload error: ${error.message}`));
            return;
          }

          if (!result) {
            reject(new BadRequestException('Cloudinary upload failed: No result returned'));
            return;
          }

          resolve({
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            width: 0,
            height: 0,
            format: result.format || '',
            bytes: result.bytes,
            thumbnailUrl: '',
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto'): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      this.logger.log(`Cloudinary delete result for ${publicId}: ${result.result}`);
      return result.result === 'ok' || result.result === 'not found';
    } catch (error) {
      this.logger.error(`Cloudinary delete error for ${publicId}: ${error.message}`);
      return false;
    }
  }



  generateThumbnailUrl(publicId: string, size: number = 400): string {
    return cloudinary.url(publicId, {
      secure: true,
      transformation: [
        {
          width: size,
          height: size,
          crop: 'fill',
          quality: 'auto',
          fetch_format: 'auto',
        }
      ]
    })
  }
}
