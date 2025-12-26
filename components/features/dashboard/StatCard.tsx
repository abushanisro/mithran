'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  sparklineData?: { value: number }[];
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
}

const variantStyles = {
  default: 'border-border hover:border-primary/30',
  primary: 'border-primary/20 hover:border-primary/40',
  success: 'border-success/20 hover:border-success/40',
  warning: 'border-warning/20 hover:border-warning/40',
  destructive: 'border-destructive/20 hover:border-destructive/40',
};

const iconBgStyles = {
  default: 'bg-muted',
  primary: 'bg-primary/10',
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  destructive: 'bg-destructive/10',
};

const sparklineColors = {
  default: 'hsl(var(--primary))',
  primary: 'hsl(var(--primary))',
  success: 'hsl(var(--success))',
  warning: 'hsl(var(--warning))',
  destructive: 'hsl(var(--destructive))',
};

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  sparklineData,
  className,
  variant = 'default',
}: StatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change !== undefined && change === 0;

  return (
    <div
      className={cn(
        'stat-card relative overflow-hidden group',
        variantStyles[variant],
        className
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1 tracking-tight">{value}</p>
          </div>
          {icon && (
            <div className={cn('p-2.5 rounded-lg shrink-0', iconBgStyles[variant])}>
              {icon}
            </div>
          )}
        </div>

        <div className="flex items-end justify-between mt-auto pt-2">
          {change !== undefined && (
            <div className="flex items-center gap-1.5">
              <div className={cn(
                'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                isPositive && 'text-success bg-success/10',
                isNegative && 'text-destructive bg-destructive/10',
                isNeutral && 'text-muted-foreground bg-muted'
              )}>
                {isPositive && <TrendingUp className="h-3 w-3" />}
                {isNegative && <TrendingDown className="h-3 w-3" />}
                {isNeutral && <Minus className="h-3 w-3" />}
                <span>
                  {isPositive && '+'}
                  {change}%
                </span>
              </div>
              {changeLabel && (
                <span className="text-xs text-muted-foreground/70">
                  {changeLabel}
                </span>
              )}
            </div>
          )}

          {sparklineData && sparklineData.length > 0 && (
            <div className="w-20 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id={`gradient-${variant}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={sparklineColors[variant]} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={sparklineColors[variant]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={sparklineColors[variant]}
                    strokeWidth={2}
                    fill={`url(#gradient-${variant})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}