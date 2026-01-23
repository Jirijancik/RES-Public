import { ArrowRight, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link, type LinkProps } from "@/components/ui/link";
import { cn } from "@/lib/utils";

export function Banner({
  children,
  isOpen: controlledIsOpen,
  isDefaultOpen = true,
  onClose,
  isDismissable = true,
  className,
  ...props
}: React.ComponentPropsWithRef<"div"> & {
  children: React.ReactNode;
  isOpen?: boolean;
  isDefaultOpen?: boolean;
  onClose?: (isOpen: boolean) => void;
  isDismissable?: boolean;
}) {
  const isControlled = controlledIsOpen !== undefined;
  const [internalIsOpen, setInternalIsOpen] = useState(isDefaultOpen);

  const isComputedOpen = isControlled ? controlledIsOpen : internalIsOpen;

  function handleOpenChange(newIsOpen: boolean) {
    if (!isControlled) {
      setInternalIsOpen(newIsOpen);
    }

    if (onClose) {
      onClose(newIsOpen);
    }
  }

  useEffect(() => {
    if (isControlled) {
      Promise.resolve().then(() => {
        setInternalIsOpen(controlledIsOpen);
      });
    }
  }, [isControlled, controlledIsOpen]);

  if (!isComputedOpen) return null;

  return (
    <div
      {...props}
      className={cn(
        "bg-primary text-primary-foreground flex items-center gap-x-6 px-6 py-2.5 sm:px-3.5 sm:before:flex-1",
        !isDismissable && "sm:after:flex-1",
        className
      )}
    >
      <p className="text-sm leading-6">{children}</p>
      {isDismissable && (
        <div className="flex flex-1 justify-end">
          <BannerCloseButton onClick={() => handleOpenChange(false)} />
        </div>
      )}
    </div>
  );
}

export function BannerCloseButton({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "children" | "variant" | "size">) {
  return (
    <Button
      {...props}
      variant="ghost"
      size="icon"
      className={cn(
        "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground h-6 w-6",
        className
      )}
    >
      <span
        className="absolute top-1/2 left-1/2 size-[max(100%,2.75rem)] -translate-x-1/2 -translate-y-1/2 pointer-fine:hidden"
        aria-hidden="true"
      />
      <span className="sr-only">Close alert</span>
      <XIcon className="size-4" />
    </Button>
  );
}

export function BannerTitle({ className, ...props }: React.ComponentPropsWithRef<"strong">) {
  return <strong {...props} className={cn("font-semibold", className)} />;
}

export function BannerDescription({ className, ...props }: React.ComponentPropsWithRef<"span">) {
  return <span {...props} className={cn("opacity-80", className)} />;
}

export function BannerDivider({ className, ...props }: React.ComponentPropsWithRef<"svg">) {
  return (
    <svg
      {...props}
      viewBox="0 0 2 2"
      aria-hidden="true"
      className={cn("mx-2 inline size-0.5 fill-current", className)}
    >
      <circle r={1} cx={1} cy={1} />
    </svg>
  );
}

export function BannerLink({ className, ...props }: LinkProps) {
  return (
    <Link
      {...props}
      className={cn(
        "bg-secondary text-secondary-foreground hover:bg-secondary/80 mx-4 rounded-full px-3.5 py-1 text-sm leading-6 font-semibold whitespace-nowrap transition-colors",
        className
      )}
    >
      {props.children}
      <ArrowRight aria-hidden="true" className="ml-2 inline size-[1em]" />
    </Link>
  );
}
