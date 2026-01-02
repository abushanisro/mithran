'use client';

import { useMemo, type FC } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MHRRecord } from '@/lib/api/mhr';
import { formatCurrency } from '@/lib/utils';

interface CostByLocationAnalyticsProps {
  records: MHRRecord[];
}

interface LocationData {
  location: string;
  totalAnnualCost: number;
  avgMHR: number;
  avgFixedCost: number;
  avgVariableCost: number;
  machineCount: number;
}

interface ChartData {
  name: string;
  value: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'] as const;

const CHART_CONFIG = {
  margin: { top: 20, right: 30, left: 20, bottom: 60 },
  barRadius: [8, 8, 0, 0] as [number, number, number, number],
} as const;

/**
 * Calculates total cost across all locations
 */
const calculateTotalCost = (data: ChartData[]): number => {
  return data.reduce((sum, item) => sum + item.value, 0);
};

/**
 * Aggregates MHR records by location with calculated metrics
 */
const aggregateDataByLocation = (records: MHRRecord[]): LocationData[] => {
  const aggregated = new Map<string, {
    totalAnnualCost: number;
    totalMHR: number;
    totalFixedCost: number;
    totalVariableCost: number;
    count: number;
  }>();

  records.forEach(record => {
    if (!record?.calculations) {
      console.warn('Record missing calculations:', record);
      return;
    }

    const existing = aggregated.get(record.location) || {
      totalAnnualCost: 0,
      totalMHR: 0,
      totalFixedCost: 0,
      totalVariableCost: 0,
      count: 0,
    };

    aggregated.set(record.location, {
      totalAnnualCost: existing.totalAnnualCost + (record.calculations.totalAnnualCost || 0),
      totalMHR: existing.totalMHR + (record.calculations.totalMachineHourRate || 0),
      totalFixedCost: existing.totalFixedCost + (record.calculations.totalFixedCostPerHour || 0),
      totalVariableCost: existing.totalVariableCost + (record.calculations.totalVariableCostPerHour || 0),
      count: existing.count + 1,
    });
  });

  return Array.from(aggregated.entries())
    .map(([location, data]) => ({
      location,
      totalAnnualCost: data.totalAnnualCost,
      avgMHR: data.count > 0 ? data.totalMHR / data.count : 0,
      avgFixedCost: data.count > 0 ? data.totalFixedCost / data.count : 0,
      avgVariableCost: data.count > 0 ? data.totalVariableCost / data.count : 0,
      machineCount: data.count,
    }))
    .sort((a, b) => b.totalAnnualCost - a.totalAnnualCost);
};

export const CostByLocationAnalytics: FC<CostByLocationAnalyticsProps> = ({ records }) => {
  // Aggregate data by location
  const locationData = useMemo(() => aggregateDataByLocation(records), [records]);

  const totalCostData = useMemo<ChartData[]>(() => {
    return locationData.map(data => ({
      name: data.location,
      value: data.totalAnnualCost,
    }));
  }, [locationData]);

  const totalCost = useMemo(() => calculateTotalCost(totalCostData), [totalCostData]);

  const CustomTooltip: FC<any> = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`tooltip-${index}`} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  };

  const PieTooltip: FC<any> = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    const percentage = totalCost > 0
      ? ((payload[0].value / totalCost) * 100).toFixed(1)
      : '0.0';

    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold mb-1">{payload[0].name}</p>
        <p className="text-sm">
          Total: {formatCurrency(payload[0].value)}
        </p>
        <p className="text-sm text-muted-foreground">
          {percentage}% of total
        </p>
      </div>
    );
  };

  if (records.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Analytics by Location</CardTitle>
        <CardDescription>
          Analyze machine costs and rates across different locations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="annual-cost" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="annual-cost">Annual Cost</TabsTrigger>
            <TabsTrigger value="trends">Cost Trends</TabsTrigger>
            <TabsTrigger value="mhr">Machine Hour Rate</TabsTrigger>
            <TabsTrigger value="cost-breakdown">Cost Breakdown</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="annual-cost" className="space-y-4">
            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="location"
                    className="text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    label={{ value: 'Location', position: 'insideBottom', offset: -10, style: { fontSize: 14, fontWeight: 600 } }}
                  />
                  <YAxis
                    className="text-xs"
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                    label={{ value: 'Annual Cost (₹)', angle: -90, position: 'insideLeft', style: { fontSize: 14, fontWeight: 600 } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar
                    dataKey="totalAnnualCost"
                    fill={COLORS[0]}
                    name="Total Annual Cost"
                    radius={CHART_CONFIG.barRadius}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {locationData.map((data) => (
                <Card key={data.location}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{data.location}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(data.totalAnnualCost)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {data.machineCount} machine{data.machineCount !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={locationData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="location"
                    className="text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    label={{ value: 'Location', position: 'insideBottom', offset: -10, style: { fontSize: 14, fontWeight: 600 } }}
                  />
                  <YAxis
                    className="text-xs"
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                    label={{ value: 'Annual Cost (₹)', angle: -90, position: 'insideLeft', style: { fontSize: 14, fontWeight: 600 } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line
                    type="monotone"
                    dataKey="totalAnnualCost"
                    stroke={COLORS[0]}
                    strokeWidth={3}
                    name="Total Annual Cost"
                    dot={{ r: 6, fill: COLORS[0], strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, fill: COLORS[0], strokeWidth: 2, stroke: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Highest Cost Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">{locationData[0]?.location || 'N/A'}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(locationData[0]?.totalAnnualCost || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Lowest Cost Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {locationData[locationData.length - 1]?.location || 'N/A'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(locationData[locationData.length - 1]?.totalAnnualCost || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Cost Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {formatCurrency(
                      (locationData[0]?.totalAnnualCost || 0) -
                      (locationData[locationData.length - 1]?.totalAnnualCost || 0)
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Difference between highest and lowest
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="mhr" className="space-y-4">
            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="location"
                    className="text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    label={{ value: 'Location', position: 'insideBottom', offset: -10, style: { fontSize: 14, fontWeight: 600 } }}
                  />
                  <YAxis
                    className="text-xs"
                    tickFormatter={(value) => `₹${value.toFixed(0)}`}
                    label={{ value: 'Machine Hour Rate (₹/hr)', angle: -90, position: 'insideLeft', style: { fontSize: 14, fontWeight: 600 } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar
                    dataKey="avgMHR"
                    fill={COLORS[1]}
                    name="Average MHR"
                    radius={CHART_CONFIG.barRadius}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {locationData.map((data) => (
                <Card key={data.location}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{data.location}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(data.avgMHR)}/hr</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Average across {data.machineCount} machine{data.machineCount !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="cost-breakdown" className="space-y-4">
            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="location"
                    className="text-xs"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    label={{ value: 'Location', position: 'insideBottom', offset: -10, style: { fontSize: 14, fontWeight: 600 } }}
                  />
                  <YAxis
                    className="text-xs"
                    tickFormatter={(value) => `₹${value.toFixed(0)}`}
                    label={{ value: 'Cost per Hour (₹/hr)', angle: -90, position: 'insideLeft', style: { fontSize: 14, fontWeight: 600 } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar
                    dataKey="avgFixedCost"
                    fill={COLORS[2]}
                    name="Avg Fixed Cost/Hr"
                    radius={CHART_CONFIG.barRadius}
                    stackId="a"
                  />
                  <Bar
                    dataKey="avgVariableCost"
                    fill={COLORS[3]}
                    name="Avg Variable Cost/Hr"
                    radius={CHART_CONFIG.barRadius}
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {locationData.map((data) => (
                <Card key={data.location}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{data.location}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Fixed Cost/Hr</p>
                      <p className="text-lg font-semibold text-yellow-600">{formatCurrency(data.avgFixedCost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Variable Cost/Hr</p>
                      <p className="text-lg font-semibold text-orange-600">{formatCurrency(data.avgVariableCost)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={totalCostData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {totalCostData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Annual Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(totalCost)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across all locations
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Location Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {locationData.map((data, index) => (
                      <div key={data.location} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm">{data.location}</span>
                        </div>
                        <span className="text-sm font-medium">
                          {totalCost > 0 ? ((data.totalAnnualCost / totalCost) * 100).toFixed(1) : '0.0'}%
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
