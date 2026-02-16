import { User } from "src/users/entities/user.entities";
import { Announcement } from "./announcements.entities";
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index
} from 'typeorm';

@Entity('announcements_views')
@Index(['announcementId'])
export class AnnouncementsView {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Announcement, (a) => a.views, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'announcementId' })
    announcement: Announcement;

    @Column()
    announcementId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'userId' })
    user: User | null;

    @Column({ nullable: true })
    userId: number | null;

    @Column({ type: 'varchar', nullable: true })
    ipAddress: string | null;

    @Column({ type: 'text', nullable: true })
    userAgent: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    viewedAt: Date;

}