import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Item } from './item.entity';

@Entity('item_images')
export class ItemImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'item_id' })
  itemId: number;

  @Column({ name: 'image_url' })
  imageUrl: string;

  @Column({ name: 'public_id', nullable: true })
  publicId: string;

  @Column({ name: 'image_order', default: 0 })
  imageOrder: number;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;

  @ManyToOne(() => Item, item => item.images)
  @JoinColumn({ name: 'item_id' })
  item: Item;
}