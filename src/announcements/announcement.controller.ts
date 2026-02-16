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
  @UseGuards(OptionalJwtAuthGUard)
  async addReaction(
    @Param('id') id: string,
    @Body() dto: AddReactionDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const result = await this.announcementService.addReaction(
      id,
      user?.id ?? null,
      dto.reactionType,
      ipAddress,
      userAgent,
    );

    // Broadcast handled by gateway via socket event
    return result;
  }

  @Delete(':id/reactions')
  @UseGuards(OptionalJwtAuthGUard)
  @HttpCode(HttpStatus.OK)
  async removeReaction(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.announcementService.removeReaction(id, user.id);
  }

  @Post(':id/views')
  @UseGuards(OptionalJwtAuthGUard)
  @HttpCode(HttpStatus.OK)
  async recordView(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    return this.announcementService.recordView(id, user?.id ?? null, ipAddress, userAgent);
  }

  @Get(':id/viewers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getViewers(@Param('id') id: string) {
    return this.announcementService.getViewers(id);
  }

  //Helper
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'Unknown';
  }
}
