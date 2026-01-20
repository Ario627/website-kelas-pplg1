import { UpdateAnnouncementDto } from "./dto/update-announcement.dto";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { Announcement } from "./entities/announcements.entities";
import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan, IsNull, Or } from "typeorm";

@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>
  ) { }

  async create(createDto: CreateAnnouncementDto, authorId: number): Promise<Announcement> {
    const announcement: Announcement = this.announcementRepository.create({
      ...createDto,
      authorId,
      expiresAt: createDto.expiresAt ? new Date(createDto.expiresAt) : null,
    });

    const save = await this.announcementRepository.save(announcement);
    this.logger.log(`Announcement created: ${save.title} from author ID ${authorId}`);
    return save;
  }

  async findAll(): Promise<Announcement[]> {
    return this.announcementRepository.find({
      relations: ['author'],
      order: { createdAt: 'DESC' },
      select: {
        author: {
          id: true,
          name: true,
          email: true,
        },
      },
    });
  }

  async findActive(): Promise<Announcement[]> {
    const now = new Date();

    return this.announcementRepository.find({
      where: [
        { isActive: true, expiresAt: MoreThan(now) },
        { isActive: true, expiresAt: IsNull() },
      ],
      relations: ['author'],
      order: { priority: 'DESC', createdAt: 'DESC' },
      select: {
        author: {
          id: true,
          name: true
        },
      },
    });
  }

  async findOne(id: number): Promise<Announcement> {
    const announcement = await this.announcementRepository.findOne({
      where: { id },
      relations: ['author'],
    });

    if (!announcement) {
      throw new NotFoundException(`Announcement with ID ${id} not found`);
    }

    return announcement;
  }

  async update(id: number, updateDto: UpdateAnnouncementDto): Promise<Announcement> {
    const announcement = await this.findOne(id);

    Object.assign(announcement, {
      ...updateDto,
      expiresAt: updateDto.expiresAt ? new Date(updateDto.expiresAt) : announcement.expiresAt,
    });

    return this.announcementRepository.save(announcement)
  }

  async remove(id: number): Promise<void> {
    const announcement = await this.findOne(id);

    await this.announcementRepository.remove(announcement);

    this.logger.log(`Announcement deleted: ID ${id}`);
  }
}
