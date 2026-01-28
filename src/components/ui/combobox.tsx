"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
  onBlur?: () => void;
  clearable?: boolean;
}

function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled = false,
  id,
  "aria-invalid": ariaInvalid,
  onBlur,
  clearable = true,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listboxId = React.useId();

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  function handleSelect(optionValue: string) {
    onValueChange?.(optionValue);
    setOpen(false);
    setSearch("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onValueChange?.("");
    setSearch("");
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (newOpen) {
      setSearch("");
      // Focus input when opening
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      onBlur?.();
    }
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-invalid={ariaInvalid}
          className={cn(
            "border-input bg-background flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
            "dark:bg-input/30"
          )}
        >
          <span
            className={cn(
              "line-clamp-1 flex-1 text-left",
              !selectedOption && "text-muted-foreground"
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <span className="flex items-center gap-1">
            {clearable && value ? (
              <span
                role="button"
                tabIndex={-1}
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground rounded-sm p-0.5 transition-colors"
              >
                <XIcon className="size-3.5" />
              </span>
            ) : null}
            <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
          </span>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className={cn(
            "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-md border shadow-md"
          )}
        >
          <div className="p-2">
            <input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "placeholder:text-muted-foreground border-input bg-background h-8 w-full rounded-md border px-2 text-sm outline-none",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              )}
            />
          </div>
          <div id={listboxId} role="listbox" className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="text-muted-foreground px-2 py-4 text-center text-sm">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
                    option.value === value && "bg-accent"
                  )}
                >
                  <span className="absolute left-2 flex size-3.5 items-center justify-center">
                    {option.value === value ? (
                      <CheckIcon className="size-4" />
                    ) : null}
                  </span>
                  {option.label}
                </button>
              ))
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export { Combobox };
