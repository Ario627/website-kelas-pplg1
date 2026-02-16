import { User } from "src/users/entities/user.entities";
import { AnnouncementsView } from "src/announcements/entities/announcements-view.entities";
import { AnnouncementsReaction } from "./announcements-reaction.entities";
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany
} from "typeorm";


export enum AnnouncementPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent"
}

@Entity('announcements')
@Index(['isActive', 'expiresAt', 'isPinned'])
@Index(['priority'])
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 250 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: AnnouncementPriority,
    default: AnnouncementPriority.MEDIUM,
  })
  priority: AnnouncementPriority;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  pinnedAt: Date | null;

  @Column({ default: true })
  enableViews: boolean;

  @Column({ default: true })
  enableReactions: boolean;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column({ nullable: true })
  authorId: number;

  @OneToMany(() => AnnouncementsReaction, (reaction) => reaction.announcement)
  reactions: AnnouncementsReaction[];

  @OneToMany(() => AnnouncementsView, (view) => view.announcement)
  views: AnnouncementsView[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
