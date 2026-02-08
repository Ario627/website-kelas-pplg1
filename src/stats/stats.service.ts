import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { Announcement } from '../announcements/entities/announcements.entities';
import { GalleryItem } from '../gallery/entities/gallery.entities';

export interface StatsResponse {
    announcements: number;
    gallery: number;
}

@Injectable()
export class StatsService {
    constructor(
        @InjectRepository(Announcement)
        private readonly announcementRepository: Repository<Announcement>,
        @InjectRepository(GalleryItem)
        private readonly galleryRepository: Repository<GalleryItem>,
    ) { }

    async getStats(): Promise<StatsResponse> {
        const now = new Date();

        // Count active announcements (not expired)
        const announcements = await this.announcementRepository.count({
            where: [
                { isActive: true, expiresAt: MoreThan(now) },
                { isActive: true, expiresAt: IsNull() },
            ],
        });

        // Count gallery items
        const gallery = await this.galleryRepository.count();

        return {
            announcements,
            gallery,
        };
    }
}
