
'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import { Badge } from '@/modules/shared/components/ui/ui/badge';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/modules/shared/components/ui/ui/command';
import { Command as CommandPrimitive } from 'cmdk';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';

export type Option = Record<'value' | 'label', string>;

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select options...',
  className,
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  
  // Safeguard against non-array values for 'selected' prop
  const safeSelected = Array.isArray(selected) ? selected : [];

  const handleUnselect = React.useCallback((value: string) => {
    onChange(safeSelected.filter((s) => s !== value));
  }, [onChange, safeSelected]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (input.value === '' && safeSelected.length > 0) {
            handleUnselect(safeSelected[safeSelected.length - 1]);
          }
        }
        if (e.key === 'Escape') {
          input.blur();
        }
      }
    },
    [handleUnselect, safeSelected]
  );

  const selectedObjects = options.filter(option => safeSelected.includes(option.value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={`w-full justify-between ${safeSelected.length > 0 ? 'h-full' : 'h-10'}`}
                onClick={() => setOpen(!open)}
            >
                <div className="flex gap-1 flex-wrap">
                    {selectedObjects.length > 0 ? (
                        selectedObjects.map(option => (
                        <Badge
                            key={option.value}
                            variant="secondary"
                            className="mr-1"
                        >
                            {option.label}
                            <span
                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleUnselect(option.value);
                                    }
                                }}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onClick={() => handleUnselect(option.value)}
                            >
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </span>
                        </Badge>
                        ))
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                </div>
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
             <Command onKeyDown={handleKeyDown}>
              <CommandList>
                <CommandPrimitive.Input
                  ref={inputRef}
                  placeholder="Search..."
                  className="w-full px-3 py-2 text-sm border-b outline-none placeholder:text-muted-foreground"
                />
                <CommandGroup className="max-h-60 overflow-auto">
                  {options.map((option) => {
                    const isSelected = safeSelected.includes(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        onSelect={() => {
                          if (isSelected) {
                            handleUnselect(option.value);
                          } else {
                            onChange([...safeSelected, option.value]);
                          }
                        }}
                      >
                        <div
                          className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary ${
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'opacity-50 [&_svg]:invisible'
                          }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        {option.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
        </PopoverContent>
    </Popover>
   
  );
}


