'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Star, MapPin, Clock, Building2, Send, Package, Users, FileText, TrendingUp, Award, Mail, Globe, Phone, Box, Eye, ArrowLeft, X, Check, UserCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useVendors, Vendor } from '@/lib/api/hooks/useVendors';
import { useCreateRfq, useSendRfq } from '@/lib/api/hooks/useRfq';
import { useRfqTrackingRecords, useRfqTrackingStats, useInvalidateRfqTracking, useUpdateRfqTrackingStatus, useDeleteRfqTracking } from '@/lib/api/hooks/useRfqTracking';
import { getRfqSummaryText, formatResponseTime, getStatusText, getStatusColor } from '@/lib/api/rfq-tracking';
import { analyzeTrackingFeature, getFeatureStatusMessage, TrackingFeatureState } from '@/lib/api/features/tracking-feature';

interface BOMPart {
  id: string;
  partNumber: string;
  description: string;
  category: string;
  process: string;
  quantity: number;
  price?: number;
  file2dPath?: string;
  file3dPath?: string;
}

// Use the real vendor interface from API - no custom mock interface needed

interface EvaluationGroupViewProps {
  projectId: string;
  bomParts: BOMPart[];
  evaluationGroupName?: string;
  onViewFile?: (part: BOMPart, fileType: '2d' | '3d') => void;
  onBack?: () => void;
}

export function EvaluationGroupView({ projectId, bomParts, evaluationGroupName, onViewFile, onBack }: EvaluationGroupViewProps) {
  // State declarations first
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [partsSearchTerm, setPartsSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [approveModalOpen, setApproveModalOpen] = useState<string | null>(null);
  const [selectedApproveVendors, setSelectedApproveVendors] = useState<string[]>([]);
  // Remove local state - use database-backed tracking
  // const [sentRfqs, setSentRfqs] = useState<...>([]);

  // Fetch vendors from API
  const { 
    data: vendorsResponse, 
    isLoading: isLoadingVendors 
  } = useVendors({
    status: 'active',
    limit: 1000
  });
  
  const vendors = vendorsResponse?.vendors || [];
  
  // Production-ready RFQ tracking with graceful degradation
  const { 
    data: rfqTrackingRecords = [], 
    isLoading: isLoadingTracking,
    error: trackingError 
  } = useRfqTrackingRecords(projectId);
  const { 
    data: rfqStats = { totalSent: 0, totalResponded: 0, totalCompleted: 0, avgResponseTime: 0, recentActivity: 0 },
    error: statsError 
  } = useRfqTrackingStats(projectId);
  
  // Production-ready feature detection
  const trackingFeatureStatus = analyzeTrackingFeature(
    trackingError,
    statsError,
    rfqTrackingRecords.length > 0
  );
  
  const shouldShowTracking = trackingFeatureStatus.isEnabled && rfqTrackingRecords.length > 0;
  const shouldShowFeatureNotice = !trackingFeatureStatus.isEnabled;
  const featureStatusMessage = getFeatureStatusMessage(trackingFeatureStatus);
  
  // Check if tracking is available for cache invalidation
  const isTrackingAvailable = trackingFeatureStatus.isEnabled;
  
  // RFQ mutations and cache invalidation
  const createRfqMutation = useCreateRfq();
  const sendRfqMutation = useSendRfq();
  const updateTrackingStatusMutation = useUpdateRfqTrackingStatus(projectId);
  const deleteTrackingMutation = useDeleteRfqTracking(projectId);
  const invalidateRfqTracking = useInvalidateRfqTracking();
  
  // Removed vendor rating functionality - can be added later in supplier nomination

  // Overview stats
  const stats = useMemo(() => ({
    totalParts: bomParts.length,
    activeVendors: vendors.length || 0,
    availableVendors: vendors.filter(v => v.status === 'active').length || 0,
    sentRfqCount: rfqStats?.totalSent || 0,
  }), [bomParts, vendors, rfqStats]);

  // Filter parts by search and category
  const filteredParts = useMemo(() => {
    let filtered = bomParts;
    
    if (partsSearchTerm) {
      const search = partsSearchTerm.toLowerCase();
      filtered = filtered.filter(part =>
        part.partNumber.toLowerCase().includes(search) ||
        part.description.toLowerCase().includes(search) ||
        part.category.toLowerCase().includes(search) ||
        part.process.toLowerCase().includes(search)
      );
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(part => part.category === selectedCategory);
    }

    return filtered;
  }, [bomParts, partsSearchTerm, selectedCategory]);

  // Get unique categories for filtering
  const categories = useMemo(() => {
    const cats = new Set(bomParts.map(part => part.category));
    return ['All', ...Array.from(cats)];
  }, [bomParts]);

  // Filter vendors based on selected parts - CLIENT-SIDE ANY MATCHING using real API data
  const matchedVendors = useMemo(() => {
    if (selectedParts.length === 0) return [];

    const selectedPartsData = bomParts.filter(part => selectedParts.includes(part.id));
    const requiredProcesses = selectedPartsData.map(part => part.process.toLowerCase()).filter(p => p && p !== 'no process');

    // If no processes or all are "no process", show all active vendors
    if (requiredProcesses.length === 0) {
      return vendors; // All vendors are already filtered as active by API
    }

    return vendors.filter(vendor => {
      // Handle real API vendor structure - vendor.process might be array or string
      const vendorProcesses = Array.isArray(vendor.process) 
        ? vendor.process 
        : vendor.process ? [vendor.process] : [];

      if (vendorProcesses.length === 0) {
        return true; // Include vendors without process data as potential matches
      }

      return vendorProcesses.some((vendorProcess: string) => {
        if (!vendorProcess || typeof vendorProcess !== 'string') return false;
        
        const vp = vendorProcess.toLowerCase();
        return requiredProcesses.some(reqProcess => {
          // Direct match or contains match
          if (vp.includes(reqProcess) || reqProcess.includes(vp)) return true;
          
          // Fallback matches for common process variations
          if (reqProcess === 'manufacturing' && (vp.includes('manufactur') || vp.includes('fabricat'))) return true;
          if (reqProcess === 'assembly' && vp.includes('assembly')) return true;
          if (reqProcess === 'machining' && (vp.includes('machin') || vp.includes('cnc') || vp.includes('turning') || vp.includes('milling'))) return true;
          if (reqProcess === 'casting' && (vp.includes('cast') || vp.includes('foundry'))) return true;
          
          return false;
        });
      });
    });
  }, [selectedParts, bomParts, vendors]);

  // Get category filter buttons
  const categoryButtons = categories.map(cat => ({
    label: cat,
    count: cat === 'All' ? bomParts.length : bomParts.filter(p => p.category === cat).length,
    isActive: selectedCategory === cat
  }));

  const handlePartToggle = (partId: string, checked: boolean) => {
    setSelectedParts(prev =>
      checked ? [...prev, partId] : prev.filter(id => id !== partId)
    );
  };

  const handleVendorToggle = (vendorId: string, checked: boolean) => {
    setSelectedVendors(prev =>
      checked ? [...prev, vendorId] : prev.filter(id => id !== vendorId)
    );
  };

  const selectedVendorData = vendors.filter(v => selectedVendors.includes(v.id));

  // RFQ tracking action handlers
  const handleCancelRfq = async (trackingId: string) => {
    if (!confirm('Are you sure you want to cancel this RFQ? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteTrackingMutation.mutateAsync(trackingId);
      toast.success('RFQ cancelled and removed from tracking');
    } catch (error) {
      console.error('Delete RFQ error:', error);
      toast.error('Failed to cancel RFQ. Please try again.');
    }
  };

  const handleDeleteEvaluationRfq = async (trackingId: string) => {
    if (!confirm('Are you sure you want to delete this RFQ under evaluation?\n\nThis will permanently remove the RFQ tracking record and all evaluation data. This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteTrackingMutation.mutateAsync(trackingId);
      toast.success('RFQ evaluation deleted and removed from tracking');
    } catch (error) {
      console.error('Delete RFQ error:', error);
      toast.error('Failed to delete RFQ evaluation. Please try again.');
    }
  };

  const handleApproveRfq = (trackingId: string, trackingVendors: any[]) => {
    setApproveModalOpen(trackingId);
    setSelectedApproveVendors(trackingVendors.map(v => v.id));
  };

  const handleConfirmApproval = async () => {
    if (!approveModalOpen) return;
    
    try {
      await updateTrackingStatusMutation.mutateAsync({
        trackingId: approveModalOpen,
        data: { status: 'evaluated' }
      });
      toast.success(`RFQ approved with ${selectedApproveVendors.length} selected vendor${selectedApproveVendors.length !== 1 ? 's' : ''}`);
      setApproveModalOpen(null);
      setSelectedApproveVendors([]);
      // Cache automatically updated by mutation
    } catch (error) {
      toast.error('Failed to approve RFQ');
    }
  };

  // RFQ sending functionality
  const handleSendRfq = async () => {
    try {
      // Ensure arrays are properly formatted
      const bomItemIds = Array.isArray(selectedParts) ? selectedParts : [];
      const vendorIds = Array.isArray(selectedVendors) ? selectedVendors : [];
      
      // Validation
      if (bomItemIds.length === 0) {
        alert('Please select at least one BOM part');
        return;
      }
      
      if (vendorIds.length === 0) {
        alert('Please select at least one vendor');
        return;
      }


      // Create RFQ with comprehensive details
      const rfqData = {
        rfqName: `RFQ for ${bomItemIds.length} Part${bomItemIds.length !== 1 ? 's' : ''}`,
        projectId: projectId,
        bomItemIds: bomItemIds,
        vendorIds: vendorIds,
        quoteDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        selectionType: 'competitive' as const,
        buyerName: 'Procurement Team',
        emailBody: `Dear Vendor,

We are pleased to invite you to submit a competitive quotation for the manufacturing of the listed components. 

Key Requirements:
• All parts must meet specified dimensional and material requirements
• Quality certifications required (ISO 9001 or equivalent)
• Technical drawings and 3D models are provided as attachments
• Please provide detailed breakdown of costs and lead times
• Include your standard terms and conditions

We look forward to your competitive proposal and establishing a successful partnership.`,
        emailSubject: `RFQ: Manufacturing Quotation Request - ${selectedParts.length} Components`
      };

      // Create the RFQ
      const createdRfq = await createRfqMutation.mutateAsync(rfqData);
      
      // Send the RFQ immediately
      await sendRfqMutation.mutateAsync(createdRfq.id);
      
      // Cache is automatically updated by the create mutation
      
      // Show success message
      toast.success(`RFQ sent successfully to ${vendorIds.length} vendor${vendorIds.length !== 1 ? 's' : ''} for ${bomItemIds.length} part${bomItemIds.length !== 1 ? 's' : ''}!`);
      
      // Reset selections
      setSelectedParts([]);
      setSelectedVendors([]);
      
    } catch (error) {
      toast.error('Failed to send RFQ. Please try again.');
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send RFQ:', error);
      }
    }
  };

  // Helper function to extract filename from path
  const getFileName = (filePath: string): string => {
    if (!filePath) return '';
    
    // Extract filename from path
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || '';
    
    // If filename has timestamp prefix (like "1234567_originalname.ext"), remove it
    if (fileName.includes('_') && /^\d+_/.test(fileName)) {
      return fileName.substring(fileName.indexOf('_') + 1);
    }
    
    return fileName;
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBack}
                className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">
                {evaluationGroupName ? evaluationGroupName : 'Supplier Evaluation'}
              </h1>
              <p className="text-gray-300 mt-1">
                {evaluationGroupName 
                  ? 'Evaluate vendors and manage RFQs for this evaluation group'
                  : 'Select BOM parts to find and evaluate vendors'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search parts, vendors..."
                className="pl-9 w-80 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                value={partsSearchTerm}
                onChange={(e) => setPartsSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-4 gap-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-teal-600/20">
                  <Package className="h-6 w-6 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{stats.totalParts}</h3>
                  <p className="text-sm text-gray-300">Total Parts</p>
                  <p className="text-xs text-green-400 mt-1">From active BOM</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-600/20">
                  <Building2 className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{stats.activeVendors}</h3>
                  <p className="text-sm text-gray-300">Active Vendors</p>
                  <p className="text-xs text-gray-400 mt-1">Database managed vendors</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-indigo-600/20">
                  <Award className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{stats.availableVendors}</h3>
                  <p className="text-sm text-gray-300">Available Vendors</p>
                  <p className="text-xs text-green-400 mt-1">Ready for RFQ</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-600/20">
                  <TrendingUp className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{stats.sentRfqCount}</h3>
                  <p className="text-sm text-gray-300">RFQs Sent</p>
                  <p className="text-xs text-blue-400 mt-1">Total sent today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Block 1: SELECT BOM PARTS */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-0">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">BOM Parts</h2>
                <Badge variant="outline" className="text-teal-400 border-teal-400/50">
                  {selectedParts.length} selected
                </Badge>
              </div>
            </div>

            {/* Category Filters */}
            <div className="p-6 border-b border-gray-700 bg-gray-900/50">
              <div className="flex flex-wrap gap-2">
                {categoryButtons.map(cat => (
                  <Button
                    key={cat.label}
                    variant={cat.isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.label)}
                    className={cat.isActive ? "bg-teal-600 hover:bg-teal-700 text-white" : "border-gray-600 text-gray-300 hover:bg-gray-700"}
                  >
                    {cat.label} ({cat.count})
                  </Button>
                ))}
              </div>
            </div>

            {/* Parts Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50 border-b border-gray-700">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-gray-400"></th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">PART NO.</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">DESCRIPTION</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">CATEGORY</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">PROCESS</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">QTY</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">FILES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParts.map((part, index) => (
                    <tr key={part.id} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50'}>
                      <td className="p-4">
                        <Checkbox
                          checked={selectedParts.includes(part.id)}
                          onCheckedChange={(checked) => handlePartToggle(part.id, !!checked)}
                          className="border-gray-600 data-[state=checked]:bg-teal-600"
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-white">{part.partNumber}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-white">{part.description}</div>
                        {part.price && (
                          <div className="text-sm text-teal-400 font-medium">₹{part.price.toFixed(3)}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="border-gray-600 text-gray-300">{part.category}</Badge>
                      </td>
                      <td className="p-4">
                        <div className="text-white">
                          {part.process || <span className="text-gray-500">No process</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-white">{part.quantity} pcs</div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          {part.file2dPath && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewFile?.(part, '2d');
                              }}
                              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-600/10 px-2 py-1 rounded transition-colors text-left"
                              title="View 2D Drawing"
                            >
                              <FileText className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate max-w-[120px]">{getFileName(part.file2dPath)}</span>
                            </button>
                          )}
                          {part.file3dPath && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewFile?.(part, '3d');
                              }}
                              className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-600/10 px-2 py-1 rounded transition-colors text-left"
                              title="View 3D Model"
                            >
                              <Box className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate max-w-[120px]">{getFileName(part.file3dPath)}</span>
                            </button>
                          )}
                          {!part.file2dPath && !part.file3dPath && (
                            <span className="text-xs text-gray-500">No files</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-700 bg-gray-900/30 text-sm text-gray-400">
              Showing {filteredParts.length} of {bomParts.length} parts
            </div>
          </CardContent>
        </Card>

        {/* Block 2: SELECT VENDOR - Only show when parts are selected */}
        {selectedParts.length > 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-0">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Matched Vendors</h2>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-teal-400 border-teal-400/50">
                      {matchedVendors.length} available
                    </Badge>
                    <Badge variant="outline" className="text-purple-400 border-purple-400/50">
                      {selectedVendors.length} selected
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {isLoadingVendors ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto mb-4"></div>
                    <h3 className="font-medium mb-2 text-white">Loading vendors...</h3>
                    <p className="text-sm">Fetching vendor database</p>
                  </div>
                ) : matchedVendors.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="font-medium mb-2 text-white">No vendors matched</h3>
                    <p className="text-sm">
                      {vendors.length === 0 
                        ? 'No vendors found in database'
                        : 'Try selecting different BOM parts or processes'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matchedVendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedVendors.includes(vendor.id)
                            ? 'border-teal-500 bg-teal-600/10 shadow-md shadow-teal-500/20'
                            : 'border-gray-700 hover:border-teal-500/50 hover:shadow-sm bg-gray-900/50 hover:bg-gray-900'
                        }`}
                        onClick={() => handleVendorToggle(vendor.id, !selectedVendors.includes(vendor.id))}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-white mb-1">{vendor.name || vendor.companyName}</h3>
                            <Badge 
                              variant={vendor.status === 'active' ? "default" : "secondary"}
                              className={`text-xs ${vendor.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}
                            >
                              {vendor.status || 'active'}
                            </Badge>
                            {vendor.supplierCode && (
                              <Badge variant="outline" className="text-xs ml-2 border-gray-600 text-gray-400">
                                {vendor.supplierCode}
                              </Badge>
                            )}
                          </div>
                          {selectedVendors.includes(vendor.id) && (
                            <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 text-sm text-gray-300">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-teal-400" />
                            <span>{vendor.leadTime || 'Contact for details'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-teal-400" />
                            <span>{vendor.location || (vendor.city && vendor.state ? `${vendor.city}, ${vendor.state}` : 'Location TBD')}</span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex flex-wrap gap-1">
                            {vendor.process?.slice(0, 3).map((cap) => (
                              <Badge
                                key={cap}
                                variant="outline"
                                className="text-xs border-gray-600 text-gray-300"
                              >
                                {cap}
                              </Badge>
                            )) || <span className="text-xs text-gray-500">No processes</span>}
                            {vendor.process && vendor.process.length > 3 && (
                              <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                                +{vendor.process.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Contact Information */}
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <div className="flex flex-wrap gap-3 text-xs">
                            {vendor.primaryContacts?.[0]?.email && (
                              <a
                                href={`mailto:${vendor.primaryContacts[0].email}`}
                                className="flex items-center gap-1 text-teal-400 hover:text-teal-300 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Mail className="h-3 w-3" />
                                <span className="truncate max-w-[120px]">{vendor.primaryContacts[0].email}</span>
                              </a>
                            )}
                            {vendor.website && (
                              <a
                                href={vendor.website.startsWith('http') ? vendor.website : `https://${vendor.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-teal-400 hover:text-teal-300 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Globe className="h-3 w-3" />
                                <span className="truncate max-w-[120px]">Website</span>
                              </a>
                            )}
                            {(vendor.primaryContacts?.[0]?.phone || vendor.companyPhone) && (
                              <div className="flex items-center gap-1 text-gray-400">
                                <Phone className="h-3 w-3" />
                                <span className="truncate max-w-[120px]">
                                  {vendor.primaryContacts?.[0]?.phone || vendor.companyPhone}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {vendor.certifications && vendor.certifications.length > 0 && (
                          <div className="mt-2 text-xs text-gray-400">
                            {vendor.certifications.slice(0, 3).join(', ')}
                            {vendor.certifications.length > 3 && '...'}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Block 3: REVIEW & SEND RFQ - Only show when vendors are selected */}
        {selectedVendors.length > 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-0">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">RFQ Summary</h2>
                  <Badge variant="outline" className="text-green-400 border-green-400/50">
                    {selectedVendors.length} vendor{selectedVendors.length !== 1 ? 's' : ''} ready
                  </Badge>
                </div>
              </div>

              <div className="p-6">
                {selectedVendorData.map((vendor) => (
                  <div key={vendor.id} className="bg-gray-900/50 rounded-lg p-4 mb-4 last:mb-0 border border-gray-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded bg-teal-600/20">
                            <Building2 className="h-5 w-5 text-teal-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{vendor.name || vendor.companyName}</h3>
                            <p className="text-sm text-gray-400">{vendor.supplierCode || 'No supplier code'}</p>
                          </div>
                          <Badge className="ml-auto bg-green-600 text-white">
                            {vendor.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <h4 className="font-medium text-white mb-1">CONTACT</h4>
                            <div className="text-gray-300 space-y-1">
                              <div>{vendor.primaryContacts?.[0]?.name || 'Contact not available'}</div>
                              <div>{vendor.primaryContacts?.[0]?.email || vendor.companyEmail || 'Email not available'}</div>
                              <div>{vendor.primaryContacts?.[0]?.phone || vendor.companyPhone || 'Phone not available'}</div>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium text-white mb-1">CAPABILITIES</h4>
                            <div className="flex flex-wrap gap-1">
                              {vendor.process?.map((cap) => (
                                <Badge key={cap} className="bg-teal-600 text-white text-xs">
                                  {cap}
                                </Badge>
                              )) || <span className="text-xs text-gray-500">No capabilities listed</span>}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="flex items-center gap-1 text-gray-400">
                              <Clock className="h-4 w-4 text-teal-400" />
                              <span>Lead Time</span>
                            </div>
                            <div className="font-medium text-white">{vendor.leadTime || 'Contact for details'}</div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-gray-400">
                              <Users className="h-4 w-4 text-teal-400" />
                              <span>MOQ</span>
                            </div>
                            <div className="font-medium text-white">{vendor.minOrderQuantity || 'Contact for MOQ'}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Certifications</div>
                            <div className="text-xs space-x-2">
                              {vendor.certifications?.map((cert) => (
                                <Badge key={cert} variant="outline" className="text-xs border-gray-600 text-gray-300">
                                  {cert}
                                </Badge>
                              )) || <span className="text-xs text-gray-500">None listed</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="ml-6 text-right">
                        <div className="text-2xl font-bold text-teal-400">Ready</div>
                        <div className="text-sm text-gray-400">{vendor.city && vendor.state ? `${vendor.city}, ${vendor.state}` : 'Location TBD'}</div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="mt-6 flex justify-end">
                  <Button 
                    className="bg-teal-600 hover:bg-teal-700 text-white px-8"
                    onClick={handleSendRfq}
                    disabled={createRfqMutation.isPending || sendRfqMutation.isPending}
                  >
                    {(createRfqMutation.isPending || sendRfqMutation.isPending) ? (
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {(createRfqMutation.isPending || sendRfqMutation.isPending) ? 'Sending RFQ...' : 'Send RFQ'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Production Feature Status Notice */}
        {shouldShowFeatureNotice && (
          <Card className={`mt-6 ${
            trackingFeatureStatus.state === TrackingFeatureState.MIGRATION_REQUIRED 
              ? 'bg-amber-900/20 border-amber-600/50' 
              : trackingFeatureStatus.state === TrackingFeatureState.ERROR
              ? 'bg-red-900/20 border-red-600/50'
              : 'bg-gray-900/50 border-gray-600/50'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    trackingFeatureStatus.state === TrackingFeatureState.MIGRATION_REQUIRED 
                      ? 'bg-amber-600/20' 
                      : trackingFeatureStatus.state === TrackingFeatureState.ERROR
                      ? 'bg-red-600/20'
                      : 'bg-gray-600/20'
                  }`}>
                    <Package className={`h-5 w-5 ${
                      trackingFeatureStatus.state === TrackingFeatureState.MIGRATION_REQUIRED 
                        ? 'text-amber-400' 
                        : trackingFeatureStatus.state === TrackingFeatureState.ERROR
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${
                      trackingFeatureStatus.state === TrackingFeatureState.MIGRATION_REQUIRED 
                        ? 'text-amber-300' 
                        : trackingFeatureStatus.state === TrackingFeatureState.ERROR
                        ? 'text-red-300'
                        : 'text-gray-300'
                    }`}>
                      {featureStatusMessage.title}
                    </h3>
                    <p className={`text-sm mt-1 ${
                      trackingFeatureStatus.state === TrackingFeatureState.MIGRATION_REQUIRED 
                        ? 'text-amber-200' 
                        : trackingFeatureStatus.state === TrackingFeatureState.ERROR
                        ? 'text-red-200'
                        : 'text-gray-300'
                    }`}>
                      {featureStatusMessage.description}
                    </p>
                    {trackingFeatureStatus.state === TrackingFeatureState.MIGRATION_REQUIRED && (
                      <p className="text-amber-300 text-xs mt-2">
                        Your RFQs are being sent successfully! Tracking will be available after migration.
                      </p>
                    )}
                  </div>
                </div>
                {featureStatusMessage.actionText && trackingFeatureStatus.canRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      invalidateRfqTracking();
                      window.location.reload();
                    }}
                    className={`${
                      trackingFeatureStatus.state === TrackingFeatureState.MIGRATION_REQUIRED 
                        ? 'border-amber-600 text-amber-300 hover:bg-amber-600/10'
                        : trackingFeatureStatus.state === TrackingFeatureState.ERROR
                        ? 'border-red-600 text-red-300 hover:bg-red-600/10'
                        : 'border-gray-600 text-gray-300 hover:bg-gray-600/10'
                    }`}
                  >
                    {featureStatusMessage.actionText}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* RFQ Tracking Summary - Database-backed */}
        {shouldShowTracking && (
          <Card className="bg-gray-900 border-gray-700 mt-6">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">RFQ Tracking</h3>
                <div className="flex gap-4 text-sm">
                  {rfqStats && (
                    <>
                      <div className="text-center">
                        <div className="text-lg font-bold text-teal-400">{rfqStats.totalSent}</div>
                        <div className="text-xs text-gray-400">Total Sent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-400">{rfqStats.totalResponded}</div>
                        <div className="text-xs text-gray-400">Responded</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-400">{formatResponseTime(rfqStats.avgResponseTime)}</div>
                        <div className="text-xs text-gray-400">Avg Response</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                {rfqTrackingRecords.length === 0 && !isLoadingTracking ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-sm">No RFQ tracking records yet</div>
                    <div className="text-xs mt-1">Send your first RFQ to see tracking information here</div>
                  </div>
                ) : (
                  rfqTrackingRecords.map((tracking) => (
                    <div key={tracking.id} className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-medium text-white">{tracking.rfqName}</h4>
                        <p className="text-sm text-gray-400 mt-1">
                          {getRfqSummaryText(tracking)}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          RFQ #{tracking.rfqNumber} • Sent {new Date(tracking.sentAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          className={`bg-${getStatusColor(tracking.status)}-600 text-white`}
                        >
                          {getStatusText(tracking.status)}
                        </Badge>
                        
                        {/* Action Buttons */}
                        {tracking.status === 'sent' && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelRfq(tracking.id)}
                              disabled={deleteTrackingMutation.isPending}
                              className="border-red-600 text-red-400 hover:bg-red-600/10 hover:text-red-300"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              variant="outline" 
                              size="sm"
                              onClick={() => handleApproveRfq(tracking.id, tracking.vendors)}
                              disabled={updateTrackingStatusMutation.isPending}
                              className="border-green-600 text-green-400 hover:bg-green-600/10 hover:text-green-300"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          </div>
                        )}
                        
                        {/* Delete button for RFQs under evaluation */}
                        {tracking.status === 'evaluated' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteEvaluationRfq(tracking.id)}
                            disabled={deleteTrackingMutation.isPending}
                            className="border-red-600 text-red-400 hover:bg-red-600/10 hover:text-red-300"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Detailed Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Vendors */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          Vendors ({tracking.vendorCount})
                        </h5>
                        <div className="space-y-2">
                          {tracking.vendors.map((vendor) => (
                            <div key={vendor.id} className="bg-gray-700 rounded p-2 text-xs">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="text-white font-medium">{vendor.name}</div>
                                  {vendor.email && (
                                    <div className="text-gray-400 flex items-center gap-1 mt-1">
                                      <Mail className="h-3 w-3" />
                                      {vendor.email}
                                    </div>
                                  )}
                                </div>
                                <div className="ml-2">
                                  {vendor.responded ? (
                                    <div className="text-green-400 text-xs">
                                      <div>✓ Responded</div>
                                      {vendor.quoteAmount && (
                                        <div>₹{vendor.quoteAmount}</div>
                                      )}
                                      {vendor.leadTimeDays && (
                                        <div>{vendor.leadTimeDays} days</div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-gray-400 text-xs">Pending</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Parts */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          Parts ({tracking.partCount})
                        </h5>
                        <div className="space-y-2">
                          {tracking.parts.map((part) => (
                            <div key={part.id} className="bg-gray-700 rounded p-2 text-xs">
                              <div className="text-white font-medium">{part.partNumber}</div>
                              <div className="text-gray-400 mt-1">{part.description}</div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs border-blue-500 text-blue-400">
                                  {part.process}
                                </Badge>
                                <span className="text-xs text-gray-500">Qty: {part.quantity}</span>
                                {part.has2dFile && (
                                  <Badge variant="outline" className="text-xs border-green-500 text-green-400">
                                    2D
                                  </Badge>
                                )}
                                {part.has3dFile && (
                                  <Badge variant="outline" className="text-xs border-purple-500 text-purple-400">
                                    3D
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Response Summary */}
                    {tracking.responseCount > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="flex justify-between text-sm">
                          <div className="text-gray-300">
                            Response Rate: <span className="text-green-400 font-medium">{Math.round((tracking.responseCount / tracking.vendorCount) * 100)}%</span>
                          </div>
                          {tracking.firstResponseAt && (
                            <div className="text-gray-400">
                              First response: {new Date(tracking.firstResponseAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    </div>
                  ))
                )}
              </div>
              
              {isLoadingTracking && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400 mx-auto"></div>
                  <p className="text-gray-400 text-sm mt-2">Loading RFQ tracking data...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Approve Vendor Selection Modal */}
        {approveModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="bg-gray-800 border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-green-400" />
                      Approve RFQ - Select Vendors
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setApproveModalOpen(null);
                        setSelectedApproveVendors([]);
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    Select which vendors you want to proceed with for this RFQ
                  </p>
                </div>

                <div className="p-6 max-h-96 overflow-y-auto">
                  {(() => {
                    const currentTracking = rfqTrackingRecords.find(t => t.id === approveModalOpen);
                    return currentTracking?.vendors.map((vendor) => (
                      <div
                        key={vendor.id}
                        className={`border rounded-lg p-4 mb-3 cursor-pointer transition-all ${
                          selectedApproveVendors.includes(vendor.id)
                            ? 'border-green-500 bg-green-600/10'
                            : 'border-gray-600 hover:border-green-500/50 bg-gray-900/50'
                        }`}
                        onClick={() => {
                          setSelectedApproveVendors(prev =>
                            prev.includes(vendor.id)
                              ? prev.filter(id => id !== vendor.id)
                              : [...prev, vendor.id]
                          );
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedApproveVendors.includes(vendor.id)}
                                  onChange={() => {}} // Controlled by parent click
                                  className="border-gray-600 data-[state=checked]:bg-green-600"
                                />
                                <h4 className="font-medium text-white">{vendor.name}</h4>
                              </div>
                              {vendor.responded && (
                                <Badge className="bg-green-600 text-white text-xs">
                                  Responded
                                </Badge>
                              )}
                            </div>
                            
                            {vendor.email && (
                              <div className="text-sm text-gray-400 flex items-center gap-1 mt-2">
                                <Mail className="h-3 w-3" />
                                {vendor.email}
                              </div>
                            )}
                            
                            {vendor.responded && (vendor.quoteAmount || vendor.leadTimeDays) && (
                              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                                {vendor.quoteAmount && (
                                  <div>
                                    <div className="text-gray-400">Quote Amount</div>
                                    <div className="font-medium text-green-400">₹{vendor.quoteAmount}</div>
                                  </div>
                                )}
                                {vendor.leadTimeDays && (
                                  <div>
                                    <div className="text-gray-400">Lead Time</div>
                                    <div className="font-medium text-blue-400">{vendor.leadTimeDays} days</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {selectedApproveVendors.includes(vendor.id) && (
                            <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center ml-3">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                <div className="p-6 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      {selectedApproveVendors.length} vendor{selectedApproveVendors.length !== 1 ? 's' : ''} selected
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setApproveModalOpen(null);
                          setSelectedApproveVendors([]);
                        }}
                        className="border-gray-600 text-gray-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleConfirmApproval}
                        disabled={selectedApproveVendors.length === 0 || updateTrackingStatusMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {updateTrackingStatusMutation.isPending ? (
                          <>
                            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Approve Selected
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

    </div>
  );
}