import { User } from "src/users/entities/user.entities";
import { GalleryItem } from "./gallery.entities";
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index
} from 'typeorm';

@Entity('gallery_views')
@Index(['galleryItemId', 'userId'])
@Index(['galleryItemId', 'visitorId'])
@Index(['galleryItemId', 'fingerprintHash'])
export class GalleryView {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => GalleryItem, (g) => g.views, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'galleryItemId' })
    galleryItem: GalleryItem;

    @Column()
    galleryItemId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'userId' })
    user: User | null;

    @Column({ nullable: true })
    userId: number | null;

    @Column({ type: 'varchar', length: 36, nullable: true })
    visitorId: string | null;

    @Column({ type: 'varchar', length: 32, nullable: true })
    fingerprintHash: string | null;

    @Column({ type: 'varchar', nullable: true })
    ipAddress: string | null;

    @Column({ type: 'text', nullable: true })
    userAgent: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    viewedAt: Date;
}
