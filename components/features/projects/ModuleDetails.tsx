'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Box,
  ClipboardCheck,
  DollarSign,
  UserCheck,
  Handshake,
  Factory,
  Truck,
  ChevronRight,
  CheckCircle2,
  Clock,
  Circle,
} from 'lucide-react';

interface ModuleItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
  subItems?: string[];
}

interface ModuleDetailsProps {
  projectId: string;
}

export function ModuleDetails({ projectId: _projectId }: ModuleDetailsProps) {
  const modules: ModuleItem[] = [
    {
      id: 'bom_creation',
      title: 'BOM Creation',
      icon: <FileText className="h-5 w-5" />,
      status: 'pending',
      subItems: ['2D BOM', '3D BOM'],
    },
    {
      id: 'process_plan_dfm',
      title: 'Process Plan & DFM Check',
      icon: <ClipboardCheck className="h-5 w-5" />,
      status: 'pending',
    },
    {
      id: 'should_costing',
      title: 'Should Costing',
      icon: <DollarSign className="h-5 w-5" />,
      status: 'pending',
    },
    {
      id: 'supplier_evaluation',
      title: 'Supplier Evaluation',
      icon: <UserCheck className="h-5 w-5" />,
      status: 'pending',
      subItems: ['Supplier Shortlist', 'RFQ Sent (SSG)', 'Supplier Audit'],
    },
    {
      id: 'supplier_nomination',
      title: 'Supplier Nomination',
      icon: <Handshake className="h-5 w-5" />,
      status: 'pending',
      subItems: ['Negotiation', 'Supplier Analysis'],
    },
    {
      id: 'production_planning',
      title: 'Production Planning',
      icon: <Factory className="h-5 w-5" />,
      status: 'pending',
      subItems: ['ISIR/FIA Sample Submission', 'PPAP Lot', 'Batch Lot'],
    },
    {
      id: 'delivery',
      title: 'Delivery',
      icon: <Truck className="h-5 w-5" />,
      status: 'pending',
      subItems: ['Packing', 'Logistics'],
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'bg-muted text-muted-foreground' },
      in_progress: { label: 'In Progress', className: 'bg-warning/10 text-warning border-warning/20' },
      completed: { label: 'Completed', className: 'bg-success/10 text-success border-success/20' },
      on_hold: { label: 'On Hold', className: 'bg-destructive/10 text-destructive border-destructive/20' },
    };

    const variant = variants[status] || variants.pending!;
    return (
      <Badge variant="outline" className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Box className="h-5 w-5 text-primary" />
          Module Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {modules.map((module) => (
            <div
              key={module.id}
              className="group rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-all"
            >
              <div className="flex items-center justify-between p-4 cursor-pointer">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(module.status)}
                  <div className="flex items-center gap-2 text-primary opacity-70">
                    {module.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{module.title}</p>
                    {module.subItems && module.subItems.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {module.subItems.join(' • ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(module.status)}
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
