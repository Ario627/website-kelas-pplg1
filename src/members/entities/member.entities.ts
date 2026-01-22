import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

export enum Gender {
  MALE = 'L',
  FEMALE = 'P',
}

@Entity('members')
@Index(['nisn'])
@Index(['fullName'])
export class Member {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 50, nullable: true })
  nickname: string | null;

  @Column({
    type: 'enum',
    enum: Gender,
  })
  gender: Gender;

  @Column({ type: 'date', nullable: true })
  birthDate: Date | null;

  @Column({ type: 'int', default: 1 })
  absenNumber: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

//BISA TAMBAH APA2 LAGI DISINI
