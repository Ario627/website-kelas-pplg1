import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GalleryItem } from "./entities/gallery.entities";
import { GalleryView } from "./entities/gallery-view.entities";
import { GalleryService } from "./gallery.service";
import { GalleryController } from "./gallery.controller";
import { IdentityModule } from "src/common/identity/identity.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([GalleryItem, GalleryView]),
    IdentityModule,
  ],
  controllers: [GalleryController],
  providers: [GalleryService],
  exports: [GalleryService],
})
export class GalleryModule { }
