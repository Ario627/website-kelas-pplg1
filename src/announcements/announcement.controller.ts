import { AnnouncementService } from "./announcement.service";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { UpdateAnnouncementDto } from "./dto/update-announcement.dto";
import { JwtAuthGuard } from "src/common/guards/jwt.guard";
import { RolesGuard } from "src/common/guards/role.guard";
import { Roles } from "src/common/decorators/roles.decorators";
import { UserRole, User } from "src/users/entities/user.entities";
import { CurrentUser } from "src/common/decorators/current-user.decorators";
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from "@nestjs/common"

@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) { }

  @Get()
  async findActive() {
    const announcements = await this.announcementService.findActive();
    return {
      data: announcements,
      meta: {
        total: announcements.length,
        page: 1,
        limit: announcements.length,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      }
    };
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.announcementService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async findMyAnnouncements(@CurrentUser() user: User) {
    const announcements = await this.announcementService.findByAuthor(user.id);
    return {
      data: announcements,
      meta: {
        total: announcements.length,
      }
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.announcementService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createDto: CreateAnnouncementDto, @CurrentUser() user: User) {
    return this.announcementService.create(createDto, user.id);
  }

  @Post(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAnnouncementDto,
  ) {
    return this.announcementService.update(id, updateDto)
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.announcementService.remove(id);
  }
}
