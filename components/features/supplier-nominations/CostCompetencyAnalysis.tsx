'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DollarSign,
  TrendingDown,
  TrendingUp,
  Award,
  Calculator,
  BarChart3
} from 'lucide-react';

export interface CostCompetencyData {
  id: number;
  costComponent: string;
  baseValue?: number;
  supplierValues: number[]; // Dynamic array for supplier values
  isRanking?: boolean;
  unit?: string;
  paymentTerms?: string[]; // Dynamic array for payment terms
}


interface CostCompetencyAnalysisProps {
  nominationId?: string;
  onDataUpdate?: (data: CostCompetencyData[]) => void;
  vendors?: Array<{ id: string; name: string; }>;
}

export function CostCompetencyAnalysis({ nominationId, onDataUpdate, vendors = [] }: CostCompetencyAnalysisProps) {
  // Create dynamic cost data based on vendors
  const createDynamicCostData = () => {
    const numVendors = vendors.length > 0 ? vendors.length : 4; // Default to 4 if no vendors provided
    
    return [
      {
        id: 1,
        costComponent: "Raw Material Cost",
        baseValue: 2.52,
        supplierValues: Array(numVendors).fill(0).map(() => Math.round((2.5 + Math.random() * 1.5) * 100) / 100),
        unit: "₹"
      },
      {
        id: 2,
        costComponent: "Process Cost", 
        baseValue: 2.52,
        supplierValues: Array(numVendors).fill(0).map(() => Math.round((0.6 + Math.random() * 0.3) * 100) / 100),
        unit: "₹"
      },
      {
        id: 3,
        costComponent: "Overheads & Profit",
        baseValue: 0.0, // Allow editing from base 0
        supplierValues: Array(numVendors).fill(0).map(() => Math.round((0.6 + Math.random() * 0.3) * 100) / 100),
        unit: "₹"
      },
      {
        id: 4,
        costComponent: "Packing & Forwarding Cost",
        baseValue: 0.20,
        supplierValues: Array(numVendors).fill(0).map(() => Math.round((0.15 + Math.random() * 0.15) * 100) / 100),
        unit: "₹"
      },
      {
        id: 5,
        costComponent: "Payment Terms",
        paymentTerms: Array(numVendors).fill(0).map((_, i) => {
          const terms = ["100% Advance", "30 Days credit", "Against delivery", "50% ADP +50% AD"];
          return terms[i % terms.length];
        }),
        supplierValues: [] // No numeric values for payment terms
      },
      {
        id: 6,
        costComponent: "Net Price/unit",
        baseValue: 0.0, // Allow editing from base 0
        supplierValues: Array(numVendors).fill(0).map(() => Math.round((6.5 + Math.random() * 1.5) * 100) / 100),
        unit: "₹"
      },
      {
        id: 7,
        costComponent: "Development cost",
        baseValue: 0.0, // Allow editing from base 0
        supplierValues: Array(numVendors).fill(0).map(() => Math.round((2 + Math.random() * 3) * 100) / 100),
        unit: "Lakhs"
      },
      {
        id: 8,
        costComponent: "Financial Risk",
        baseValue: 0.0, // Allow editing from base 0
        supplierValues: Array(numVendors).fill(0).map(() => Math.round((0.05 + Math.random() * 0.1) * 1000) / 1000),
        unit: "%"
      },
      {
        id: 9,
        costComponent: "Cost Competency Score",
        baseValue: 0.0, // Allow editing from base 0
        supplierValues: Array(numVendors).fill(0).map(() => Math.round((2.3 + Math.random() * 0.8) * 100) / 100),
        unit: "Score"
      },
      // Ranking rows
      {
        id: 10,
        costComponent: "Rank-Cost",
        supplierValues: Array(numVendors).fill(0).map((_, i) => i + 1), // Will be calculated
        isRanking: true
      },
      {
        id: 11,
        costComponent: "Rank-Development cost", 
        supplierValues: Array(numVendors).fill(0).map((_, i) => i + 1), // Will be calculated
        isRanking: true
      },
      {
        id: 12,
        costComponent: "Rank-Lead time",
        baseValue: 0.0, // Allow editing lead time base
        supplierValues: Array(numVendors).fill(0).map(() => Math.round((10 + Math.random() * 20) * 100) / 100), // Days
        unit: "Days"
      },
      {
        id: 13,
        costComponent: "Rank-Lead time Ranking",
        supplierValues: Array(numVendors).fill(0).map((_, i) => i + 1), // Will be calculated
        isRanking: true
      },
      {
        id: 14,
        costComponent: "Total score",
        supplierValues: Array(numVendors).fill(0).map(() => Math.round((60 + Math.random() * 30) * 100) / 100), // Will be calculated
        unit: "Score"
      },
      {
        id: 15,
        costComponent: "Overall Rank",
        supplierValues: Array(numVendors).fill(0).map((_, i) => i + 1), // Will be calculated
        isRanking: true
      }
    ];
  };

  const [costData, setCostData] = useState<CostCompetencyData[]>(createDynamicCostData());
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editingBaseValue, setEditingBaseValue] = useState<number | null>(null);
  const [editingPaymentTerm, setEditingPaymentTerm] = useState<{rowId: number, index: number} | null>(null);
  const [editingPaymentRow, setEditingPaymentRow] = useState<number | null>(null);
  
  // Factor weights for ranking calculations
  const [factorWeights, setFactorWeights] = useState({
    cost: 33.3,
    developmentCost: 33.3, 
    leadTime: 33.3
  });

  // Update cost data when vendors change
  React.useEffect(() => {
    setCostData(createDynamicCostData());
  }, [vendors]);

  // Calculate rankings based on cost data
  React.useEffect(() => {
    setCostData(prev => {
      const newData = [...prev];
      
      // Find relevant rows
      const netPriceRow = newData.find(item => item.costComponent === "Net Price/unit");
      const devCostRow = newData.find(item => item.costComponent === "Development cost");
      const leadTimeRow = newData.find(item => item.costComponent === "Rank-Lead time");
      
      const rankCostRow = newData.find(item => item.costComponent === "Rank-Cost");
      const rankDevRow = newData.find(item => item.costComponent === "Rank-Development cost");
      const rankLeadRow = newData.find(item => item.costComponent === "Rank-Lead time Ranking");
      const totalScoreRow = newData.find(item => item.costComponent === "Total score");
      const overallRankRow = newData.find(item => item.costComponent === "Overall Rank");
      
      if (netPriceRow && rankCostRow) {
        // Calculate Cost Rankings (lower is better)
        const sortedIndices = [...Array(netPriceRow.supplierValues.length).keys()]
          .sort((a, b) => netPriceRow.supplierValues[a] - netPriceRow.supplierValues[b]);
        rankCostRow.supplierValues = rankCostRow.supplierValues.map((_, index) => 
          sortedIndices.indexOf(index) + 1
        );
      }
      
      if (devCostRow && rankDevRow) {
        // Calculate Development Cost Rankings (lower is better)
        const sortedIndices = [...Array(devCostRow.supplierValues.length).keys()]
          .sort((a, b) => devCostRow.supplierValues[a] - devCostRow.supplierValues[b]);
        rankDevRow.supplierValues = rankDevRow.supplierValues.map((_, index) => 
          sortedIndices.indexOf(index) + 1
        );
      }
      
      if (leadTimeRow && rankLeadRow) {
        // Calculate Lead Time Rankings (lower is better)
        const sortedIndices = [...Array(leadTimeRow.supplierValues.length).keys()]
          .sort((a, b) => leadTimeRow.supplierValues[a] - leadTimeRow.supplierValues[b]);
        rankLeadRow.supplierValues = rankLeadRow.supplierValues.map((_, index) => 
          sortedIndices.indexOf(index) + 1
        );
      }
      
      if (rankCostRow && rankDevRow && rankLeadRow && totalScoreRow) {
        // Calculate Total Score
        totalScoreRow.supplierValues = totalScoreRow.supplierValues.map((_, index) => 
          Math.round(((rankCostRow.supplierValues[index] * factorWeights.cost / 100) + 
           (rankDevRow.supplierValues[index] * factorWeights.developmentCost / 100) + 
           (rankLeadRow.supplierValues[index] * factorWeights.leadTime / 100)) * 100) / 100
        );
      }
      
      if (totalScoreRow && overallRankRow) {
        // Calculate Overall Rankings (lower total score is better)
        const sortedIndices = [...Array(totalScoreRow.supplierValues.length).keys()]
          .sort((a, b) => totalScoreRow.supplierValues[a] - totalScoreRow.supplierValues[b]);
        overallRankRow.supplierValues = overallRankRow.supplierValues.map((_, index) => 
          sortedIndices.indexOf(index) + 1
        );
      }
      
      return newData;
    });
  }, [factorWeights]);

  // Update value function for supplier values
  const updateSupplierValue = (rowId: number, supplierIndex: number, value: number) => {
    setCostData(prev => prev.map(item => 
      item.id === rowId 
        ? { ...item, supplierValues: item.supplierValues.map((v, i) => i === supplierIndex ? value : v) }
        : item
    ));
  };

  // Update base value function
  const updateBaseValue = (rowId: number, value: number) => {
    setCostData(prev => prev.map(item => 
      item.id === rowId 
        ? { ...item, baseValue: value }
        : item
    ));
  };

  // Update payment terms function
  const updatePaymentTerm = (rowId: number, index: number, value: string) => {
    setCostData(prev => prev.map(item => 
      item.id === rowId 
        ? { 
            ...item, 
            paymentTerms: item.paymentTerms ? 
              item.paymentTerms.map((term, i) => i === index ? value : term) : 
              []
          }
        : item
    ));
  };

  // Handle edit mode
  const handleEditRow = (rowId: number) => {
    setEditingRow(editingRow === rowId ? null : rowId);
  };

  const handleEditBaseValue = (rowId: number) => {
    console.log('handleEditBaseValue called with rowId:', rowId);
    setEditingBaseValue(editingBaseValue === rowId ? null : rowId);
  };

  const handleEditPaymentTerm = (rowId: number, index: number) => {
    setEditingPaymentTerm(
      editingPaymentTerm?.rowId === rowId && editingPaymentTerm?.index === index 
        ? null 
        : { rowId, index }
    );
  };

  // Common payment terms options
  const paymentTermOptions = [
    "100% Advance",
    "30 Days credit", 
    "Against delivery",
    "50% ADP +50% AD",
    "15 Days credit",
    "45 Days credit",
    "60 Days credit",
    "90 Days credit",
    "Cash on Delivery",
    "Letter of Credit"
  ];

  const supplierSummary = useMemo(() => {
    const overallRanking = costData.find(item => item.costComponent === "Overall Ranking");
    const competencyScore = costData.find(item => item.costComponent === "Cost Competency Score");
    const netPrice = costData.find(item => item.costComponent === "Net Price/unit");
    const devCost = costData.find(item => item.costComponent === "Development cost");
    
    const numVendors = vendors.length || 4;
    return Array(numVendors).fill(0).map((_, index) => ({
      rank: overallRanking?.supplierValues[index] || 0,
      score: competencyScore?.supplierValues[index] || 0,
      netPrice: netPrice?.supplierValues[index] || 0,
      devCost: devCost?.supplierValues[index] || 0
    }));
  }, [costData, vendors]);

  const getRankingColor = (rank: number) => {
    switch(rank) {
      case 1: return 'bg-green-500/20 text-green-400 border-green-500';
      case 2: return 'bg-blue-500/20 text-blue-400 border-blue-500';
      case 3: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
      case 4: return 'bg-red-500/20 text-red-400 border-red-500';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500';
    }
  };

  const getRankingIcon = (rank: number) => {
    if (rank === 1) return <Award className="h-3 w-3" />;
    if (rank <= 2) return <TrendingUp className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3" />;
  };

  const getBestSupplier = () => {
    if (supplierSummary.length === 0) return 'No suppliers';
    
    const bestRank = Math.min(...supplierSummary.map(s => s.rank));
    const bestIndex = supplierSummary.findIndex(s => s.rank === bestRank);
    
    if (vendors.length > bestIndex) {
      return vendors[bestIndex].name;
    }
    return `Supplier-${bestIndex + 1}`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Best Supplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{getBestSupplier()}</div>
            <p className="text-xs text-gray-400 mt-1">Overall Winner</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Lowest Net Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ₹{supplierSummary.length > 0 ? Math.min(...supplierSummary.map(s => s.netPrice)).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-gray-400 mt-1">Per Unit</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Highest Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {supplierSummary.length > 0 ? Math.max(...supplierSummary.map(s => s.score)).toFixed(1) : '0.0'}
            </div>
            <p className="text-xs text-gray-400 mt-1">Competency Score</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Development Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ₹{supplierSummary.length > 0 ? Math.min(...supplierSummary.map(s => s.devCost)).toFixed(1) : '0.0'}L
            </div>
            <p className="text-xs text-gray-400 mt-1">Lowest Cost</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Competency Analysis Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Competency Score & Financial Stability Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300 font-medium">Cost Component</TableHead>
                <TableHead className="text-center text-gray-300 font-medium">Base/Reference</TableHead>
                {vendors.length > 0 ? vendors.map((vendor, index) => {
                  const colors = ['text-blue-400', 'text-green-400', 'text-yellow-400', 'text-purple-400'];
                  return (
                    <TableHead key={vendor.id} className={`text-center ${colors[index % colors.length]} font-medium`}>
                      {vendor.name}
                    </TableHead>
                  );
                }) : (
                  <>
                    <TableHead className="text-center text-blue-400 font-medium">Supplier-1</TableHead>
                    <TableHead className="text-center text-green-400 font-medium">Supplier-2</TableHead>
                    <TableHead className="text-center text-yellow-400 font-medium">Supplier-3</TableHead>
                    <TableHead className="text-center text-purple-400 font-medium">Supplier-4</TableHead>
                  </>
                )}
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costData.map((row) => (
                <TableRow key={row.id} className="border-gray-700">
                  <TableCell className="text-white font-medium">{row.costComponent}</TableCell>
                  
                  {/* Base/Reference Value - Always Editable */}
                  <TableCell className="text-center text-gray-300">
                    {editingBaseValue === row.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={row.baseValue || 0}
                        onChange={(e) => updateBaseValue(row.id, parseFloat(e.target.value) || 0)}
                        onBlur={() => setEditingBaseValue(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingBaseValue(null)}
                        className="w-20 h-8 bg-gray-700 border-gray-600 text-white text-sm text-center"
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="cursor-pointer hover:bg-gray-700 hover:text-white px-2 py-1 rounded border border-transparent hover:border-blue-500 min-h-[32px] flex items-center justify-center transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Base value clicked:', row.id, row.baseValue, row.costComponent);
                          handleEditBaseValue(row.id);
                        }}
                        title="Click to edit base value"
                      >
                        {row.baseValue !== undefined ? `${row.unit || ''}${row.baseValue}` : '-'}
                        <span className="ml-1 text-xs opacity-50">✏️</span>
                      </div>
                    )}
                  </TableCell>
                  
                  {/* Dynamic Supplier Columns */}
                  {row.paymentTerms ? (
                    // Payment Terms Row - Special Handling
                    row.paymentTerms.map((term, index) => {
                      const colors = ['text-blue-400', 'text-green-400', 'text-yellow-400', 'text-purple-400'];
                      const colorClass = colors[index % colors.length];
                      
                      return (
                        <TableCell key={index} className="text-center">
                          {editingPaymentRow === row.id ? (
                            <Select 
                              value={term} 
                              onValueChange={(value) => updatePaymentTerm(row.id, index, value)}
                            >
                              <SelectTrigger className="w-32 h-8 bg-gray-700 border-gray-600 text-white text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {paymentTermOptions.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={`${colorClass} text-xs`}>
                              {term || 'Not set'}
                            </span>
                          )}
                        </TableCell>
                      );
                    })
                  ) : (
                    // Regular Numeric Values
                    row.supplierValues.map((value, index) => {
                      const colors = ['text-blue-400', 'text-green-400', 'text-yellow-400', 'text-purple-400'];
                      const colorClass = colors[index % colors.length];
                      
                      return (
                        <TableCell key={index} className="text-center">
                          {editingRow === row.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={value}
                              onChange={(e) => updateSupplierValue(row.id, index, parseFloat(e.target.value) || 0)}
                              className="w-20 h-8 bg-gray-700 border-gray-600 text-white text-sm text-center"
                            />
                          ) : row.isRanking ? (
                            <Badge className={`${getRankingColor(value)} flex items-center gap-1 justify-center w-12`}>
                              {getRankingIcon(value)}
                              {value}
                            </Badge>
                          ) : (
                            <span className={`${colorClass} font-medium cursor-pointer hover:bg-gray-700 px-2 py-1 rounded`}
                                  onClick={() => handleEditRow(row.id)}>
                              {row.unit && row.unit !== 'Score' ? row.unit : ''}{value}{row.unit === 'Score' ? '' : ''}
                            </span>
                          )}
                        </TableCell>
                      );
                    })
                  )}
                  
                  <TableCell>
                    {row.paymentTerms ? (
                      <Button
                        size="sm"
                        variant={editingPaymentRow === row.id ? "default" : "outline"}
                        onClick={() => setEditingPaymentRow(editingPaymentRow === row.id ? null : row.id)}
                        className="h-8 text-xs"
                      >
                        {editingPaymentRow === row.id ? 'Save' : 'Edit'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant={editingRow === row.id ? "default" : "outline"}
                        onClick={() => handleEditRow(row.id)}
                        className="h-8 text-xs"
                      >
                        {editingRow === row.id ? 'Save' : 'Edit'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Factor Weights Section */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Ranking Factor Weights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cost Factor
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={factorWeights.cost}
                  onChange={(e) => setFactorWeights(prev => ({
                    ...prev,
                    cost: parseFloat(e.target.value) || 0
                  }))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <span className="text-gray-300 text-sm">%</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Development Cost Factor
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={factorWeights.developmentCost}
                  onChange={(e) => setFactorWeights(prev => ({
                    ...prev,
                    developmentCost: parseFloat(e.target.value) || 0
                  }))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <span className="text-gray-300 text-sm">%</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lead Time Factor
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={factorWeights.leadTime}
                  onChange={(e) => setFactorWeights(prev => ({
                    ...prev,
                    leadTime: parseFloat(e.target.value) || 0
                  }))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <span className="text-gray-300 text-sm">%</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <span className="text-sm text-gray-400">
              Total: {(factorWeights.cost + factorWeights.developmentCost + factorWeights.leadTime).toFixed(1)}%
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFactorWeights({ cost: 33.3, developmentCost: 33.3, leadTime: 33.3 })}
              className="h-8 text-xs"
            >
              Reset to Equal (33.3% each)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}