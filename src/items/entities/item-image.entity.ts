import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Item } from './item.entity';

@Entity('item_images')
export class ItemImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'item_id' })
  itemId: number;

  // Primary storage (Cloudinary)
  @Column({ name: 'cloudinary_url', nullable: true })
  cloudinaryUrl: string;

  @Column({ name: 'cloudinary_public_id', nullable: true })
  cloudinaryPublicId: string;

  // Backup storage (DigitalOcean Spaces)
  @Column({ name: 'spaces_url', nullable: true })
  spacesUrl: string;

  @Column({ name: 'spaces_key', nullable: true })
  spacesKey: string;

  // Legacy support for existing images
  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ name: 'public_id', nullable: true })
  publicId: string;

  @Column({ name: 'image_order', default: 0 })
  imageOrder: number;

  @Column({ name: 'file_size', nullable: true })
  fileSize: number;

  @Column({ name: 'file_type', nullable: true })
  fileType: string;

  @Column({ name: 'original_filename', nullable: true })
  originalFilename: string;

  @Column({ name: 'image_variants', type: 'json', nullable: true })
  imageVariants: { [key: string]: string };

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;

  @ManyToOne(() => Item, item => item.images)
  @JoinColumn({ name: 'item_id' })
  item: Item;

  // Virtual property to get the best available URL
  get bestUrl(): string {
    return this.cloudinaryUrl || this.spacesUrl || this.imageUrl;
  }

  // Virtual property to check if backup is available
  get hasBackup(): boolean {
    return !!(this.cloudinaryUrl && this.spacesUrl);
  }
}