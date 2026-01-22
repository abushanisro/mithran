'use client';

// Updated: Fixed functional navigation and Quick Actions - Version 3.0
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBOMs } from '@/lib/api/hooks/useBOM';
import { useBOMItems } from '@/lib/api/hooks/useBOMItems';
import { ModelViewer } from '@/components/ui/model-viewer';
import { Viewer2D } from '@/components/ui/viewer-2d';
import { apiClient } from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';

// Reset circuit breaker on page load if it's stuck
if (typeof window !== 'undefined') {
  try {
    apiClient.resetCircuitBreaker();
  } catch (error) {
    console.warn('Could not reset circuit breaker:', error);
  }
}
import { BOMSelectionCard } from '@/components/features/process-planning/BOMSelectionCard';
import { RawMaterialsSection } from '@/components/features/process-planning/RawMaterialsSection';
import { ManufacturingProcessSection } from '@/components/features/process-planning/ManufacturingProcessSection';
import { PackagingLogisticsSection } from '@/components/features/process-planning/PackagingLogisticsSection';
import { ProcuredPartsSection } from '@/components/features/process-planning/ProcuredPartsSection';
import { BomCostReport } from '@/components/features/process-planning/BomCostReport';
import { ProjectBomCostSummary } from '@/components/features/process-planning/ProjectBomCostSummary';

export default function ProcessPlanningPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [selectedBomId, setSelectedBomId] = useState<string>('');
  const [selectedPartNumber, setSelectedPartNumber] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [file3dUrl, setFile3dUrl] = useState<string | null>(null);
  const [file2dUrl, setFile2dUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Edit mode states for part details
  const [isEditingPartDetails, setIsEditingPartDetails] = useState(false);
  const [editablePartData, setEditablePartData] = useState({
    partNumber: '',
    name: '',
    description: '',
    itemType: '',
    material: '',
  });


  const handleModelMeasurements = (_data: any) => {
    // TODO: Use measurements for calculations
  };

  // Fetch data with loading and error states
  const { data: bomsData, isLoading: bomsLoading, error: bomsError } = useBOMs({ projectId });
  const boms = bomsData?.boms || [];

  const { data: bomItemsData, isLoading: bomItemsLoading, error: bomItemsError } = useBOMItems(selectedBomId);
  const bomItems = bomItemsData?.items || [];
  const selectedItem = bomItems.find((item) => item.partNumber === selectedPartNumber);

  // Clear measurements when item changes and initialize editable data
  useEffect(() => {
    // Clear measurements/cache when item changes
    if (selectedItem) {
      setEditablePartData({
        partNumber: selectedItem.partNumber || selectedItem.id,
        name: selectedItem.name || '',
        description: selectedItem.description || '',
        itemType: selectedItem.itemType || 'child_part',
        material: selectedItem.material || '',
      });
    }
  }, [selectedItem?.id]);

  const handleBomChange = (bomId: string) => {
    setSelectedBomId(bomId);
    setSelectedPartNumber('');
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
  };



  // Quick Action handlers


  // Navigation handlers
  const tabs = ['overview', 'process', 'costing', 'reports'];
  const currentTabIndex = tabs.indexOf(activeTab);

  const handlePrevious = () => {
    if (currentTabIndex > 0) {
      const prevTab = tabs[currentTabIndex - 1];
      if (prevTab) setActiveTab(prevTab);
    }
  };

  const handleNext = () => {
    if (currentTabIndex < tabs.length - 1) {
      const nextTab = tabs[currentTabIndex + 1];
      if (nextTab) setActiveTab(nextTab);
    }
  };

  // Handlers for part details editing
  const handleEditPartDetails = () => {
    setIsEditingPartDetails(true);
  };

  const handleSavePartDetails = () => {
    // TODO: Save the updated part details to the backend
    setIsEditingPartDetails(false);
    // Here you would typically call an API to update the BOM item
  };

  const handleCancelEdit = () => {
    if (selectedItem) {
      setEditablePartData({
        partNumber: selectedItem.partNumber || selectedItem.id,
        name: selectedItem.name || '',
        description: selectedItem.description || '',
        itemType: selectedItem.itemType || 'child_part',
        material: selectedItem.material || '',
      });
    }
    setIsEditingPartDetails(false);
  };

  // Load file URLs
  useEffect(() => {
    if (!selectedItem) {
      setFile3dUrl(null);
      setFile2dUrl(null);
      return;
    }

    const loadFile3dUrl = async () => {
      try {
        if (selectedItem.file3dPath) {
          const response = await apiClient.get<{ url: string }>(`/bom-items/${selectedItem.id}/file-url/3d`);
          setFile3dUrl(response.url);
        } else {
          setFile3dUrl(null);
        }
      } catch (error) {
        console.error('Failed to load 3D file URL:', error);
        setFile3dUrl(null);
      }
    };

    const loadFile2dUrl = async () => {
      try {
        if (selectedItem.file2dPath) {
          const response = await apiClient.get<{ url: string }>(`/bom-items/${selectedItem.id}/file-url/2d`);
          setFile2dUrl(response.url);
        } else {
          setFile2dUrl(null);
        }
      } catch (error) {
        console.error('Failed to load 2D file URL:', error);
        setFile2dUrl(null);
      }
    };

    loadFile3dUrl();
    loadFile2dUrl();
  }, [selectedItem]);

  // Transform BOM items to match BOMSelectionCard expected format
  // Only transform the selected BOM with its items
  const transformedBoms = boms.map(bom => ({
    ...bom,
    items: bom.id === selectedBomId ? bomItems.map(item => ({
      id: item.id,
      partNumber: item.partNumber || item.id,
      description: item.name || item.description || '',
      itemType: (item.itemType || 'child_part') as 'assembly' | 'sub_assembly' | 'child_part',
      status: 'pending' as const, // You can map this from your actual data if available
    })) : [], // Empty array for non-selected BOMs
  }));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* PAGE HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manufacturing Engineering Platform</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Integrated workflow for process planning, costing, and project management
            </p>
          </div>
          {selectedPartNumber && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Active Part:</span>
              <Badge variant="default" className="text-xs">
                {selectedPartNumber}
              </Badge>
            </div>
          )}
        </div>

        {/* TAB INTERFACE */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList className="grid grid-cols-4 h-10">
              <TabsTrigger value="overview" className="text-xs">
                Project Overview
              </TabsTrigger>
              <TabsTrigger value="process" className="text-xs">
                Process Planning
              </TabsTrigger>
              <TabsTrigger value="costing" className="text-xs">
                Cost Analysis
              </TabsTrigger>
              <TabsTrigger value="reports" className="text-xs">
                Reports & Export
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3"
                onClick={handlePrevious}
                disabled={currentTabIndex === 0}
              >
                Previous
              </Button>
              <Button
                size="sm"
                className="h-8 px-3"
                onClick={handleNext}
                disabled={currentTabIndex === tabs.length - 1}
              >
                Next →
              </Button>
            </div>
          </div>

          {/* TAB 1: PROJECT OVERVIEW - For OEM Engineers */}
          <TabsContent value="overview" className="space-y-6">
            {/* Project Stats Cards - Compact */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Total BOMs</p>
                  <p className="text-lg font-bold">{boms.length}</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Parts Ready</p>
                  <p className="text-lg font-bold">{bomItems.length}</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">In Progress</p>
                  <p className="text-lg font-bold">0</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Project Progress</p>
                  <p className="text-lg font-bold">0%</p>
                </CardContent>
              </Card>
            </div>

            {/* Loading State */}
            {bomsLoading && (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">Loading BOMs...</p>
              </div>
            )}

            {/* Error State */}
            {bomsError && (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                <p className="text-destructive">Error loading BOMs: {bomsError.message}</p>
              </div>
            )}

            {/* BOM SELECTION CARD WITH FILTERS - HIGHLIGHTED */}
            {!bomsLoading && !bomsError && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <div className="border-2 border-primary/50 rounded-lg bg-primary/5 p-1">
                    <BOMSelectionCard
                      boms={transformedBoms}
                      selectedBomId={selectedBomId}
                      selectedPartNumber={selectedPartNumber}
                      searchTerm={searchTerm}
                      statusFilter={statusFilter}
                      typeFilter={typeFilter}
                      onBomChange={handleBomChange}
                      onPartChange={setSelectedPartNumber}
                      onSearchChange={setSearchTerm}
                      onStatusFilterChange={setStatusFilter}
                      onTypeFilterChange={setTypeFilter}
                    />
                  </div>
                </div>

                {/* Quick Actions & BOM Info - Compact */}
                <div className="space-y-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button className="w-full justify-start" variant="outline" size="sm">
                        Create New BOM
                      </Button>
                      <Button className="w-full justify-start" variant="outline" size="sm">
                        Batch Process
                      </Button>
                      <Button className="w-full justify-start" variant="outline" size="sm">
                        Export Report
                      </Button>
                    </CardContent>
                  </Card>

                  {selectedBomId && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Selected BOM</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Parts:</span>
                            <span className="font-medium">{bomItems.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Completed:</span>
                            <span className="font-medium text-green-600">0</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pending:</span>
                            <span className="font-medium text-yellow-600">{bomItems.length}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* BOM Items Loading State */}
            {selectedBomId && bomItemsLoading && (
              <div className="bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">Loading BOM items...</p>
              </div>
            )}

            {/* BOM Items Error State */}
            {selectedBomId && bomItemsError && (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                <p className="text-destructive">Error loading BOM items: {bomItemsError.message}</p>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: PROCESS PLANNING - For Process Engineers */}
          <TabsContent value="process" className="space-y-4">
            {selectedPartNumber && selectedItem ? (
              <>
                {/* Selected Part Details Card - Compact */}
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="bg-green-500 py-2 px-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-sm font-semibold">
                        Creating Process Plan For
                      </CardTitle>
                      {!isEditingPartDetails ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleEditPartDetails}
                          className="h-6 px-2 text-xs text-white hover:bg-white/20"
                        >
                          Edit
                        </Button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSavePartDetails}
                            className="h-6 px-2 text-xs text-white hover:bg-white/20"
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="h-6 px-2 text-xs text-white hover:bg-white/20"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Part Number */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Part Number</label>
                        {isEditingPartDetails ? (
                          <Input
                            value={editablePartData.partNumber}
                            onChange={(e) => setEditablePartData(prev => ({ ...prev, partNumber: e.target.value }))}
                            className="h-9 text-sm font-semibold"
                            placeholder="Enter part number"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{editablePartData.partNumber}</p>
                          </div>
                        )}
                      </div>

                      {/* Name/Description */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Part Name</label>
                        {isEditingPartDetails ? (
                          <Input
                            value={editablePartData.name}
                            onChange={(e) => setEditablePartData(prev => ({ ...prev, name: e.target.value }))}
                            className="h-9 text-sm font-semibold"
                            placeholder="Enter part name"
                          />
                        ) : (
                          <p className="text-sm font-semibold">{editablePartData.name || 'No name specified'}</p>
                        )}
                      </div>

                      {/* Type */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Item Type</label>
                        {isEditingPartDetails ? (
                          <select
                            value={editablePartData.itemType}
                            onChange={(e) => setEditablePartData(prev => ({ ...prev, itemType: e.target.value }))}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-semibold shadow-sm transition-colors"
                          >
                            <option value="child_part">Child Part</option>
                            <option value="sub_assembly">Sub Assembly</option>
                            <option value="assembly">Assembly</option>
                          </select>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {editablePartData.itemType.replace('_', ' ').toUpperCase()}
                          </Badge>
                        )}
                      </div>

                      {/* Material */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Material</label>
                        {isEditingPartDetails ? (
                          <Input
                            value={editablePartData.material}
                            onChange={(e) => setEditablePartData(prev => ({ ...prev, material: e.target.value }))}
                            className="h-9 text-sm font-semibold"
                            placeholder="Enter material type"
                          />
                        ) : (
                          <p className="text-sm font-semibold">{editablePartData.material || 'N/A'}</p>
                        )}
                      </div>
                    </div>

                    {/* Description Field - Full Width */}
                    {isEditingPartDetails && (
                      <div className="mt-4 space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Description</label>
                        <Input
                          value={editablePartData.description}
                          onChange={(e) => setEditablePartData(prev => ({ ...prev, description: e.target.value }))}
                          className="h-9 text-sm"
                          placeholder="Enter part description"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 3D MODEL & 2D DRAWING VIEWERS */}
                <div className="border border-border rounded-lg overflow-hidden shadow-md">
                  <div className="bg-primary p-3">
                    <h2 className="text-sm font-semibold text-primary-foreground">3D Model & 2D Drawing Viewers</h2>
                  </div>
                  <div className="bg-card p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 3D Viewer */}
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">3D Model (.STEP)</h3>
                        <div className="aspect-square bg-secondary border border-border rounded flex items-center justify-center overflow-hidden">
                          {selectedItem.file3dPath && file3dUrl ? (
                            <ModelViewer
                              fileUrl={file3dUrl}
                              fileName={selectedItem.file3dPath.split('/').pop() || selectedItem.name || 'model'}
                              fileType={selectedItem.file3dPath.split('.').pop() || 'step'}
                              bomItemId={selectedItem.id}
                              onMeasurements={handleModelMeasurements}
                            />
                          ) : (
                            <div className="text-center text-muted-foreground">
                              <p className="text-sm">No 3D file available</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2D Viewer */}
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">2D Drawing (PDF/Image)</h3>
                        <div className="aspect-square bg-secondary border border-border rounded flex items-center justify-center overflow-hidden">
                          {selectedItem.file2dPath && file2dUrl ? (
                            <Viewer2D
                              fileUrl={file2dUrl}
                              fileName={selectedItem.file2dPath.split('/').pop() || selectedItem.name || 'drawing'}
                              fileType={
                                selectedItem.file2dPath.toLowerCase().endsWith('.pdf')
                                  ? 'pdf'
                                  : ['.png', '.jpg', '.jpeg', '.webp'].some((ext) =>
                                    selectedItem.file2dPath?.toLowerCase().endsWith(ext)
                                  )
                                    ? 'img'
                                    : 'other'
                              }
                            />
                          ) : (
                            <div className="text-center text-muted-foreground">
                              <p className="text-sm">No 2D drawing available</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Raw Materials Section */}
                <RawMaterialsSection bomItemId={selectedItem.id} />

                {/* Manufacturing Process Section */}
                <ManufacturingProcessSection bomItemId={selectedItem.id} />

                {/* Packaging & Logistics Section */}
                <PackagingLogisticsSection bomItemId={selectedItem.id} />


                {/* Procured Parts Section */}
                <ProcuredPartsSection bomItemId={selectedItem.id} />


                {/* Cost Report Section */}
                <BomCostReport bomId={selectedBomId} />
              </>
            ) : (
              <div className="text-center py-8 bg-card border-2 border-dashed border-border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-1">No Part Selected</p>
                <p className="text-xs text-muted-foreground">
                  Go to Project Overview tab to select a part for process planning
                </p>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: COST ANALYSIS - For Cost Engineers */}
          <TabsContent value="costing" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Cost Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Cost Breakdown Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <p className="text-sm font-medium text-muted-foreground">Coming Soon</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Advanced cost analysis and scenario comparison tools
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Scenario Comparison */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Scenario Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <p className="text-sm font-medium text-muted-foreground">Coming Soon</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Compare different manufacturing scenarios and their costs
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Project Cost Summary - Always visible in costing tab too */}
            <ProjectBomCostSummary projectId={projectId} />
          </TabsContent>

          {/* TAB 4: REPORTS & EXPORT - For All Users */}
          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Report Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button className="w-full justify-start" variant="outline" size="sm">
                      Executive Summary
                    </Button>
                    <Button className="w-full justify-start" variant="outline" size="sm">
                      Cost Analysis Report
                    </Button>
                    <Button className="w-full justify-start" variant="outline" size="sm">
                      Process Documentation
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Export Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button className="w-full justify-start" variant="outline" size="sm">
                      Export to Excel
                    </Button>
                    <Button className="w-full justify-start" variant="outline" size="sm">
                      Export to PDF
                    </Button>
                    <Button className="w-full justify-start" variant="outline" size="sm">
                      PowerBI Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Scheduled Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <p className="text-sm font-medium text-muted-foreground">No Scheduled Reports</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Set up automated report delivery
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
