import { Injectable, NotAcceptableException, Logger, NotFoundException, BadRequestException, ForbiddenException, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, MoreThan, LessThan } from "typeorm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { GalleryItem, GalleryType } from "./entities/gallery.entities";
import { GalleryView } from "./entities/gallery-view.entities";
import { GalleryAlbum } from "./entities/gallery-album.entities";
import { CreateImageDto } from "./dto/create-image.dto";
import { CreateVideoDto } from "./dto/create-video.dto";
import { CreateLivePhotoDto } from "./dto/create-live-photo.dto";
import { CreateAlbumDto } from "./dto/create-album.dto";
import { UpdateAlbumDto } from "./dto/update-album.dto";
import { UpdateGalleryDto } from "./dto/update-gallery.dto";
import { ReorderGalleryDto } from "./dto/reorder-gallery.dto";
import { CloudinaryService, type CloudinaryUploadResult, type ResponsiveUrls } from "src/cloudinary/cloudinary.service";
import type { ResolvedIdentity } from "src/common/identity/identity";


export interface GalleryItemResponse extends GalleryItem {
  responsive?: ResponsiveUrls;
  liveVideoMp4Url?: string | null;
}

export interface CursorPaginatedResult<T> {
  data: T[];
  meta: {
    hasMore: boolean;
    nextCursor: number | null;
    total: number;
  };
}

@Injectable()
export class GalleryService {
  private readonly logger = new Logger(GalleryService.name);

  constructor(
    @InjectRepository(GalleryItem)
    private readonly galleryRepository: Repository<GalleryItem>,
    @InjectRepository(GalleryView)
    private readonly viewRepository: Repository<GalleryView>,
    @InjectRepository(GalleryAlbum)
    private readonly albumRepo: Repository<GalleryAlbum>,
    private readonly cloudinaryService: CloudinaryService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
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

  async createLivePhoto(dto: CreateLivePhotoDto, imageFile: Express.Multer.File, videoFile: Express.Multer.File | undefined, uploadedById: number): Promise<GalleryItemResponse> {
    const imageResult = await this.cloudinaryService.uploadImage(imageFile, {
      folder: 'gallery/live-photos',
      maxWidth: 1920,
    });

    let videoResult: CloudinaryUploadResult | null = null;
    if (videoFile) {
      videoResult = await this.cloudinaryService.uploadLivePhotoVideo(videoFile, 'gallery/live-photos');
    }

    const item = this.galleryRepository.create({
      ...dto,
      type: GalleryType.LIVE_PHOTO,
      isLivePhoto: true,
      cloudinaryPublicId: imageResult.publicId,
      imageUrl: imageResult.secureUrl,
      thumbnailUrl: imageResult.thumbnailUrl,
      width: imageResult.width,
      height: imageResult.height,
      fileSize: imageResult.bytes + (videoResult?.bytes ?? 0),
      format: imageResult.format,
      liveVideoPublicId: videoResult?.publicId ?? null,
      liveVideoUrl: videoResult?.secureUrl ?? null,
      tags: dto.tags ?? [],
      isPublished: dto.isPublished ?? true,
      uploadedById
    });

    const saved = await this.galleryRepository.save(item);
    await this.invalidateGalleryCache();
    this.logger.log(`Created live photo gallery item with ID ${saved.id} by user ${uploadedById}`);
    return this.enrichWithResponsiveUrls(saved);
  }


  async update(id: number, dto: UpdateGalleryDto): Promise<GalleryItem> {
    const item = await this.findOrFail(id);

    Object.assign(item, dto);

    const saved = await this.galleryRepository.save(item);
    await this.invalidateGalleryCache();
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
    await this.invalidateGalleryCache()
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
    await this.invalidateGalleryCache()
    this.logger.log(`Deleted gallery item with ID ${id}`);
  }

  async findAllPublished(query?: {
    type?: GalleryType;
    category?: string;
    cursor?: number;
    limit?: number;
  }): Promise<CursorPaginatedResult<GalleryItemResponse>> {
    const limit = Math.min(query?.limit ?? 20, 50);

    // Cache key berdasarkan query params
    const cacheKey = `gallery:list:${query?.type ?? 'all'}:${query?.category ?? 'all'}:${query?.cursor ?? 0}:${limit}`;
    const cached = await this.cache.get<CursorPaginatedResult<GalleryItemResponse>>(cacheKey);
    if (cached) return cached;

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

    // Cursor-based: ambil items setelah cursor ID
    if (query?.cursor) {
      qb.andWhere('g.id < :cursor', { cursor: query.cursor });
    }

    qb.orderBy('g.order', 'ASC')
      .addOrderBy('g.id', 'DESC')
      .take(limit + 1); // +1 buat check hasMore

    const items = await qb.getMany();
    const hasMore = items.length > limit;
    if (hasMore) items.pop(); // Buang item ke-limit+1

    const total = await this.galleryRepository.count({ where: { isPublished: true } });

    const result: CursorPaginatedResult<GalleryItemResponse> = {
      data: items.map((item) => this.enrichWithResponsiveUrls(item)),
      meta: {
        hasMore,
        nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
        total,
      },
    };

    // Cache 5 menit
    await this.cache.set(cacheKey, result, 300_000);
    return result;
  }

  async findAllAdmin(): Promise<GalleryItemResponse[]> {
    const items = await this.galleryRepository.find({
      relations: ['uploadedBy'],
      order: { order: 'ASC', createdAt: 'DESC' },
      select: {
        uploadedBy: { id: true, name: true },
      },
    });

    return items.map((item) => this.enrichWithResponsiveUrls(item));
  }

  async findOne(id: number): Promise<GalleryItem> {
    const cacheKey = `gallery:item:${id}`;
    const cached = await this.cache.get<GalleryItemResponse>(cacheKey);
    if (cached) return cached;

    const item = await this.findOrFail(id);
    const enriched = this.enrichWithResponsiveUrls(item);

    await this.cache.set(cacheKey, enriched, 300_000); // Cache 5 menit
    return enriched;
  }

  async findByType(type: GalleryType, cursor?: number, limit: number = 20): Promise<CursorPaginatedResult<GalleryItemResponse>> {
    return this.findAllPublished({ type, cursor, limit });
  }

  async getCategoried(): Promise<{ category: string; count: number }[]> {
    const cacheKey = `gallery:categories`;
    const cached = await this.cache.get<{ category: string; count: number }[]>(cacheKey);
    if (cached) return cached;

    const result = await this.galleryRepository
      .createQueryBuilder('g')
      .select('g.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('g.isPublished = true')
      .andWhere('g.category IS NOT NULL')
      .groupBy('g.category')
      .orderBy('count', 'DESC')
      .getRawMany();

    const mapped = result.map((r) => ({
      category: r.category,
      count: parseInt(r.count, 10),
    }));

    await this.cache.set(cacheKey, mapped, 300_000);
    return mapped;
  }

  //  Album 

  async createAlbum(dto: CreateAlbumDto, createById: number): Promise<GalleryAlbum> {
    const album = this.albumRepo.create({
      title: dto.title,
      description: dto.description,
      isPublished: dto.isPublished ?? true,
      order: dto.order ?? 0,
      createById,
    });

    const saved = await this.albumRepo.save(album);

    if (dto.itemIds?.length) {
      await this.addItemsToAlbum(saved.id, dto.itemIds);
    }

    await this.invalidateGalleryCache();
    this.logger.log(`Created gallery album with ID ${saved.id} by user ${createById}`);
    return this.findAlbumOrFail(saved.id);
  }

  async findAllAlbums(published = true): Promise<GalleryAlbum[]> {
    const cacheKey = `gallery:albums:${published}`;
    const cached = await this.cache.get<GalleryAlbum[]>(cacheKey);
    if (cached) return cached;

    const where = published ? { isPublished: true } : {};
    const albums = await this.albumRepo.find({
      where,
      relations: ['createdBy'],
      order: { order: 'ASC', createdAt: 'DESC' },
      select: {
        createdBy: { id: true, name: true },
      },
    });

    await this.cache.set(cacheKey, albums, 300_000);
    return albums;
  }

  async findAlbumWithItems(albumId: number): Promise<GalleryAlbum & { items: GalleryItemResponse[] }> {
    const cacheKey = `gallery:album:${albumId}`;
    const cached = await this.cache.get<GalleryAlbum & { items: GalleryItemResponse[] }>(cacheKey);

    if (cached) return cached;

    const album = await this.albumRepo.findOne({
      where: { id: albumId },
      relations: ['items', 'items.uploadedBy', 'createdBy'],
      select: {
        createdBy: { id: true, name: true },
        items: {
          id: true, title: true, description: true, type: true,
          cloudinaryPublicId: true, imageUrl: true, thumbnailUrl: true,
          width: true, height: true, youtubeVideoId: true,
          isLivePhoto: true, liveVideoPublicId: true, liveVideoUrl: true,
          category: true, tags: true, order: true, viewCount: true,
          createdAt: true,
          uploadedBy: { id: true, name: true },
        },
      },
    });

    if (!album) throw new NotFoundException(`Album ID ${albumId} tidak ditemukan`);

    const result = {
      ...album,
      items: album.items.map((item) => this.enrichWithResponsiveUrls(item)),
    }

    await this.cache.set(cacheKey, result, 300_000);
    return result;
  }

  async updateAlbum(id: number, dto: UpdateAlbumDto): Promise<GalleryAlbum> {
    const album = await this.findAlbumWithItems(id);

    if (dto.coverItemId) {
      const coverItem = await this.findOrFail(dto.coverItemId);
      album.coverPublicId = coverItem.cloudinaryPublicId;
      album.coverUrl = coverItem.thumbnailUrl;
      delete (dto as any).coverItemId;
    }

    Object.assign(album, dto);
    const saved = await this.albumRepo.save(album);
    await this.invalidateGalleryCache();
    return saved;
  }

  async deleteAlbum(id: number): Promise<void> {
    const album = await this.findAlbumOrFail(id);
    await this.albumRepo.remove(album);
    await this.invalidateGalleryCache();
    this.logger.log(`Deleted gallery album with ID ${id}`);
  }



  async addItemsToAlbum(albumId: number, itemIds: number[]): Promise<GalleryAlbum> {
    const album = await this.albumRepo.findOne({
      where: { id: albumId },
      relations: ['items'],
    });
    if (!album) throw new NotFoundException(`Album ID ${albumId} tidak ditemukan`);

    const items = await this.galleryRepository.find({ where: { id: In(itemIds) } });
    if (items.length !== itemIds.length) {
      const found = items.map((i) => i.id);
      const missing = itemIds.filter((id) => !found.includes(id));
      throw new BadRequestException(`Gallery items not found: ${missing.join(', ')}`);
    }

    // Merge — hindari duplicate
    const existingIds = new Set(album.items.map((i) => i.id));
    const newItems = items.filter((i) => !existingIds.has(i.id));
    album.items = [...album.items, ...newItems];
    album.itemCount = album.items.length;

    // Auto-set cover kalau belum ada
    if (!album.coverPublicId && album.items.length > 0) {
      const firstImage = album.items.find((i) => i.cloudinaryPublicId);
      if (firstImage) {
        album.coverPublicId = firstImage.cloudinaryPublicId;
        album.coverUrl = firstImage.thumbnailUrl;
      }
    }

    await this.albumRepo.save(album);
    await this.invalidateGalleryCache();
    return this.findAlbumOrFail(albumId);

  }

  async removeItemsFromAlbum(albumId: number, itemIds: number[]): Promise<GalleryAlbum> {
    const album = await this.albumRepo.findOne({
      where: { id: albumId },
      relations: ['items'],
    });
    if (!album) throw new NotFoundException(`Album ID ${albumId} tidak ditemukan`);

    album.items = album.items.filter((i) => !itemIds.includes(i.id));
    album.itemCount = album.items.length;
    await this.albumRepo.save(album);
    await this.invalidateGalleryCache();
    return this.findAlbumOrFail(albumId);
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

  async recordView(
    galleryItemId: number,
    identity: ResolvedIdentity,
  ): Promise<{ isNewView: boolean; viewCount: number }> {
    const item = await this.galleryRepository.findOne({
      where: { id: galleryItemId },
    });

    if (!item) throw new ForbiddenException('Gallery item not found');

    if (!item.enableViews) {
      return { isNewView: false, viewCount: item.viewCount };
    }

    const existing = await this.findExistingViewRecord(galleryItemId, identity);

    if (existing) {
      if (identity.userId && !existing.userId) {
        existing.userId = identity.userId;
        await this.viewRepository.save(existing);
        this.logger.log(`Existing gallery view updated with User ID: ${identity.userId} for Item ID: ${galleryItemId}`);
      }
      return { isNewView: false, viewCount: item.viewCount };
    }

    await this.viewRepository.save(
      this.viewRepository.create({
        galleryItemId,
        userId: identity.userId ?? undefined,
        visitorId: identity.visitorId,
        fingerprintHash: identity.fingerprintHash,
        ipAddress: identity.ipAddress,
        userAgent: identity.userAgent,
      }),
    );

    await this.galleryRepository.increment({ id: galleryItemId }, 'viewCount', 1);

    this.logger.debug(`View recorded for gallery item ${galleryItemId} via ${identity.type} (${identity.identifier.substring(0, 8)}...)`);

    await this.cache.del(`gallery:item:${galleryItemId}`);

    return { isNewView: true, viewCount: item.viewCount + 1 };
  }

  async getViewCount(galleryItemId: number): Promise<number> {
    return this.viewRepository.count({ where: { galleryItemId } });
  }

  private async findExistingViewRecord(
    galleryItemId: number,
    identity: ResolvedIdentity,
  ): Promise<GalleryView | null> {
    if (identity.userId) {
      const found = await this.viewRepository.findOne({
        where: { galleryItemId, userId: identity.userId },
      });
      if (found) return found;
    }

    if (identity.visitorId) {
      const found = await this.viewRepository.findOne({
        where: { galleryItemId, visitorId: identity.visitorId },
      });
      if (found) return found;
    }

    if (identity.fingerprintHash) {
      const found = await this.viewRepository.findOne({
        where: { galleryItemId, fingerprintHash: identity.fingerprintHash },
      });
      if (found) return found;
    }

    return null;
  }

  private async invalidateGalleryCache(): Promise<void> {
    await this.cache.del('gallery:categories');

    await this.cache.clear();

    this.logger.debug('Gallery cache invalidated');
  }

  private enrichWithResponsiveUrls(item: GalleryItem): GalleryItemResponse {
    const response = item as GalleryItemResponse;

    if (item.cloudinaryPublicId) {
      response.responsive = this.cloudinaryService.generateResponsiveUrls(item.cloudinaryPublicId)
    }
    if (item.isLivePhoto && item.liveVideoPublicId) {
      response.liveVideoMp4Url = this.cloudinaryService.generateThumbnailUrl(item.liveVideoPublicId, 0);
    }
    return response;
  }

  private async findAlbumOrFail(id: number): Promise<GalleryAlbum> {
    const album = await this.albumRepo.findOne({
      where: { id },
      relations: ['createdBy'],
      select: { createdBy: { id: true, name: true } },
    });

    if (!album) throw new NotFoundException(`Album ID ${id} tidak ditemukan`);
    return album;
  }
}

