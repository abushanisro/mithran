'use client';

import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StarRating } from '@/components/ui/star-rating';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Star } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface VendorRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: {
    id: string;
    name?: string;
    companyName?: string;
    supplierCode?: string;
    city?: string;
    state?: string;
  };
  projectId?: string;
  onSubmitRating?: (ratingData: VendorRatingData) => Promise<void>;
}

export interface VendorRatingData {
  vendorId: string;
  projectId?: string;
  qualityRating?: number;
  deliveryRating?: number;
  costRating?: number;
  serviceRating?: number;
  communicationRating?: number;
  comments?: string;
  wouldRecommend?: boolean;
  ratingType?: 'project_completion' | 'ongoing_relationship' | 'rfq_response' | 'sample_evaluation';
}

export function VendorRatingModal({ 
  isOpen, 
  onClose, 
  vendor, 
  projectId,
  onSubmitRating 
}: VendorRatingModalProps) {
  const [ratings, setRatings] = useState({
    quality: 0,
    delivery: 0,
    cost: 0,
    service: 0,
    communication: 0,
  });
  const [comments, setComments] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ratingCategories = [
    { 
      key: 'quality', 
      label: 'Quality', 
      description: 'Product quality and craftsmanship',
      icon: '🎯'
    },
    { 
      key: 'delivery', 
      label: 'Delivery', 
      description: 'On-time delivery and logistics',
      icon: '🚚'
    },
    { 
      key: 'cost', 
      label: 'Cost Effectiveness', 
      description: 'Value for money and pricing',
      icon: '💰'
    },
    { 
      key: 'service', 
      label: 'Service', 
      description: 'Customer service and support',
      icon: '🤝'
    },
    { 
      key: 'communication', 
      label: 'Communication', 
      description: 'Responsiveness and clarity',
      icon: '📞'
    },
  ];

  const handleRatingChange = (category: string, rating: number) => {
    setRatings(prev => ({
      ...prev,
      [category]: rating,
    }));
  };

  const handleSubmit = async () => {
    // Validate at least one rating
    const hasAtLeastOneRating = Object.values(ratings).some(rating => rating > 0);
    if (!hasAtLeastOneRating) {
      toast.error('Please provide at least one rating');
      return;
    }

    setIsSubmitting(true);

    try {
      const ratingData: VendorRatingData = {
        vendorId: vendor.id,
        projectId,
        qualityRating: ratings.quality || undefined,
        deliveryRating: ratings.delivery || undefined,
        costRating: ratings.cost || undefined,
        serviceRating: ratings.service || undefined,
        communicationRating: ratings.communication || undefined,
        comments: comments.trim() || undefined,
        wouldRecommend: wouldRecommend !== null ? wouldRecommend : undefined,
        ratingType: 'project_completion',
      };

      if (onSubmitRating) {
        await onSubmitRating(ratingData);
      }

      // Show success message
      toast.success('Rating submitted successfully!');
      
      // Reset form and close
      setRatings({ quality: 0, delivery: 0, cost: 0, service: 0, communication: 0 });
      setComments('');
      setWouldRecommend(null);
      onClose();

    } catch (error) {
      console.error('Failed to submit rating:', error);
      toast.error('Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const overallRating = Object.values(ratings).filter(r => r > 0).length > 0 
    ? Object.values(ratings).reduce((sum, rating) => sum + rating, 0) / Object.values(ratings).filter(r => r > 0).length
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            Rate Vendor Performance
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Share your experience working with this vendor to help improve future sourcing decisions.
          </DialogDescription>
        </DialogHeader>

        {/* Vendor Info */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-600/20">
              <Building2 className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">
                {vendor.name || vendor.companyName || 'Unknown Vendor'}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                {vendor.supplierCode && (
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                    {vendor.supplierCode}
                  </Badge>
                )}
                {(vendor.city || vendor.state) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    <span>{vendor.city}{vendor.city && vendor.state && ', '}{vendor.state}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Overall Rating Preview */}
        {overallRating > 0 && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-center">
              <Label className="text-white text-sm font-medium">Overall Rating Preview</Label>
              <div className="mt-2 flex items-center justify-center gap-2">
                <StarRating 
                  rating={overallRating} 
                  readonly={true} 
                  size="lg" 
                  showValue={true}
                  className="text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Rating Categories */}
        <div className="space-y-4">
          <Label className="text-white text-base font-medium">Rate each category (1-5 stars)</Label>
          
          {ratingCategories.map((category) => (
            <div key={category.key} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{category.icon}</span>
                  <div>
                    <Label className="text-white font-medium">{category.label}</Label>
                    <p className="text-xs text-gray-400">{category.description}</p>
                  </div>
                </div>
                <StarRating 
                  rating={ratings[category.key as keyof typeof ratings]}
                  onRatingChange={(rating) => handleRatingChange(category.key, rating)}
                  size="md"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Comments */}
        <div className="space-y-2">
          <Label className="text-white">Additional Comments (Optional)</Label>
          <Textarea
            placeholder="Share your detailed experience, feedback, or suggestions..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 min-h-[100px]"
            maxLength={1000}
          />
          <p className="text-xs text-gray-400">{comments.length}/1000 characters</p>
        </div>

        {/* Recommendation */}
        <div className="space-y-3">
          <Label className="text-white">Would you recommend this vendor?</Label>
          <div className="flex gap-3">
            <Button
              variant={wouldRecommend === true ? "default" : "outline"}
              size="sm"
              onClick={() => setWouldRecommend(true)}
              className={wouldRecommend === true 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "border-gray-600 text-gray-300 hover:bg-gray-700"
              }
            >
              👍 Yes, Recommend
            </Button>
            <Button
              variant={wouldRecommend === false ? "default" : "outline"}
              size="sm"
              onClick={() => setWouldRecommend(false)}
              className={wouldRecommend === false 
                ? "bg-red-600 hover:bg-red-700 text-white" 
                : "border-gray-600 text-gray-300 hover:bg-gray-700"
              }
            >
              👎 Not Recommend
            </Button>
            {wouldRecommend !== null && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWouldRecommend(null)}
                className="text-gray-400 hover:text-white hover:bg-gray-700"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            className="bg-teal-600 hover:bg-teal-700 text-white"
            disabled={isSubmitting || Object.values(ratings).every(r => r === 0)}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}