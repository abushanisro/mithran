/**
 * Clean Supplier Nomination Dashboard
 * Production-ready component for B2B Enterprise SaaS
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  Award,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Shield,
  Zap,
  Edit2,
  Save,
  X,
  Plus,
  Search
} from 'lucide-react';
import { toast } from 'sonner';

import {
  useNomination,
  useNominationAnalytics,
  useUpdateScores,
  useAddVendor,
  useUpdateCostAnalysis,
  useUpdateRatingEngine
} from '@/lib/hooks/useSupplierNominations';

import {
  calculateOverallScore,
  getRiskColor,
  getRecommendationColor,
  type VendorEvaluation,
  type CostAnalysis,
  type RatingEngine
} from '@/lib/api/supplier-nominations-clean';

// ============================================================================
// TYPES
// ============================================================================

interface NominationDashboardProps {
  nominationId: string;
  projectId: string;
}

interface WeightConfig {
  costWeight: number;
  vendorWeight: number;
  capabilityWeight: number;
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: number;
  weight: number;
  isEditing: boolean;
  onWeightChange: (value: number) => void;
  icon: React.ReactNode;
  color: string;
}

function MetricCard({ title, value, weight, isEditing, onWeightChange, icon, color }: MetricCardProps) {
  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-sm font-medium text-gray-300">
              {title}
              {isEditing ? (
                <Input
                  type="number"
                  value={weight}
                  onChange={(e) => onWeightChange(parseInt(e.target.value) || 0)}
                  className="w-12 h-6 ml-2 text-xs bg-gray-700 border-gray-600 text-center"
                  min="0"
                  max="100"
                />
              ) : (
                <span className="ml-1">({weight}%)</span>
              )}
            </h3>
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-2">
          {value.toFixed(1)}%
        </div>
        <Progress 
          value={value} 
          className="h-2 bg-gray-700"
        />
      </CardContent>
    </Card>
  );
}

// Vendor Evaluation Card
interface VendorCardProps {
  evaluation: VendorEvaluation;
  weights: WeightConfig;
  onUpdateScores: (scores: any[]) => void;
  onUpdateCost: (costData: CostAnalysis) => void;
  onUpdateRating: (ratingData: RatingEngine) => void;
}

function VendorCard({ evaluation, weights, onUpdateScores, onUpdateCost, onUpdateRating }: VendorCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    costPerUnit: evaluation.cost_analysis?.cost_per_unit || 0,
    overallRating: evaluation.rating_engine?.overall_rating || 0,
    technicalScore: evaluation.technical_score || 0,
  });

  const overallScore = calculateOverallScore(
    evaluation.cost_score,
    evaluation.vendor_rating_score,
    evaluation.capability_score,
    weights.costWeight,
    weights.vendorWeight,
    weights.capabilityWeight
  );

  const handleSave = () => {
    // Update cost analysis
    onUpdateCost({
      cost_per_unit: editData.costPerUnit,
      cost_competitiveness: editData.costPerUnit > 0 ? Math.min(100, (1000 / editData.costPerUnit) * 10) : 0
    });

    // Update rating engine
    onUpdateRating({
      overall_rating: editData.overallRating,
      quality_rating: editData.overallRating * 0.9,
      delivery_rating: editData.overallRating * 1.1
    });

    setIsEditing(false);
    toast.success('Vendor evaluation updated');
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              evaluation.final_rank === 1 ? 'text-green-400 bg-green-400/20' : 'text-gray-400 bg-gray-400/20'
            }`}>
              #{evaluation.final_rank || '?'}
            </div>
            <div>
              <CardTitle className="text-white">
                Vendor {evaluation.vendor_id.slice(-4)}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="outline"
                  className={`border-${getRecommendationColor(evaluation.recommendation)}-500 text-${getRecommendationColor(evaluation.recommendation)}-400`}
                >
                  {evaluation.recommendation.toUpperCase()}
                </Badge>
                <Badge 
                  variant="outline"
                  className={`border-${getRiskColor(evaluation.risk_level)}-500 text-${getRiskColor(evaluation.risk_level)}-400`}
                >
                  {evaluation.risk_level.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-white">
              {overallScore.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-400">Overall Score</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score Breakdown */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-white">
              {evaluation.cost_score.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400">Cost ({weights.costWeight}%)</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-white">
              {evaluation.vendor_rating_score.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400">Rating ({weights.vendorWeight}%)</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-white">
              {evaluation.capability_score.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-400">Capability ({weights.capabilityWeight}%)</div>
          </div>
        </div>

        {/* Editable Fields */}
        {isEditing ? (
          <div className="space-y-3 p-3 bg-gray-700/50 rounded-lg">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cost Per Unit</label>
              <Input
                type="number"
                value={editData.costPerUnit}
                onChange={(e) => setEditData(prev => ({ ...prev, costPerUnit: parseFloat(e.target.value) || 0 }))}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Overall Rating (0-100)</label>
              <Input
                type="number"
                value={editData.overallRating}
                onChange={(e) => setEditData(prev => ({ ...prev, overallRating: parseFloat(e.target.value) || 0 }))}
                className="bg-gray-700 border-gray-600 text-white"
                min="0"
                max="100"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                <Save className="h-3 w-3 mr-1" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-3 w-3 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-400">
              Cost: ${evaluation.cost_analysis?.cost_per_unit?.toFixed(2) || '0.00'} | 
              Rating: {evaluation.rating_engine?.overall_rating?.toFixed(0) || '0'}/100
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsEditing(true)}
              className="border-gray-600 text-gray-300"
            >
              <Edit2 className="h-3 w-3 mr-1" /> Edit
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NominationDashboard({ nominationId, projectId }: NominationDashboardProps) {
  const { data: nominationData, isLoading } = useNomination(nominationId);
  const { data: analytics } = useNominationAnalytics(nominationId);
  const updateScoresMutation = useUpdateScores();
  const updateCostMutation = useUpdateCostAnalysis();
  const updateRatingMutation = useUpdateRatingEngine();

  const [weights, setWeights] = useState<WeightConfig>({
    costWeight: 70,
    vendorWeight: 20,
    capabilityWeight: 10
  });
  const [isEditingWeights, setIsEditingWeights] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!nominationData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white">Nomination Not Found</h3>
      </div>
    );
  }

  const { nomination, evaluations = [] } = nominationData;

  // Calculate average scores
  const avgScores = evaluations.reduce(
    (acc, eval) => ({
      cost: acc.cost + eval.cost_score,
      vendor: acc.vendor + eval.vendor_rating_score,
      capability: acc.capability + eval.capability_score
    }),
    { cost: 0, vendor: 0, capability: 0 }
  );

  const evalCount = evaluations.length || 1;
  const averages = {
    cost: avgScores.cost / evalCount,
    vendor: avgScores.vendor / evalCount,
    capability: avgScores.capability / evalCount
  };

  const handleWeightChange = (type: keyof WeightConfig, value: number) => {
    const newWeights = { ...weights, [type]: value };
    const total = newWeights.costWeight + newWeights.vendorWeight + newWeights.capabilityWeight;
    
    if (total !== 100) {
      const remaining = 100 - value;
      const otherKeys = Object.keys(newWeights).filter(key => key !== type) as (keyof WeightConfig)[];
      const otherTotal = otherKeys.reduce((sum, key) => sum + weights[key], 0);
      
      if (otherTotal > 0) {
        otherKeys.forEach(key => {
          newWeights[key] = Math.round((weights[key] / otherTotal) * remaining);
        });
      }
    }
    
    setWeights(newWeights);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">{nomination.name}</h1>
          <p className="text-gray-400 mt-1">{nomination.description}</p>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="outline">{nomination.status.toUpperCase()}</Badge>
            <span className="text-gray-400 text-sm">
              {evaluations.length} vendor{evaluations.length !== 1 ? 's' : ''} evaluated
            </span>
          </div>
        </div>

        {!isEditingWeights ? (
          <Button
            variant="outline"
            onClick={() => setIsEditingWeights(true)}
            className="border-gray-600 text-gray-300"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Weights
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setWeights({ costWeight: 70, vendorWeight: 20, capabilityWeight: 10 })}
              className="border-gray-600 text-gray-300"
            >
              Reset
            </Button>
            <Button
              onClick={() => setIsEditingWeights(false)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Done
            </Button>
          </div>
        )}
      </div>

      {/* Weight Status */}
      {isEditingWeights && (
        <Card className="bg-blue-900/20 border-blue-700">
          <CardContent className="p-4">
            <div className="text-sm text-blue-300">
              Total: <span className={`font-medium ${
                weights.costWeight + weights.vendorWeight + weights.capabilityWeight === 100 
                  ? 'text-green-400' 
                  : 'text-yellow-400'
              }`}>
                {weights.costWeight + weights.vendorWeight + weights.capabilityWeight}%
              </span>
              {weights.costWeight + weights.vendorWeight + weights.capabilityWeight !== 100 && (
                <span className="text-yellow-400 ml-2">(Should equal 100%)</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Cost Competency"
          value={averages.cost}
          weight={weights.costWeight}
          isEditing={isEditingWeights}
          onWeightChange={(value) => handleWeightChange('costWeight', value)}
          icon={<DollarSign className="h-5 w-5 text-green-400" />}
          color="green"
        />
        <MetricCard
          title="Vendor Rating"
          value={averages.vendor}
          weight={weights.vendorWeight}
          isEditing={isEditingWeights}
          onWeightChange={(value) => handleWeightChange('vendorWeight', value)}
          icon={<Shield className="h-5 w-5 text-blue-400" />}
          color="blue"
        />
        <MetricCard
          title="Technical Capability"
          value={averages.capability}
          weight={weights.capabilityWeight}
          isEditing={isEditingWeights}
          onWeightChange={(value) => handleWeightChange('capabilityWeight', value)}
          icon={<Zap className="h-5 w-5 text-purple-400" />}
          color="purple"
        />
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">{analytics.total_vendors}</div>
              <div className="text-sm text-gray-400">Total Vendors</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{analytics.recommendations.approved}</div>
              <div className="text-sm text-gray-400">Approved</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{analytics.recommendations.conditional}</div>
              <div className="text-sm text-gray-400">Conditional</div>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{analytics.avg_overall_score.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Avg Score</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vendor Evaluations */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Vendor Evaluations</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {evaluations.map((evaluation) => (
            <VendorCard
              key={evaluation.id}
              evaluation={evaluation}
              weights={weights}
              onUpdateScores={(scores) => updateScoresMutation.mutate({ evaluationId: evaluation.id, scores })}
              onUpdateCost={(costData) => updateCostMutation.mutate({ evaluationId: evaluation.id, costData })}
              onUpdateRating={(ratingData) => updateRatingMutation.mutate({ evaluationId: evaluation.id, ratingData })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}