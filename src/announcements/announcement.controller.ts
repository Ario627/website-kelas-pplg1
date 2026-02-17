import { AnnouncementService } from "./announcement.service";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { UpdateAnnouncementDto } from "./dto/update-announcement.dto";
import { JwtAuthGuard } from "src/common/guards/jwt.guard";
import { RolesGuard } from "src/common/guards/role.guard";
import { Roles } from "src/common/decorators/roles.decorators";
import { UserRole, User } from "src/users/entities/user.entities";
import { CurrentUser } from "src/common/decorators/current-user.decorators";
import { AnnouncementsGateway } from "./announcements.gateway";
import type { Request } from "express"
import { AddReactionDto } from "./dto/reaction.dto";
import { OptionalJwtAuthGUard } from "src/common/guards/optional-jwt-auth.guard";
import { IdentityGuard } from "src/common/identity/identity.guard";
import { Identity, type ResolvedIdentity } from 'src/common/identity/identity';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common"
import { identity } from "rxjs";

@Controller('announcements')
export class AnnouncementController {
  constructor(
    private readonly announcementService: AnnouncementService,
    private readonly announcementsGateway: AnnouncementsGateway,
  ) { }

  @Get()
  @UseGuards(OptionalJwtAuthGUard)
  findActive(@CurrentUser() user: User) {
    return this.announcementService.findActive(user?.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGUard)
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.announcementService.findOne(id, user?.id);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@CurrentUser() user: User) {
    return this.announcementService.findAll(user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dtos: CreateAnnouncementDto, @CurrentUser() user: User) {
    const announcement = await this.announcementService.create(dtos, user.id);

    this.announcementsGateway.broadcastNewAnnouncement(announcement);

    return announcement;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() dtos: CreateAnnouncementDto) {
    const announcement = await this.announcementService.update(id, dtos);

    this.announcementsGateway.broadcastNewAnnouncement(announcement);

    return announcement;
  }

  @Patch(':id/pin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async pin(@Param('id') id: string) {
    const announcement = await this.announcementService.togglePin(id);

    this.announcementsGateway.broadcastPinUpdate(id, announcement.isPinned);

    return announcement;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.announcementService.remove(id);

    // Broadcast via WebSocket
    this.announcementsGateway.broadcastAnnouncementDelete(id);
  }

  @Post(':id/reactions')
  @UseGuards(OptionalJwtAuthGUard, IdentityGuard)
  @HttpCode(HttpStatus.OK)
  async addReaction(
    @Param('id') id: string,
    @Body() dto: AddReactionDto,
    @Identity() identity: ResolvedIdentity,
  ) {
    return this.announcementService.addReaction(id, dto.reactionType, identity);
  }

  @Delete(':id/reactions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeReaction(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.announcementService.removeReaction(id, user.id);
  }

  @Post(':id/views')
  @UseGuards(OptionalJwtAuthGUard, IdentityGuard)
  @HttpCode(HttpStatus.OK)
  async recordView(
    @Param('id') id: string,
    @Identity() identity: ResolvedIdentity,
  ) {

    return this.announcementService.recordView(id, identity);;
  }

  @Get(':id/viewers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getViewers(@Param('id') id: string) {
    return this.announcementService.getViewers(id);
  }


}
