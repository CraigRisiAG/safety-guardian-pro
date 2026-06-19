import { ReactElement } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DelayedHelpTooltipProps {
  content: string;
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayMs?: number;
}

export function DelayedHelpTooltip({
  content,
  children,
  side = 'top',
  delayMs = 1800,
}: DelayedHelpTooltipProps) {
  return (
    <TooltipProvider delayDuration={delayMs}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side}>
          <p className="max-w-xs text-xs leading-relaxed">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
