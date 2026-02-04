import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'safe' | 'warning' | 'emergency' | 'info';
  onClick?: () => void;
  clickable?: boolean;
}

export function StatCard({ title, value, icon, trend, variant = 'default', onClick, clickable }: StatCardProps) {
  const variantStyles = {
    default: 'bg-card border-border',
    safe: 'bg-safe-muted border-safe/20',
    warning: 'bg-warning-muted border-warning/20',
    emergency: 'bg-emergency-muted border-emergency/20',
    info: 'bg-info-muted border-info/20',
  };

  const iconStyles = {
    default: 'bg-secondary text-foreground',
    safe: 'bg-safe/10 text-safe',
    warning: 'bg-warning/10 text-warning',
    emergency: 'bg-emergency/10 text-emergency',
    info: 'bg-info/10 text-info',
  };

  const isClickable = clickable || !!onClick;

  return (
    <div 
      className={cn(
        'p-6 rounded-xl border shadow-sm animate-fade-in h-full',
        variantStyles[variant],
        isClickable && 'cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200'
      )}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); } : undefined}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className={cn(
              'mt-2 text-sm font-medium',
              trend.isPositive ? 'text-safe' : 'text-emergency'
            )}>
              {trend.isPositive ? '↓' : '↑'} {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        <div className={cn(
          'p-3 rounded-lg',
          iconStyles[variant]
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
