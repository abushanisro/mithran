'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBOMs } from '@/lib/api/hooks/useBOM';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileSpreadsheet,
  Search,
  Plus,
  Calendar,
  FolderKanban,
  ArrowUpDown,
} from 'lucide-react';
import { format } from 'date-fns';

export default function BOMManagementPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { data } = useBOMs({ search: searchQuery });

  const boms = data?.boms || [];

  const filteredBoms = searchQuery
    ? boms.filter((bom) =>
        bom.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bom.version && bom.version.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : boms;

  const stats = {
    totalBoms: boms.length,
    activeBoms: boms.filter((b) => b.status === 'approved' || b.status === 'released').length,
    draftBoms: boms.filter((b) => b.status === 'draft').length,
    totalValue: boms.reduce((sum, b) => sum + (b.totalCost || 0), 0),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="BOM Management"
        description="Manage Bills of Materials across all projects"
      >
        <Button onClick={() => router.push('/projects')} className="gap-2">
          <Plus className="h-4 w-4" />
          Create BOM
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total BOMs</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBoms}</div>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active BOMs</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBoms}</div>
            <p className="text-xs text-muted-foreground">Currently in use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft BOMs</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draftBoms}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Combined cost estimate</p>
          </CardContent>
        </Card>
      </div>

      {/* BOM List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All BOMs</CardTitle>
              <CardDescription>View and manage all Bills of Materials</CardDescription>
            </div>
          </div>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search BOMs by name, part number, or project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBoms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'No BOMs found' : 'No BOMs Yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Create your first BOM from a project'}
              </p>
              {!searchQuery && (
                <Button onClick={() => router.push('/projects')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Go to Projects
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>BOM Name</TableHead>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBoms.map((bom) => (
                    <TableRow
                      key={bom.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/projects/${bom.projectId}/bom/${bom.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{bom.name}</p>
                          <p className="text-xs text-muted-foreground">v{bom.version}</p>
                        </div>
                      </TableCell>
                      <TableCell>{bom.id.substring(0, 8)}...</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FolderKanban className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{bom.projectId.substring(0, 8)}...</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={bom.status === 'released' || bom.status === 'approved' ? 'default' : 'secondary'}
                          className="capitalize"
                        >
                          {bom.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{bom.totalItems}</TableCell>
                      <TableCell className="text-right">
                        ${(bom.totalCost || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(bom.updatedAt), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/projects/${bom.projectId}/bom/${bom.id}`);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
