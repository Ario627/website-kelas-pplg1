import { User } from "src/users/entities/user.entities";
import { Announcement } from "./announcements.entities";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index
} from 'typeorm';

export enum ReactionType {
  LIKE = 'like',
  LOVE = 'love',
  HAHA = 'haha',
  WOW = 'wow',
  SAD = 'sad',
  ANGRY = 'angry',
}

@Entity('announcements_reactions')
@Index(['announcementId', 'userId'])
@Index(['announcementId', 'reactionType'])
@Index(['announcementId', 'ipAddress'])
export class AnnouncementsReaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ReactionType,
  })
  reactionType: ReactionType;

  @ManyToOne(() => Announcement, (a) => a.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'announcementId' })
  announcement: Announcement;

  @Column()
  announcementId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ nullable: true })
  userId: number | null;

  @Column({ nullable: true, type: 'varchar' })
  ipAddress: string | null;

  @Column({ nullable: true, type: 'varchar' })
  userAgent: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  reactedAt: Date;
}
