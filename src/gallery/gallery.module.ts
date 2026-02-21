import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GalleryItem } from "./entities/gallery.entities";
import { GalleryService } from "./gallery.service";
import { GalleryController } from "./gallery.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([GalleryItem]),
  ],
  controllers: [GalleryController],
  providers: [GalleryService],
  exports: [GalleryService],
})
export class GalleryModule { }
