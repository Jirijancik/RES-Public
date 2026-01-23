import { cn } from "@/lib/utils";

export function PatternGrid({
  gridSize = 100,
  className,
  ...props
}: Omit<React.ComponentProps<"svg">, "children"> & { gridSize?: number }) {
  return (
    <svg
      {...props}
      aria-hidden="true"
      className={cn(
        "mask-[radial-gradient(100%_100%_at_top_right,white,transparent)]",
        "stroke-border",
        className
      )}
    >
      <defs>
        <pattern
          x="50%"
          y={-1}
          id="983e3e4c-de6d-4c3f-8d64-b9761d1534cc"
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <path d={`M.5 ${gridSize}V.5H${gridSize}`} fill="none" />
        </pattern>
      </defs>
      <svg x="50%" y={-1} className="fill-primary/10 overflow-visible">
        <path
          d={`M-${gridSize} 0h${gridSize + 1}v${gridSize + 1}h-${gridSize + 1}Z M${3 * gridSize} 0h${gridSize + 1}v${gridSize + 1}h-${gridSize + 1}Z M-${2 * gridSize} ${3 * gridSize}h${gridSize + 1}v${gridSize + 1}h-${gridSize + 1}Z M${gridSize} ${4 * gridSize}h${gridSize + 1}v${gridSize + 1}h-${gridSize + 1}Z`}
          strokeWidth={0}
        />
      </svg>
      <rect
        fill="url(#983e3e4c-de6d-4c3f-8d64-b9761d1534cc)"
        width="100%"
        height="100%"
        strokeWidth={0}
      />
    </svg>
  );
}
