import { useMemo } from 'react';
import { useVendors } from './useVendors';
import { useVendorRatingAggregates } from './useVendorRatings';

// Extended vendor type with rating data
export interface VendorWithRatings {
  id: string;
  name?: string;
  companyName?: string;
  supplierCode?: string;
  city?: string;
  state?: string;
  country?: string;
  status?: string;
  website?: string;
  process?: string[];
  industries?: string[];
  materials?: string[];
  certifications?: string[];
  primaryContacts?: Array<{
    name?: string;
    email?: string;
    phone?: string;
    designation?: string;
  }>;
  leadTime?: string;
  location?: string;
  // Original rating field (might be legacy data)
  rating?: number | string;
  
  // Enhanced rating data from aggregates
  ratingData?: {
    totalRatings: number;
    avgOverallRating: number;
    avgQualityRating: number;
    avgDeliveryRating: number;
    avgCostRating: number;
    avgServiceRating: number;
    avgCommunicationRating: number;
    recommendationRate: number;
    vendorClassification: 'preferred' | 'approved' | 'conditional' | 'restricted' | 'unrated';
    riskLevel: 'low' | 'medium' | 'high';
    performanceTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
    lastRatedAt?: string;
    ratingDistribution: {
      excellent: number; // 4.5+
      good: number; // 3.5-4.4
      average: number; // 2.5-3.4
      poor: number; // <2.5
    };
  };
}

export function useVendorsWithRatings(params?: {
  status?: string;
  limit?: number;
  // Add other vendor filtering params as needed
}) {
  // Get vendors data
  const { 
    data: vendorsData, 
    isLoading: isLoadingVendors, 
    error: vendorsError 
  } = useVendors(params);

  // Get rating aggregates for all vendors
  const { 
    data: ratingsData, 
    isLoading: isLoadingRatings, 
    error: ratingsError 
  } = useVendorRatingAggregates({
    limit: 1000, // Get all rating aggregates
  });

  // Combine vendor data with rating aggregates
  const vendorsWithRatings = useMemo((): VendorWithRatings[] => {
    if (!vendorsData?.vendors) return [];

    const ratingAggregatesMap = new Map();
    if (ratingsData?.data) {
      ratingsData.data.forEach((aggregate) => {
        ratingAggregatesMap.set(aggregate.vendorId, aggregate);
      });
    }

    return vendorsData.vendors.map((vendor): VendorWithRatings => {
      const ratingAggregate = ratingAggregatesMap.get(vendor.id);
      
      return {
        ...vendor,
        ratingData: ratingAggregate ? {
          totalRatings: ratingAggregate.totalRatings,
          avgOverallRating: ratingAggregate.avgOverallRating,
          avgQualityRating: ratingAggregate.avgQualityRating,
          avgDeliveryRating: ratingAggregate.avgDeliveryRating,
          avgCostRating: ratingAggregate.avgCostRating,
          avgServiceRating: ratingAggregate.avgServiceRating,
          avgCommunicationRating: ratingAggregate.avgCommunicationRating,
          recommendationRate: ratingAggregate.recommendationRate,
          vendorClassification: ratingAggregate.vendorClassification,
          riskLevel: ratingAggregate.riskLevel,
          performanceTrend: ratingAggregate.performanceTrend,
          lastRatedAt: ratingAggregate.lastRatedAt,
          ratingDistribution: {
            excellent: ratingAggregate.excellentRatings,
            good: ratingAggregate.goodRatings,
            average: ratingAggregate.averageRatings,
            poor: ratingAggregate.poorRatings,
          },
        } : undefined,
      };
    });
  }, [vendorsData?.vendors, ratingsData?.data]);

  // Calculate enhanced statistics
  const enhancedStats = useMemo(() => {
    if (vendorsWithRatings.length === 0) {
      return {
        totalVendors: 0,
        ratedVendors: 0,
        avgOverallRating: 0,
        totalRatings: 0,
        preferredVendors: 0,
        approvedVendors: 0,
        conditionalVendors: 0,
        restrictedVendors: 0,
        unratedVendors: 0,
        highRiskVendors: 0,
        lowRiskVendors: 0,
        improvingVendors: 0,
        decliningVendors: 0,
      };
    }

    const ratedVendors = vendorsWithRatings.filter(v => v.ratingData && v.ratingData.totalRatings > 0);
    const totalRatings = ratedVendors.reduce((sum, v) => sum + (v.ratingData?.totalRatings || 0), 0);
    const avgRating = ratedVendors.length > 0 
      ? ratedVendors.reduce((sum, v) => sum + (v.ratingData?.avgOverallRating || 0), 0) / ratedVendors.length
      : 0;

    return {
      totalVendors: vendorsWithRatings.length,
      ratedVendors: ratedVendors.length,
      avgOverallRating: Math.round(avgRating * 10) / 10,
      totalRatings,
      preferredVendors: vendorsWithRatings.filter(v => v.ratingData?.vendorClassification === 'preferred').length,
      approvedVendors: vendorsWithRatings.filter(v => v.ratingData?.vendorClassification === 'approved').length,
      conditionalVendors: vendorsWithRatings.filter(v => v.ratingData?.vendorClassification === 'conditional').length,
      restrictedVendors: vendorsWithRatings.filter(v => v.ratingData?.vendorClassification === 'restricted').length,
      unratedVendors: vendorsWithRatings.filter(v => !v.ratingData || v.ratingData.vendorClassification === 'unrated').length,
      highRiskVendors: vendorsWithRatings.filter(v => v.ratingData?.riskLevel === 'high').length,
      lowRiskVendors: vendorsWithRatings.filter(v => v.ratingData?.riskLevel === 'low').length,
      improvingVendors: vendorsWithRatings.filter(v => v.ratingData?.performanceTrend === 'improving').length,
      decliningVendors: vendorsWithRatings.filter(v => v.ratingData?.performanceTrend === 'declining').length,
    };
  }, [vendorsWithRatings]);

  return {
    vendors: vendorsWithRatings,
    stats: enhancedStats,
    isLoading: isLoadingVendors || isLoadingRatings,
    error: vendorsError || ratingsError,
    isLoadingVendors,
    isLoadingRatings,
    vendorsError,
    ratingsError,
  };
}