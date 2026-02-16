import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { AnnouncementsGateway } from './announcements.gateway';
import { Announcement } from './entities/announcements.entities';
import { AnnouncementsReaction } from './entities/announcements-reaction.entities';
import { AnnouncementsView } from './entities/announcements-view.entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Announcement,
      AnnouncementsReaction,
      AnnouncementsView,
    ]),
  ],
  controllers: [AnnouncementController],
  providers: [AnnouncementService, AnnouncementsGateway],
  exports: [AnnouncementService, AnnouncementsGateway],
})
export class AnnouncementModule { }
