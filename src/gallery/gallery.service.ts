import { Injectable, NotAcceptableException, Logger, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { GalleryItem, GalleryType } from "./entities/gallery.entities";
import { CreateImageDto } from "./dto/create-image.dto";
import { CreateVideoDto } from "./dto/create-video.dto";
import { UpdateGalleryDto } from "./dto/update-gallery.dto";
import { ReorderGalleryDto } from "./dto/reorder-gallery.dto";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";

@Injectable()
export class GalleryService {
  private readonly logger = new Logger(GalleryService.name);

  constructor(
    @InjectRepository(GalleryItem)
    private readonly galleryRepository: Repository<GalleryItem>,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  async createImage(dto: CreateImageDto, file: Express.Multer.File, uploadedById: number): Promise<GalleryItem> {
    const uploadResult = await this.cloudinaryService.uploadImage(file, {
      folder: 'gallery',
      maxWidth: 1920,
    });

    const item = this.galleryRepository.create({
      ...dto,
      type: GalleryType.IMAGE,
      cloudinaryPublicId: uploadResult.publicId,
      imageUrl: uploadResult.secureUrl,
      thumbnailUrl: uploadResult.thumbnailUrl,
      width: uploadResult.width,
      height: uploadResult.height,
      fileSize: uploadResult.bytes,
      format: uploadResult.format,
      tags: dto.tags ?? [],
      isPublished: dto.isPublished ?? true,
      uploadedById,
    });

    const save = await this.galleryRepository.save(item);
    this.logger.log(`Created image gallery item with ID ${save.id} by user ${uploadedById}`);
    return save;
  }

  async createVideo(dto: CreateVideoDto, uploadedById: number): Promise<GalleryItem> {
    const thumbnailUrl = `https://img.youtube.com/vi/${dto.youtubeVideoId}/maxresdefault.jpg`;

    const item = this.galleryRepository.create({
      ...dto,
      type: GalleryType.VIDEO,
      thumbnailUrl,
      tags: dto.tags ?? [],
      isPublished: dto.isPublished ?? true,
      uploadedById,
    });

    const save = await this.galleryRepository.save(item);
    this.logger.log(`Created video gallery item with ID ${save.id} by user ${uploadedById}`);
    return save;
  }

  async update(id: number, dto: UpdateGalleryDto): Promise<GalleryItem> {
    const item = await this.findOrFail(id);

    Object.assign(item, dto);

    const saved = await this.galleryRepository.save(item);
    this.logger.log(`Updated gallery item with ID {id}`);
    return saved;
  }

  async reorder(dto: ReorderGalleryDto): Promise<{ updated: number }> {
    const id = dto.items.map((i) => i.id);
    const items = await this.galleryRepository.find({ where: { id: In(id) } });

    if (items.length !== dto.items.length) {
      const found = items.map((i) => i.id);
      const missing = id.filter((id) => !found.includes(id));
      throw new BadRequestException(`Gallery items with IDs ${missing.join(', ')} not found`);
    }

    for (const item of items) {
      const newOrder = dto.items.find((i) => i.id === item.id);
      if (newOrder) item.order = newOrder.order;
    }

    await this.galleryRepository.save(items);
    this.logger.log(`Reordered ${items.length} gallery items`);
    return { updated: items.length };
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOrFail(id);

    if (item.type === GalleryType.IMAGE && item.cloudinaryPublicId) {
      const deleted = await this.cloudinaryService.deleteFile(item.cloudinaryPublicId, 'image');
      if (!deleted) {
        this.logger.warn(`Failed to delete Cloudinary image with public ID ${item.cloudinaryPublicId} for gallery item ID ${id}`);
      }
    }

    await this.galleryRepository.remove(item);
    this.logger.log(`Deleted gallery item with ID ${id}`);
  }

  async findAllPublished(query?: {
    type?: GalleryType;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: GalleryItem[]; total: number; page: number; totalPages: number }> {
    const page = query?.page ?? 1;
    const limit = Math.min(query?.limit ?? 20, 50); // Max 50 per page
    const skip = (page - 1) * limit;

    const qb = this.galleryRepository.createQueryBuilder('g')
      .leftJoin('g.uploadedBy', 'uploader')
      .addSelect(['uploader.id', 'uploader.name'])
      .where('g.isPublished = :published', { published: true });

    if (query?.type) {
      qb.andWhere('g.type = :type', { type: query.type });
    }

    if (query?.category) {
      qb.andWhere('g.category = :category', { category: query.category });
    }

    qb.orderBy('g.order', 'ASC')
      .addOrderBy('g.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAllAdmin(): Promise<GalleryItem[]> {
    return this.galleryRepository.find({
      relations: ['uploadedBy'],
      order: { order: 'ASC', createdAt: 'DESC' },
      select: {
        uploadedBy: { id: true, name: true },
      },
    });
  }

  async findOne(id: number): Promise<GalleryItem> {
    return this.findOrFail(id);
  }

  async findByType(type: GalleryType): Promise<GalleryItem[]> {
    return this.galleryRepository.find({
      where: { type, isPublished: true },
      relations: ['uploadedBy'],
      order: { order: 'ASC', createdAt: 'DESC' },
      select: {
        uploadedBy: { id: true, name: true },
      },
    });
  }

  async getCategories(): Promise<{ category: string; count: number }[]> {
    const result = await this.galleryRepository
      .createQueryBuilder('g')
      .select('g.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('g.isPublished = true')
      .andWhere('g.category IS NOT NULL')
      .groupBy('g.category')
      .orderBy('count', 'DESC')
      .getRawMany();

    return result.map((r) => ({
      category: r.category,
      count: parseInt(r.count, 10),
    }));
  }


  private async findOrFail(id: number): Promise<GalleryItem> {
    const item = await this.galleryRepository.findOne({
      where: { id },
      relations: ['uploadedBy'],
      select: {
        uploadedBy: { id: true, name: true },
      },
    });

    if (!item) {
      throw new NotAcceptableException(`Gallery item with ID ${id} not found`);
    }

    return item;
  }
}

