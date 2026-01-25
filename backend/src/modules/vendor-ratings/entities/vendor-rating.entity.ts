import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
} from 'typeorm';

export enum RatingType {
  PROJECT_COMPLETION = 'project_completion',
  ONGOING_RELATIONSHIP = 'ongoing_relationship',
  RFQ_RESPONSE = 'rfq_response',
  SAMPLE_EVALUATION = 'sample_evaluation',
}

@Entity('vendor_ratings')
@Check('quality_rating >= 1 AND quality_rating <= 5')
@Check('delivery_rating >= 1 AND delivery_rating <= 5')
@Check('cost_rating >= 1 AND cost_rating <= 5')
@Check('service_rating >= 1 AND service_rating <= 5')
@Check('communication_rating >= 1 AND communication_rating <= 5')
export class VendorRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  vendorId: string;

  @Column('uuid', { nullable: true })
  projectId?: string;

  @Column('varchar')
  userEmail: string;

  // Rating Categories (1-5 scale)
  @Column({ type: 'integer', nullable: true })
  qualityRating?: number;

  @Column({ type: 'integer', nullable: true })
  deliveryRating?: number;

  @Column({ type: 'integer', nullable: true })
  costRating?: number;

  @Column({ type: 'integer', nullable: true })
  serviceRating?: number;

  @Column({ type: 'integer', nullable: true })
  communicationRating?: number;

  // Overall rating (auto-calculated)
  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true, select: false })
  overallRating?: number;

  // Additional evaluation fields
  @Column({ type: 'text', nullable: true })
  comments?: string;

  @Column({ type: 'boolean', nullable: true })
  wouldRecommend?: boolean;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  contractValue?: number;

  @Column({ type: 'date', nullable: true })
  deliveryDate?: Date;

  @Column({ type: 'date', nullable: true })
  actualDeliveryDate?: Date;

  @Column({
    type: 'enum',
    enum: RatingType,
    default: RatingType.PROJECT_COMPLETION,
  })
  ratingType: RatingType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations (if you have these entities)
  // @ManyToOne(() => Vendor, { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'vendor_id' })
  // vendor: Vendor;

  // @ManyToOne(() => Project, { onDelete: 'SET NULL' })
  // @JoinColumn({ name: 'project_id' })
  // project?: Project;

  // @ManyToOne(() => User, { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'user_id' })
  // user: User;

  // Computed properties
  get calculatedOverallRating(): number | null {
    const ratings = [
      this.qualityRating,
      this.deliveryRating,
      this.costRating,
      this.serviceRating,
      this.communicationRating,
    ].filter(rating => rating !== null && rating !== undefined);

    if (ratings.length === 0) return null;

    return Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 100) / 100;
  }

  get ratingCount(): number {
    return [
      this.qualityRating,
      this.deliveryRating,
      this.costRating,
      this.serviceRating,
      this.communicationRating,
    ].filter(rating => rating !== null && rating !== undefined).length;
  }

  get isComplete(): boolean {
    return this.ratingCount >= 3; // At least 3 categories rated
  }

  get deliveryPerformance(): 'early' | 'on_time' | 'late' | 'unknown' {
    if (!this.deliveryDate || !this.actualDeliveryDate) return 'unknown';
    
    const planned = new Date(this.deliveryDate).getTime();
    const actual = new Date(this.actualDeliveryDate).getTime();
    
    if (actual < planned) return 'early';
    if (actual === planned) return 'on_time';
    return 'late';
  }
}