import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { Announcement } from '../announcements/entities/announcements.entities';
import { User } from '../users/entities/user.entities';
import { GalleryItem } from '../gallery/entities/gallery.entities';

@Module({
    imports: [
        TypeOrmModule.forFeature([Announcement, User, GalleryItem]),
    ],
    controllers: [StatsController],
    providers: [StatsService],
})
export class StatsModule { }
