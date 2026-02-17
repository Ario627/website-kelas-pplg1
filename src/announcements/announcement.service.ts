import { Injectable, NotFoundException, Logger, ConflictException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan, IsNull, In } from "typeorm";
import { Announcement, AnnouncementPriority } from "./entities/announcements.entities";
import { AnnouncementsReaction, ReactionType } from "./entities/announcements-reaction.entities";
import { AnnouncementsView } from "./entities/announcements-view.entities";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { UpdateAnnouncementDto } from "./dto/update-announcement.dto";
import { Identity, type ResolvedIdentity } from "src/common/identity/identity";
import {
  AnnouncementWithStats,
  ReactionCount,
  ViewerInfo
} from './dto/announcements-response.dto';
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";

@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepo: Repository<Announcement>,
    @InjectRepository(AnnouncementsReaction)
    private readonly reactionRepo: Repository<AnnouncementsReaction>,
    @InjectRepository(AnnouncementsView)
    private readonly viewRepo: Repository<AnnouncementsView>,
  ) { }

  async create(dto: CreateAnnouncementDto, authorId: number): Promise<AnnouncementWithStats> {
    const announcement = this.announcementRepo.create({
      ...dto,
      authorId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    const saved = await this.announcementRepo.save(announcement);

    this.logger.log(`Announcement created with ID: ${saved.id} by User ID: ${authorId}`);
    return this.findOne(saved.id);
  }

  async findOne(id: string, userId?: number): Promise<AnnouncementWithStats> {
    const announcement = await this.announcementRepo.findOne({ where: { id } });

    if (!announcement) {
      throw new NotFoundException('Announcements not found');
    }

    return this.mapToAnnouncementWithStats(announcement, userId);
  }

  async update(id: string, dto: UpdateAnnouncementDto): Promise<AnnouncementWithStats> {
    const announcement = await this.announcementRepo.findOne({ where: { id } });

    if (!announcement) {
      throw new NotFoundException('Announcement not found')
    }

    if (dto.isPinned !== undefined && dto.isPinned !== announcement.isPinned) {
      announcement.pinnedAt = dto.isPinned ? new Date() : null
    }

    Object.assign(announcement, {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : announcement.expiresAt,
    });

    await this.announcementRepo.save(announcement)
    return this.findOne(id)
  }

  async remove(id: string): Promise<void> {
    const announcement = await this.announcementRepo.findOne({ where: { id } });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    await this.announcementRepo.remove(announcement);
    this.logger.log(`Announcement with ID: ${id} has been removed`);
  }

  //DSINI YAAAA

  async addReaction(
    announcementId: string,
    reactionType: ReactionType,
    identity: ResolvedIdentity,
  ): Promise<{ reaction: AnnouncementsReaction; counts: ReactionCount[] }> {
    const announcement = await this.announcementRepo.findOne({
      where: { id: announcementId },
    });

    if (!announcement) throw new ForbiddenException('Announcement not found');

    if (!announcement.enableReactions) {
      throw new ConflictException('Reactions are disabled for this announcement');
    }

    const existing = await this.findExistingRecord(
      this.reactionRepo, 'announcementId', announcementId, identity,
    );

    let reaction: AnnouncementsReaction;

    if (existing) {
      existing.reactionType = reactionType;

      if (identity.userId && !existing.userId) existing.userId = identity.userId;
      if (identity.visitorId && !existing.visitorId) existing.visitorId = identity.visitorId;
      reaction = await this.reactionRepo.save(existing);
    } else {
      reaction = await this.reactionRepo.save(
        this.reactionRepo.create({
          announcementId,
          userId: identity.userId ?? undefined,
          visitorId: identity.visitorId ?? undefined,
          fingerprintHash: identity.fingerprintHash ?? undefined,
          reactionType,
          ipAddress: identity.ipAddress ?? undefined,
          userAgent: identity.userAgent ?? undefined,
        })
      )
    }

    const counts = await this.getReactionCounts(announcementId);
    this.logger.log(`User ID: ${identity.userId ?? 'N/A'} reacted with ${reactionType} to Announcement ID: ${announcementId}`);

    return { reaction, counts };
  }
  async togglePin(id: string): Promise<AnnouncementWithStats> {
    const announcement = await this.announcementRepo.findOne({ where: { id } });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    announcement.isPinned = !announcement.isPinned;
    announcement.pinnedAt = announcement.isPinned ? new Date() : null;

    await this.announcementRepo.save(announcement);
    this.logger.log(`Announcement ${id} ${announcement.isPinned ? 'pinned' : 'unpinned'}`);

    return this.findOne(id);
  }

  async removeReaction(announcementId: string, userId: number,): Promise<{ counts: ReactionCount[] }> {
    const reaction = await this.reactionRepo.findOne({
      where: { announcementId, userId },
    });

    if (reaction) {
      await this.reactionRepo.remove(reaction);
      this.logger.log(`User ID: ${userId} removed reaction from Announcement ID: ${announcementId}`);
    }

    const counts = await this.getReactionCounts(announcementId);
    return { counts };
  }



  async findAll(userId?: number): Promise<AnnouncementWithStats[]> {
    const announcement = await this.announcementRepo.find({
      relations: ['author', 'reactions'],
      order: { isPinned: 'DESC', createdAt: 'DESC' },
      select: {
        author: { id: true, name: true },
      },
    });
    return Promise.all(
      announcement.map((a) => this.mapToAnnouncementWithStats(a, userId))
    );
  }

  async getReactionCounts(announcementId: string): Promise<ReactionCount[]> {
    const result = await this.reactionRepo
      .createQueryBuilder('r')
      .select('r.reactionType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('r.announcementId = :id', { id: announcementId })
      .groupBy('r.reactionType')
      .getRawMany();

    return result.map((r) => ({
      type: r.type as ReactionType,
      count: parseInt(r.count, 10),
    }))
  }

  async getUserReaction(announcementId: string, userId: number): Promise<ReactionType | null> {
    const reaction = await this.reactionRepo.findOne({
      where: { announcementId, userId },
    });
    return reaction?.reactionType || null;
  }

  async recordView(
    announcementId: string,
    identity: ResolvedIdentity,
  ): Promise<{ isNewView: boolean; viewCount: number }> {
    const announcement = await this.announcementRepo.findOne({
      where: { id: announcementId },
    });

    if (!announcement) throw new ForbiddenException('Announcement not found');

    if (!announcement.enableViews) {
      return { isNewView: false, viewCount: announcement.viewCount };
    }

    const existing = await this.findExistingRecord(
      this.viewRepo, 'announcementId', announcementId, identity,
    );

    if (existing) {
      if (identity.userId && !existing.userId) {
        existing.userId = identity.userId;
        await this.viewRepo.save(existing);
        this.logger.log(`Existing view updated with User ID: ${identity.userId} for Announcement ID: ${announcementId}`);
      }
      return { isNewView: false, viewCount: announcement.viewCount };
    }

    await this.viewRepo.save(
      this.viewRepo.create({
        announcementId,
        userId: identity.userId ?? undefined,
        visitorId: identity.visitorId,
        fingerprintHash: identity.fingerprintHash,
        ipAddress: identity.ipAddress,
        userAgent: identity.userAgent,
      }),
    );

    await this.announcementRepo.increment({ id: announcementId }, 'viewCount', 1);

    this.logger.debug(`View recorded for ${announcementId} via ${identity.type} (${identity.identifier.substring(0, 8)}...)`);

    return { isNewView: true, viewCount: announcement.viewCount + 1 };
  }

  async getViewers(announcementId: string): Promise<ViewerInfo[]> {
    const views = await this.viewRepo.find({
      where: { announcementId },
      relations: ['user'],
      order: { viewedAt: 'DESC' },
    });

    return views.map((v) => ({
      id: v.user?.id ?? null,
      name: v.user?.name ?? null,
      viewedAt: v.viewedAt,
    }));
  }

  async findActive(userId?: number): Promise<AnnouncementWithStats[]> {
    const now = new Date();

    const announcements = await this.announcementRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.author', 'author')
      .leftJoinAndSelect('a.reactions', 'reactions')
      .where('a.isActive = :active', { active: true })
      .andWhere('(a.expiresAt IS NULL OR a.expiresAt > :now)', { now })
      .orderBy('a.isPinned', 'DESC')
      .addOrderBy('a.createdAt', 'DESC')
      .getMany();

    return Promise.all(
      announcements.map((a) => this.mapToAnnouncementWithStats(a, userId))
    );
  }

  async getViewCount(announcementId: string): Promise<number> {
    return this.viewRepo.count({ where: { announcementId } });
  }

  //HELPER
  private async findExistingRecord<T extends { userId?: number | null; visitorId?: string | null; fingerprintHash?: string | null }>(
    repo: Repository<T>,
    targetColumn: string,
    targetId: string,
    identity: ResolvedIdentity,
  ): Promise<T | null> {
    if (identity.userId) {
      const found = await repo.findOne({
        where: { [targetColumn]: targetId, userId: identity.userId } as any,
      });
      if (found) return found;
    }

    if (identity.visitorId) {
      const found = await repo.findOne({
        where: { [targetColumn]: targetId, visitorId: identity.visitorId } as any,
      });
      if (found) return found;
    }

    if (identity.fingerprintHash) {
      const found = await repo.findOne({
        where: { [targetColumn]: targetId, fingerprintHash: identity.fingerprintHash } as any,
      });
      if (found) return found;
    }

    return null;
  }

  private async mapToAnnouncementWithStats(announcement: Announcement, userId?: number): Promise<AnnouncementWithStats> {
    const reactionCounts = await this.getReactionCounts(announcement.id);
    const totalReactions = reactionCounts.reduce((sum, r) => sum + r.count, 0);

    let userReaction: ReactionType | null = null;
    if (userId) {
      userReaction = await this.getUserReaction(announcement.id, userId);
    }

    return {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      isActive: announcement.isActive,
      isPinned: announcement.isPinned,
      enableViews: announcement.enableViews,
      enableReactions: announcement.enableReactions,
      viewCount: announcement.viewCount,
      expiresAt: announcement.expiresAt,
      author: announcement.author ? { id: announcement.author.id, name: announcement.author.name } : { id: 0, name: 'Unknown' },
      reactions: reactionCounts,
      totalReactions,
      userReaction,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
    };
  }
}
