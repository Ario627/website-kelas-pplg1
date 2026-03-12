import { User } from 'src/users/entities/user.entities';
import { GalleryItem } from './gallery.entities';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  ManyToOne,
  JoinTable,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('gallery_albums')
@Index(['isPublished', 'order'])
export class GalleryAlbum {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 250 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 250, nullable: true })
  coverPublicId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverUrl: string | null;

  @Column({ type: 'int', default: 0 })
  order: number;

  @Column({ default: true })
  isPublished: boolean;

  @Column({ type: 'int', default: 0 })
  itemCount: number; // Denormalized count — biar ga perlu JOIN setiap query

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createById: number;

  @ManyToMany(() => GalleryItem, (item) => item.albums)
  @JoinTable({
    name: 'gallery_album_items', // join table name
    joinColumn: { name: 'albumId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'galleryItemId', referencedColumnName: 'id' },
  })
  items: GalleryItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

}

