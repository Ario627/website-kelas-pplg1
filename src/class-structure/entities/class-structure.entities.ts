import { Member } from "src/members/entities/member.entities";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  JoinColumn,
  ManyToOne,
} from "typeorm";

@Entity('class_positions')
@Index(['order'])
export class ClassPosition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  positionName: string;

  @Column()
  memberId: number;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member: Member;

  @Column({ type: 'int', default: 1 })
  order: number
}
