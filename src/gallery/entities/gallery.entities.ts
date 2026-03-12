import { User } from "src/users/entities/user.entities";
import { GalleryView } from "./gallery-view.entities";
import { GalleryAlbum } from "./gallery-album.entities";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  UpdateDateColumn,
  ManyToMany,
} from "typeorm";

export enum GalleryType {
  IMAGE = 'image',
  VIDEO = 'video',
  LIVE_PHOTO = 'live_photo',
}

@Entity('gallery_items')
@Index(['category'])
@Index(['type'])
@Index(['isPublished', 'order'])
@Index(['createdAt'])
export class GalleryItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 250 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: GalleryType,
    default: GalleryType.IMAGE,
  })
  type: GalleryType;

  @Column({ length: 250, nullable: true })
  cloudinaryPublicId: string;

  @Column({ length: 500, nullable: true })
  imageUrl: string;

  @Column({ length: 500, nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'int', nullable: true })
  width: number;

  @Column({ type: 'int', nullable: true })
  height: number;

  @Column({ type: 'int', nullable: true })
  fileSize: number;

  @Column({ length: 10, nullable: true })
  format: string;

  //For video
  @Column({ length: 20, nullable: true })
  youtubeVideoId: string;

  // ─── Live Photo fields (NEW) ───
  @Column({ default: false })
  isLivePhoto: boolean;

  /** Cloudinary public ID untuk video component (.MOV) */
  @Column({ type: 'varchar', length: 250, nullable: true })
  liveVideoPublicId: string | null;

  /** URL video component dari Live Photo */
  @Column({ type: 'varchar', length: 500, nullable: true })
  liveVideoUrl: string | null;

  /** Duration video component dalam seconds */
  @Column({ type: 'float', nullable: true })
  liveVideoDuration: number | null;

  //Metadata
  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ default: true })
  isPublished: boolean;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @Column({ nullable: true })
  uploadedById: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ default: true })
  enableViews: boolean;

  @OneToMany(() => GalleryView, (v) => v.galleryItem)
  views: GalleryView[];

  @ManyToMany(() => GalleryAlbum, (album) => album.items)
  albums: GalleryAlbum[];

  @UpdateDateColumn({ type: 'timestamptz' })
  uploadedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

}

