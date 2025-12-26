'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import { useMaterials, useCreateMaterial } from '@/lib/api/hooks';

export default function Materials() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('kg');
  const { toast } = useToast();

  const { data: materialsData, isLoading } = useMaterials();
  const materials = materialsData?.materials || [];

  const createMutation = useCreateMaterial();

  const handleCreateMaterial = () => {
    if (!name || !partNumber || !category) return;

    createMutation.mutate(
      {
        partNumber,
        name,
        category,
        unitOfMeasure: unit,
        standardCost: price ? parseFloat(price) : undefined,
        status: 'active',
      },
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
          setPartNumber('');
          setCategory('');
          setPrice('');
          setUnit('kg');
        },
        onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
      }
    );
  };

  const columns = [
    { key: 'partNumber', header: 'Part Number' },
    { key: 'name', header: 'Material' },
    { key: 'category', header: 'Category' },
    { key: 'standardCost', header: 'Price', render: (m: any) => m.standardCost ? `$${Number(m.standardCost).toFixed(2)}/${m.unitOfMeasure}` : '-' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Raw Materials" description="Material database with pricing">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Material</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Material</DialogTitle>
              <DialogDescription>Add a new material to your materials database</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2"><Label>Part Number</Label><Input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} placeholder="e.g., ALU-6061" /></div>
              <div className="space-y-2"><Label>Material Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Aluminum 6061" /></div>
              <div className="space-y-2"><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., Metal" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Price per Unit</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" /></div>
                <div className="space-y-2"><Label>Unit</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg" /></div>
              </div>
              <Button onClick={handleCreateMaterial} disabled={!name || !partNumber || !category || createMutation.isPending} className="w-full">Add Material</Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <DataTable data={materials} columns={columns} loading={isLoading} emptyMessage="No materials yet." />
    </div>
  );
}