'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/status-badge';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  ArrowLeft,
  ClipboardList,
  DollarSign,
  FileSpreadsheet,
  TrendingUp,
  Package,
  Layers,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { useProject, useBOMs } from '@/lib/api/hooks';
import { ModuleDetails } from '@/components/features/projects/ModuleDetails';
import { BOMCreateDialog } from '@/components/features/bom';

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: sourcingListsData, isLoading: listsLoading } = useBOMs({ projectId: id });
  const sourcingLists = sourcingListsData?.boms || [];

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/projects')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader title={project.name} description={project.description || 'Project overview and cost management'}>
          <Button onClick={() => setCreateDialogOpen(true)} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Create BOM
          </Button>
        </PageHeader>
      </div>

      {/* Cost Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Project Status</p>
                <StatusBadge status={project.status} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Quoted Cost</p>
                <p className="text-xl font-bold text-foreground">
                  {project.quotedCost ? `$${Number(project.quotedCost).toLocaleString()}` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Should Cost</p>
                <p className="text-xl font-bold text-foreground">
                  {project.shouldCost ? `$${Number(project.shouldCost).toLocaleString()}` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <FileSpreadsheet className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Active BOMs</p>
                <p className="text-xl font-bold text-foreground">{sourcingLists.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* BOM Management Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create BOM Card */}
        <Card
          className="border-2 border-dashed border-primary/50 hover:border-primary transition-all cursor-pointer hover:shadow-lg lg:col-span-1 bg-primary/5"
          onClick={() => setCreateDialogOpen(true)}
        >
          <CardHeader className="text-center pb-4">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-lg">Create New BOM</CardTitle>
            <CardDescription className="text-sm">
              Start a new Bill of Materials for casting components and assemblies
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center pb-6">
            <Button className="w-full gap-2" size="lg">
              <FileSpreadsheet className="h-4 w-4" />
              Create BOM
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {/* BOM List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Bills of Materials
                </CardTitle>
                <CardDescription>Manage your project BOMs and cost breakdowns</CardDescription>
              </div>
              {sourcingLists.length > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {sourcingLists.length} {sourcingLists.length === 1 ? 'BOM' : 'BOMs'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {listsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                <p className="text-sm text-muted-foreground mt-4">Loading BOMs...</p>
              </div>
            ) : sourcingLists.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No BOMs Yet</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                  Create your first Bill of Materials to start managing parts, materials, and costs for this project
                </p>
                <Button onClick={() => setCreateDialogOpen(true)} size="lg" className="gap-2">
                  <Plus className="h-5 w-5" />
                  Create First BOM
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sourcingLists.map((list) => (
                  <Card
                    key={list.id}
                    className="cursor-pointer hover:shadow-md transition-all border-l-4 border-l-primary/50 hover:border-l-primary"
                    onClick={() => router.push(`/projects/${id}/bom/${list.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileSpreadsheet className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-foreground">{list.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                v{list.version || '1.0'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Created {format(new Date(list.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/projects/${id}/bom/${list.id}`);
                          }}
                        >
                          Open
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Module Details */}
      <ModuleDetails projectId={id} />

      {/* BOM Create Dialog */}
      <BOMCreateDialog
        projectId={id}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}
