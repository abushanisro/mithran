import { Entity, ViewEntity, ViewColumn } from 'typeorm';

export enum VendorClassification {
  PREFERRED = 'preferred',
  APPROVED = 'approved',
  CONDITIONAL = 'conditional',
  RESTRICTED = 'restricted',
  UNRATED = 'unrated',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum PerformanceTrend {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
  INSUFFICIENT_DATA = 'insufficient_data',
}

@ViewEntity({
  name: 'vendor_rating_aggregates',
  materialized: true,
})
export class VendorRatingAggregate {
  @ViewColumn()
  vendorId: string;

  @ViewColumn()
  vendorName: string;

  @ViewColumn()
  supplierCode: string;

  @ViewColumn()
  city: string;

  @ViewColumn()
  state: string;

  @ViewColumn()
  country: string;

  // Rating Statistics
  @ViewColumn()
  totalRatings: number;

  @ViewColumn()
  avgOverallRating: number;

  @ViewColumn()
  avgQualityRating: number;

  @ViewColumn()
  avgDeliveryRating: number;

  @ViewColumn()
  avgCostRating: number;

  @ViewColumn()
  avgServiceRating: number;

  @ViewColumn()
  avgCommunicationRating: number;

  // Rating Distribution
  @ViewColumn()
  excellentRatings: number; // 4.5+

  @ViewColumn()
  goodRatings: number; // 3.5-4.4

  @ViewColumn()
  averageRatings: number; // 2.5-3.4

  @ViewColumn()
  poorRatings: number; // <2.5

  // Performance Metrics
  @ViewColumn()
  recommendationRate: number; // Percentage

  @ViewColumn()
  recentAvgRating: number; // Last 6 months

  @ViewColumn()
  performanceTrend: PerformanceTrend;

  @ViewColumn()
  lastRatedAt: Date;

  // Classifications
  @ViewColumn()
  vendorClassification: VendorClassification;

  @ViewColumn()
  riskLevel: RiskLevel;

  // Computed properties
  get ratingStars(): number {
    return Math.round(this.avgOverallRating || 0);
  }

  get ratingStarsDecimal(): number {
    return Math.round((this.avgOverallRating || 0) * 10) / 10;
  }

  get hasRecentActivity(): boolean {
    if (!this.lastRatedAt) return false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return new Date(this.lastRatedAt) > sixMonthsAgo;
  }

  get isReliable(): boolean {
    return this.totalRatings >= 5 && this.avgOverallRating >= 3.5;
  }

  get performanceIndicator(): 'excellent' | 'good' | 'average' | 'poor' | 'unrated' {
    if (this.totalRatings === 0) return 'unrated';
    
    const rating = this.avgOverallRating;
    if (rating >= 4.5) return 'excellent';
    if (rating >= 3.5) return 'good';
    if (rating >= 2.5) return 'average';
    return 'poor';
  }

  get ratingDistributionPercentages() {
    if (this.totalRatings === 0) {
      return {
        excellent: 0,
        good: 0,
        average: 0,
        poor: 0,
      };
    }

    return {
      excellent: Math.round((this.excellentRatings / this.totalRatings) * 100),
      good: Math.round((this.goodRatings / this.totalRatings) * 100),
      average: Math.round((this.averageRatings / this.totalRatings) * 100),
      poor: Math.round((this.poorRatings / this.totalRatings) * 100),
    };
  }
}