'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Calculator, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCalculators, useCreateCalculator } from '@/lib/api/hooks';
import type { CalculatorType } from '@/lib/api';

export default function CalculatorsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading } = useCalculators({
    search: searchQuery || undefined,
  });

  const createCalculatorMutation = useCreateCalculator();

  const handleCreateCalculator = async () => {
    try {
      const newCalc = await createCalculatorMutation.mutateAsync({
        name: 'New Calculator',
        description: 'Enter description...',
        calculatorType: 'single',
      });
      router.push(`/calculators/builder/${newCalc.id}`);
    } catch (error) {
      console.error('Failed to create calculator:', error);
    }
  };

  const calculators = data?.calculators || [];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calculators</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage dynamic calculators
          </p>
        </div>
        <Button onClick={handleCreateCalculator} disabled={createCalculatorMutation.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          New Calculator
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search calculators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Calculator Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : calculators.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No calculators found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by creating your first calculator
              </p>
              <Button onClick={handleCreateCalculator}>
                <Plus className="h-4 w-4 mr-2" />
                Create Calculator
              </Button>
            </CardContent>
          </Card>
        ) : (
          calculators.map((calc) => (
            <Card
              key={calc.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => router.push(`/calculators/${calc.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{calc.name}</CardTitle>
                  <Badge variant="secondary">{calc.calculatorType}</Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {calc.description || 'No description'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{calc.fields?.length || 0}</span>
                    <span>fields</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{calc.formulas?.length || 0}</span>
                    <span>formulas</span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/calculators/builder/${calc.id}`);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/calculators/${calc.id}`);
                    }}
                  >
                    Execute
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
