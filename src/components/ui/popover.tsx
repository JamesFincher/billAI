'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Popover({ open, onOpenChange, children }: PopoverProps) {
  const [isOpen, setIsOpen] = useState(open || false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        const newState = false;
        setIsOpen(newState);
        onOpenChange?.(newState);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onOpenChange]);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onOpenChange?.(newState);
  };

  return (
    <div ref={popoverRef} className="relative">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === PopoverTrigger) {
            return React.cloneElement(child as React.ReactElement<PopoverTriggerProps>, { onClick: handleToggle });
          }
          if (child.type === PopoverContent) {
            return isOpen ? child : null;
          }
        }
        return child;
      })}
    </div>
  );
}

interface PopoverTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function PopoverTrigger({ asChild, children, onClick }: PopoverTriggerProps) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children.props as any).onClick?.(e);
        onClick?.();
      }
    });
  }

  return (
    <button onClick={onClick} className="inline-block">
      {children}
    </button>
  );
}

interface PopoverContentProps {
  className?: string;
  children: React.ReactNode;
}

export function PopoverContent({ className, children }: PopoverContentProps) {
  return (
    <div
      className={cn(
        'absolute top-full left-0 z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg',
        className
      )}
    >
      {children}
    </div>
  );
} 