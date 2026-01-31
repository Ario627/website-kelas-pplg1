import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GalleryItem, GalleryType } from "./entities/gallery.entities";
import { CreateGalleryItemDtp } from "./dto/gallery.dto";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";

@Injectable()
export class GalleryService {
  private readonly logger = new Logger(GalleryService.name);

  constructor(
    @InjectRepository(Repository)
    private readonly galleryRepository: Repository<GalleryItem>,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async createImage(
    createDto: CreateGalleryItemDtp,
    file: Express.Multer.File,
    uploadedById: number,
  ): Promise<GalleryItem> {
    const uploadResult = await this.cloudinaryService.uploadImage(file, {
      folder: 'gallery',
      maxWidth: 1920,
    });

    const item = this.galleryRepository.create({
      ...createDto,
      type: GalleryType.IMAGE,
      cloudinaryPublicId: uploadResult.publicId,
      imageUrl: uploadResult.secureUrl,
      thumbnailUrl: uploadResult.thumbnailUrl,
      width: uploadResult.width,
      height: uploadResult.height,
      uploadedById,
    }) as Partial<GalleryItem>;

    const saved = await this.galleryRepository.save(item)
    this.logger.log(`Gallery image item created with ID: ${saved.title}`);
    return saved;
  }

  async createVideo(
    createDto: CreateGalleryItemDtp,
    uploadedById: number,
  ): Promise<GalleryItem> {
    const item = this.galleryRepository.create({
      ...createDto,
      type: GalleryType.VIDEO,
      thumbnailUrl: `https://img.youtube.com/vi/${createDto.youtubeVideoId}/hqdefault.jpg`,
      uploadedById,
    })

    const saved = await this.galleryRepository.save(item)
    this.logger.log(`Gallery video item created with ID: ${saved.title}`);
    return saved;
  }

  async findAll(): Promise<GalleryItem[]> {
    return this.galleryRepository.find({
      relations: ['aploadedBy'],
      order: { order: 'ASC', createdAt: 'DESC' },
      select: {
        uploadedBy: {
          id: true,
          name: true,
        }
      }
    });
  }

  async findOne(id: number): Promise<GalleryItem> {
    const item = await this.galleryRepository.findOne({
      where: { id },
      relations: ['uploadedBy'],
    });
    if (!item) {
      throw new NotFoundException(`Gallery item with ID ${id} not found`);
    }
    return item;
  }

  async findByType(type: GalleryType): Promise<GalleryItem[]> {
    return this.galleryRepository.find({
      where: { type },
      relations: ['uploadedBy'],
      order: { order: 'ASC', createdAt: 'DESC' },
    })
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);

    if (item.type === GalleryType.IMAGE && item.cloudinaryPublicId) {
      await this.cloudinaryService.deleteFile(item.cloudinaryPublicId)
    }

    await this.galleryRepository.remove(item);
    this.logger.log(`Gallery item with ID: ${id} has been removed`);
  }
}
