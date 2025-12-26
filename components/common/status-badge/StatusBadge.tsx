import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  raw_material_procurement: {
    label: 'Raw Material',
    className: 'bg-info/10 text-info border-info/20',
  },
  dfm_dfa_analysis: {
    label: 'DFM/DFA',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  process_planning: {
    label: 'Process Planning',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  should_costing: {
    label: 'Should Costing',
    className: 'bg-accent/10 text-accent border-accent/20',
  },
  quoted: {
    label: 'Quoted',
    className: 'bg-success/10 text-success border-success/20',
  },
  cost_driver_analysis: {
    label: 'Cost Drivers',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  value_negotiation: {
    label: 'Negotiation',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  production: {
    label: 'Production',
    className: 'bg-success/10 text-success border-success/20',
  },
  supply_chain: {
    label: 'Supply Chain',
    className: 'bg-info/10 text-info border-info/20',
  },
  lost: {
    label: 'Lost',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-muted text-muted-foreground border-muted',
  };

  return (
    <span
      className={cn(
        'badge-status border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

export function getStatusLabel(status: string): string {
  return statusConfig[status]?.label || status;
}