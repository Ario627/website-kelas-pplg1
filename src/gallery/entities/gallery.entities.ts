import { User } from "src/users/entities/user.entities";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";

export enum GalleryType {
  IMAGE = 'image',
  VIDEO = 'video',
}

@Entity('gallery_items')
@Index(['category'])
@Index(['type'])
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

  //For video
  @Column({ length: 20, nullable: true })
  youtubeVideoId: string;

  //Metadata
  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ type: 'jsonb', nullable: true })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  order: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @Column({ nullable: true })
  uploadedById: number;

  @CreateDateColumn({ type: 'timestamptz' })
  uploadedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

}

