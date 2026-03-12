import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { GalleryService } from './gallery.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { CreateImageDto } from './dto/create-image.dto';
import { CreateLivePhotoDto } from './dto/create-live-photo.dto';
import { UpdateGalleryDto } from './dto/update-gallery.dto';
import { ReorderGalleryDto } from './dto/reorder-gallery.dto';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { AlbumItemsDto } from './dto/album-items.dto';
import { ImageValidation } from './pipes/image-validation.pipes';
import { LivePhotoValidation } from './pipes/live-photo-validation.pipes';
import { GalleryType } from './entities/gallery.entities';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { UserRole, User } from 'src/users/entities/user.entities';
import { Roles } from 'src/common/decorators/roles.decorators';
import { CurrentUser } from 'src/common/decorators/current-user.decorators';
import { Throttle } from '@nestjs/throttler';
import { OptionalJwtAuthGUard } from 'src/common/guards/optional-jwt-auth.guard';
import { IdentityGuard } from 'src/common/identity/identity.guard';
import { Identity, type ResolvedIdentity } from 'src/common/identity/identity';

@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) { }

  @Get()
  findAll(
    @Query('type') type?: GalleryType,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.galleryService.findAllPublished({
      type,
      category,
      cursor: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('categories')
  getCategories() {
    return this.galleryService.getCategoried()
  }

  @Get('type/:type')
  findByType(
    @Param('type', new ParseEnumPipe(GalleryType)) type: GalleryType,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.galleryService.findByType(
      type,
      cursor ? parseInt(cursor, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('albums')
  findAllAlbums() {
    return this.galleryService.findAllAlbums(true);
  }

  @Get('albums/:id')
  findAlbumWithItems(@Param('id', ParseIntPipe) id: number) {
    return this.galleryService.findAlbumWithItems(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.galleryService.findOne(id);
  }

  //Admin
  //
  @Post(':id/views')
  @UseGuards(OptionalJwtAuthGUard, IdentityGuard)
  @HttpCode(HttpStatus.OK)
  async recordView(
    @Param('id', ParseIntPipe) id: number,
    @Identity() identity: ResolvedIdentity,
  ) {
    return this.galleryService.recordView(id, identity);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllAdmin() {
    return this.galleryService.findAllAdmin();
  }

  @Post('image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  uploadImage(
    @Body() dto: CreateImageDto,
    @UploadedFile(ImageValidation) file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.galleryService.createImage(dto, file, user.id);
  }

  @Post('video')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  addVideo(
    @Body() dto: CreateVideoDto,
    @CurrentUser() user: User,
  ) {
    return this.galleryService.createVideo(dto, user.id);
  }

  @Post('live-photo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // Lebih ketat — 2 file upload
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
  )
  @HttpCode(HttpStatus.CREATED)
  uploadLivePhoto(
    @Body() dto: CreateLivePhotoDto,
    @UploadedFiles(LivePhotoValidation)
    files: { image: Express.Multer.File; video?: Express.Multer.File },
    @CurrentUser() user: User,
  ) {
    return this.galleryService.createLivePhoto(dto, files.image, files.video, user.id);
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  reorder(@Body() dto: ReorderGalleryDto) {
    return this.galleryService.reorder(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGalleryDto,
  ) {
    return this.galleryService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.galleryService.remove(id);
  }

  //Album
  @Get('admin/albums')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllAlbumsAdmin() {
    return this.galleryService.findAllAlbums(false); // Include unpublished
  }

  @Post('albums')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  createAlbum(
    @Body() dto: CreateAlbumDto,
    @CurrentUser() user: User,
  ) {
    return this.galleryService.createAlbum(dto, user.id);
  }

  @Patch('albums/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateAlbum(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlbumDto,
  ) {
    return this.galleryService.updateAlbum(id, dto);
  }

  @Delete('albums/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAlbum(@Param('id', ParseIntPipe) id: number) {
    return this.galleryService.deleteAlbum(id);
  }

  @Post('albums/:id/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  addItemsToAlbum(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AlbumItemsDto,
  ) {
    return this.galleryService.addItemsToAlbum(id, dto.itemIds);
  }

  @Delete('albums/:id/items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  removeItemsFromAlbum(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AlbumItemsDto,
  ) {
    return this.galleryService.removeItemsFromAlbum(id, dto.itemIds);
  }

}
