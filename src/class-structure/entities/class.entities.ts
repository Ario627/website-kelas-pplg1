import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('class_info')
export class ClassInfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  classname: string;

  @Column({ length: 20, nullable: true })
  teacherPhot: string | null;

  @Column({ length: 255, nullable: true })
  classLogo: string | null;

  @Column({ type: 'text', nullable: true })
  motto: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updateAt: Date;
}
