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
import { useVendors, useCreateVendor } from '@/lib/api/hooks';

export default function Vendors() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const { data: vendorsData, isLoading } = useVendors();
  const vendors = vendorsData?.vendors || [];

  const createMutation = useCreateVendor();

  const handleCreateVendor = () => {
    if (!name) return;

    createMutation.mutate(
      {
        name,
        contactEmail: email || undefined,
        status: 'active',
      },
      {
        onSuccess: () => {
          setOpen(false);
          setName('');
          setEmail('');
        },
        onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
      }
    );
  };

  const columns = [
    { key: 'name', header: 'Vendor Name' },
    { key: 'contactEmail', header: 'Email', render: (v: any) => v.contactEmail || '-' },
    { key: 'status', header: 'Status', render: (v: any) => <span className="capitalize">{v.status}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Vendors" description="Manage supplier relationships">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Vendor</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Vendor</DialogTitle>
              <DialogDescription>Add a new vendor to your supplier database</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2"><Label>Vendor Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter vendor name" /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@vendor.com" /></div>
              <Button onClick={handleCreateVendor} disabled={!name || createMutation.isPending} className="w-full">Add Vendor</Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>
      <DataTable data={vendors} columns={columns} loading={isLoading} emptyMessage="No vendors yet." />
    </div>
  );
}