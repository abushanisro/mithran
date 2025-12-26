'use client'

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { NavLink } from '@/components/common/nav-link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface SubItem {
  id: string;
  title: string;
  url: string;
}

interface AdditionalItem {
  title: string;
  url: string;
  icon?: React.ElementType;
}

interface CollapsibleNavItemProps {
  title: string;
  icon: React.ElementType;
  baseUrl: string;
  items: SubItem[];
  collapsed: boolean;
  onAddClick?: () => void;
  addLabel?: string;
  additionalItems?: AdditionalItem[];
}

export function CollapsibleNavItem({
  title,
  icon: Icon,
  baseUrl,
  items,
  collapsed,
  onAddClick,
  addLabel = 'Add New',
  additionalItems = [],
}: CollapsibleNavItemProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(() =>
    pathname ? pathname.startsWith(baseUrl) : false
  );

  const isActive = pathname ? pathname.startsWith(baseUrl) : false;

  if (collapsed) {
    return (
      <NavLink
        href={baseUrl}
        className={cn(
          'sidebar-item group justify-center',
          isActive && 'sidebar-item-active'
        )}
        activeClassName="sidebar-item-active"
      >
        <Icon className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          isActive ? 'text-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
        )} />
      </NavLink>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-1">
        <NavLink
          href={baseUrl}
          className={cn(
            'sidebar-item group flex-1',
            isActive && 'sidebar-item-active'
          )}
          activeClassName="sidebar-item-active"
        >
          <div className="flex items-center gap-3">
            <Icon className={cn(
              'h-4 w-4 shrink-0 transition-colors',
              isActive ? 'text-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground'
            )} />
            <span className="text-sm">{title}</span>
          </div>
        </NavLink>
        <CollapsibleTrigger asChild>
          <button
            className="h-8 w-8 p-0 hover:bg-sidebar-accent rounded-md flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/40" />
            ) : (
              <ChevronRight className="h-4 w-4 text-sidebar-foreground/40" />
            )}
          </button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="pl-4 space-y-1 mt-1">
        {additionalItems.map((item, index) => (
          <NavLink
            key={`additional-${index}`}
            href={item.url}
            className="sidebar-item group text-xs py-1.5 flex items-center gap-2"
            activeClassName="sidebar-item-active"
          >
            {item.icon && <item.icon className="h-3 w-3 text-sidebar-foreground/50" />}
            <span className="text-sidebar-foreground/70">{item.title}</span>
          </NavLink>
        ))}
        {items.slice(0, 5).map((item) => (
          <NavLink
            key={item.id}
            href={item.url}
            className="sidebar-item group text-xs py-1.5 truncate"
            activeClassName="sidebar-item-active"
          >
            <span className="truncate text-sidebar-foreground/70">{item.title}</span>
          </NavLink>
        ))}
        {onAddClick && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
            onClick={(e) => {
              e.stopPropagation();
              onAddClick();
            }}
          >
            <Plus className="h-3 w-3 mr-2" />
            {addLabel}
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
