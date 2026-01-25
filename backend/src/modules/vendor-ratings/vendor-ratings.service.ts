import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { CreateVendorRatingDto, UpdateVendorRatingDto, VendorRatingQueryDto, VendorRatingAggregateQueryDto } from './dto';

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface VendorRating {
  id: string;
  vendor_id: string;
  project_id?: string;
  user_email: string;
  quality_rating?: number;
  delivery_rating?: number;
  cost_rating?: number;
  service_rating?: number;
  communication_rating?: number;
  overall_rating?: number;
  comments?: string;
  would_recommend?: boolean;
  contract_value?: number;
  delivery_date?: string;
  actual_delivery_date?: string;
  rating_type: string;
  created_at: string;
  updated_at: string;
}

export interface VendorRatingAggregate {
  vendor_id: string;
  vendor_name: string;
  supplier_code: string;
  city: string;
  state: string;
  country: string;
  total_ratings: number;
  avg_overall_rating: number;
  avg_quality_rating: number;
  avg_delivery_rating: number;
  avg_cost_rating: number;
  avg_service_rating: number;
  avg_communication_rating: number;
  excellent_ratings: number;
  good_ratings: number;
  average_ratings: number;
  poor_ratings: number;
  recommendation_rate: number;
  recent_avg_rating: number;
  performance_trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  vendor_classification: 'preferred' | 'approved' | 'conditional' | 'restricted' | 'unrated';
  risk_level: 'low' | 'medium' | 'high';
  last_rated_at: string;
}

@Injectable()
export class VendorRatingsService {
  constructor(private supabaseService: SupabaseService) {}

  async create(createVendorRatingDto: CreateVendorRatingDto, userToken?: string): Promise<VendorRating> {
    const supabase = this.supabaseService.getClient(userToken);

    // Validate that the user hasn't already rated this vendor recently
    const isValidRating = await this.validateRating(
      createVendorRatingDto.vendorId,
      createVendorRatingDto.userEmail,
      createVendorRatingDto.projectId,
      createVendorRatingDto.ratingType || 'project_completion',
      userToken,
    );

    if (!isValidRating) {
      throw new BadRequestException(
        'You have already rated this vendor for this project/context within the last 30 days',
      );
    }

    // Insert the rating
    const { data, error } = await supabase
      .from('vendor_ratings')
      .insert([
        {
          vendor_id: createVendorRatingDto.vendorId,
          project_id: createVendorRatingDto.projectId,
          user_email: createVendorRatingDto.userEmail,
          quality_rating: createVendorRatingDto.qualityRating,
          delivery_rating: createVendorRatingDto.deliveryRating,
          cost_rating: createVendorRatingDto.costRating,
          service_rating: createVendorRatingDto.serviceRating,
          communication_rating: createVendorRatingDto.communicationRating,
          comments: createVendorRatingDto.comments,
          would_recommend: createVendorRatingDto.wouldRecommend,
          contract_value: createVendorRatingDto.contractValue,
          delivery_date: createVendorRatingDto.deliveryDate,
          actual_delivery_date: createVendorRatingDto.actualDeliveryDate,
          rating_type: createVendorRatingDto.ratingType || 'project_completion',
        },
      ])
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create rating: ${error.message}`);
    }

    // Refresh materialized view
    await this.refreshRatingAggregates();

    return data;
  }

  async findAll(query: VendorRatingQueryDto, userToken?: string): Promise<PaginatedResponse<VendorRating>> {
    const supabase = this.supabaseService.getClient(userToken);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let queryBuilder = supabase.from('vendor_ratings').select('*', { count: 'exact' });

    // Apply filters
    if (query.vendorId) {
      queryBuilder = queryBuilder.eq('vendor_id', query.vendorId);
    }
    if (query.projectId) {
      queryBuilder = queryBuilder.eq('project_id', query.projectId);
    }
    if (query.userEmail) {
      queryBuilder = queryBuilder.eq('user_email', query.userEmail);
    }
    if (query.ratingType) {
      queryBuilder = queryBuilder.eq('rating_type', query.ratingType);
    }
    if (query.fromDate) {
      queryBuilder = queryBuilder.gte('created_at', query.fromDate);
    }
    if (query.toDate) {
      queryBuilder = queryBuilder.lte('created_at', query.toDate);
    }

    // Apply pagination and ordering
    const { data, error, count } = await queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new BadRequestException(`Failed to fetch ratings: ${error.message}`);
    }

    const total = count || 0;
    return {
      data: data || [],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAggregates(query: VendorRatingAggregateQueryDto, userToken?: string): Promise<PaginatedResponse<VendorRatingAggregate>> {
    const supabase = this.supabaseService.getClient(userToken);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let queryBuilder = supabase.from('vendor_rating_aggregates').select('*', { count: 'exact' });

    // Apply filters
    if (query.classification) {
      queryBuilder = queryBuilder.eq('vendor_classification', query.classification);
    }
    if (query.riskLevel) {
      queryBuilder = queryBuilder.eq('risk_level', query.riskLevel);
    }
    if (query.performanceTrend) {
      queryBuilder = queryBuilder.eq('performance_trend', query.performanceTrend);
    }
    if (query.minOverallRating) {
      queryBuilder = queryBuilder.gte('avg_overall_rating', parseFloat(query.minOverallRating));
    }
    if (query.maxOverallRating) {
      queryBuilder = queryBuilder.lte('avg_overall_rating', parseFloat(query.maxOverallRating));
    }
    if (query.minTotalRatings) {
      queryBuilder = queryBuilder.gte('total_ratings', query.minTotalRatings);
    }
    if (query.search) {
      queryBuilder = queryBuilder.ilike('vendor_name', `%${query.search}%`);
    }
    if (query.city) {
      queryBuilder = queryBuilder.eq('city', query.city);
    }
    if (query.state) {
      queryBuilder = queryBuilder.eq('state', query.state);
    }
    if (query.country) {
      queryBuilder = queryBuilder.eq('country', query.country);
    }

    // Apply sorting and pagination
    const sortBy = query.sortBy || 'avg_overall_rating';
    const sortOrder = query.sortOrder || 'DESC';
    
    const { data, error, count } = await queryBuilder
      .order(sortBy, { ascending: sortOrder === 'ASC' })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new BadRequestException(`Failed to fetch rating aggregates: ${error.message}`);
    }

    const total = count || 0;
    return {
      data: data || [],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userToken?: string): Promise<VendorRating> {
    const supabase = this.supabaseService.getClient(userToken);

    const { data, error } = await supabase
      .from('vendor_ratings')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException(`Vendor rating with ID ${id} not found`);
    }

    return data;
  }

  async findByVendor(vendorId: string, userToken?: string): Promise<VendorRating[]> {
    const supabase = this.supabaseService.getClient(userToken);

    const { data, error } = await supabase
      .from('vendor_ratings')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Failed to fetch vendor ratings: ${error.message}`);
    }

    return data || [];
  }

  async getVendorAggregate(vendorId: string, userToken?: string): Promise<VendorRatingAggregate | null> {
    const supabase = this.supabaseService.getClient(userToken);

    const { data, error } = await supabase
      .from('vendor_rating_aggregates')
      .select('*')
      .eq('vendor_id', vendorId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw new BadRequestException(`Failed to fetch vendor aggregate: ${error.message}`);
    }

    return data || null;
  }

  async update(id: string, updateVendorRatingDto: UpdateVendorRatingDto, userToken?: string): Promise<VendorRating> {
    const supabase = this.supabaseService.getClient(userToken);

    const { data, error } = await supabase
      .from('vendor_ratings')
      .update({
        quality_rating: updateVendorRatingDto.qualityRating,
        delivery_rating: updateVendorRatingDto.deliveryRating,
        cost_rating: updateVendorRatingDto.costRating,
        service_rating: updateVendorRatingDto.serviceRating,
        communication_rating: updateVendorRatingDto.communicationRating,
        comments: updateVendorRatingDto.comments,
        would_recommend: updateVendorRatingDto.wouldRecommend,
        contract_value: updateVendorRatingDto.contractValue,
        delivery_date: updateVendorRatingDto.deliveryDate,
        actual_delivery_date: updateVendorRatingDto.actualDeliveryDate,
        rating_type: updateVendorRatingDto.ratingType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new NotFoundException(`Failed to update rating: ${error.message}`);
    }

    // Refresh materialized view
    await this.refreshRatingAggregates();

    return data;
  }

  async remove(id: string, userToken?: string): Promise<void> {
    const supabase = this.supabaseService.getClient(userToken);

    const { error } = await supabase
      .from('vendor_ratings')
      .delete()
      .eq('id', id);

    if (error) {
      throw new NotFoundException(`Failed to delete rating: ${error.message}`);
    }

    // Refresh materialized view
    await this.refreshRatingAggregates();
  }

  async getVendorStats(vendorId: string, userToken?: string): Promise<{
    totalRatings: number;
    averageRating: number;
    ratingBreakdown: Record<string, number>;
    recentTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  }> {
    const aggregate = await this.getVendorAggregate(vendorId, userToken);
    
    if (!aggregate) {
      return {
        totalRatings: 0,
        averageRating: 0,
        ratingBreakdown: {
          quality: 0,
          delivery: 0,
          cost: 0,
          service: 0,
          communication: 0,
        },
        recentTrend: 'insufficient_data',
      };
    }

    return {
      totalRatings: aggregate.total_ratings,
      averageRating: aggregate.avg_overall_rating,
      ratingBreakdown: {
        quality: aggregate.avg_quality_rating,
        delivery: aggregate.avg_delivery_rating,
        cost: aggregate.avg_cost_rating,
        service: aggregate.avg_service_rating,
        communication: aggregate.avg_communication_rating,
      },
      recentTrend: aggregate.performance_trend,
    };
  }

  async getTopPerformingVendors(limit: number = 10, userToken?: string): Promise<VendorRatingAggregate[]> {
    const supabase = this.supabaseService.getClient(userToken);

    const { data, error } = await supabase
      .from('vendor_rating_aggregates')
      .select('*')
      .gt('total_ratings', 0) // Only vendors with ratings
      .order('avg_overall_rating', { ascending: false })
      .limit(limit);

    if (error) {
      throw new BadRequestException(`Failed to fetch top performers: ${error.message}`);
    }

    return data || [];
  }

  async getRatingTrends(vendorId: string, months: number = 12, userToken?: string): Promise<{
    labels: string[];
    avgRatings: number[];
    ratingCounts: number[];
  }> {
    const supabase = this.supabaseService.getClient(userToken);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data, error } = await supabase
      .from('vendor_ratings')
      .select('created_at, overall_rating')
      .eq('vendor_id', vendorId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to fetch rating trends: ${error.message}`);
    }

    // Group by month and calculate averages
    const monthlyData = new Map<string, { ratings: number[]; count: number }>();

    (data || []).forEach((rating) => {
      const monthKey = rating.created_at.substring(0, 7); // YYYY-MM
      const overallRating = rating.overall_rating;

      if (overallRating) {
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { ratings: [], count: 0 });
        }
        monthlyData.get(monthKey)!.ratings.push(overallRating);
        monthlyData.get(monthKey)!.count++;
      }
    });

    const labels: string[] = [];
    const avgRatings: number[] = [];
    const ratingCounts: number[] = [];

    monthlyData.forEach((data, monthKey) => {
      labels.push(monthKey);
      const average = data.ratings.reduce((sum, rating) => sum + rating, 0) / data.ratings.length;
      avgRatings.push(Math.round(average * 10) / 10);
      ratingCounts.push(data.count);
    });

    return { labels, avgRatings, ratingCounts };
  }

  private async validateRating(
    vendorId: string,
    userEmail: string,
    projectId?: string,
    ratingType: string = 'project_completion',
    userToken?: string,
  ): Promise<boolean> {
    const supabase = this.supabaseService.getClient(userToken);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let queryBuilder = supabase
      .from('vendor_ratings')
      .select('id')
      .eq('vendor_id', vendorId)
      .eq('user_email', userEmail)
      .eq('rating_type', ratingType)
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (projectId) {
      queryBuilder = queryBuilder.eq('project_id', projectId);
    }

    const { data, error } = await queryBuilder.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      // If there's an actual error (not just no rows), return false to be safe
      return false;
    }

    return !data; // Return true if no existing rating found
  }

  private async refreshRatingAggregates(): Promise<void> {
    try {
      const supabase = this.supabaseService.getAdminClient();
      // Call the refresh function we created in the migration
      const { error } = await supabase.rpc('refresh_vendor_rating_aggregates');
      
      if (error) {
        console.error('Failed to refresh vendor rating aggregates:', error);
      }
    } catch (error) {
      console.error('Failed to refresh vendor rating aggregates:', error);
    }
  }
}