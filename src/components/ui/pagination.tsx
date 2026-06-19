import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Root wrapper ─── */
function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}
Pagination.displayName = "Pagination";

/* ─── Content row ─── */
function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}
PaginationContent.displayName = "PaginationContent";

/* ─── Single item slot ─── */
function PaginationItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("", className)} {...props} />;
}
PaginationItem.displayName = "PaginationItem";

/* ─── Page link / button ─── */
type PaginationLinkProps = {
  isActive?: boolean;
  disabled?: boolean;
} & React.ComponentProps<"button">;

function PaginationLink({
  className,
  isActive,
  disabled,
  children,
  ...props
}: PaginationLinkProps) {
  return (
    <button
      aria-current={isActive ? "page" : undefined}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center min-w-[36px] sm:min-w-[40px] h-9 sm:h-10 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20",
        isActive
          ? "bg-white text-black shadow-sm"
          : "border border-border-subtle bg-bg-card text-text-secondary hover:bg-bg-hover hover:text-white",
        disabled && "opacity-30 cursor-not-allowed pointer-events-none",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
PaginationLink.displayName = "PaginationLink";

/* ─── Previous button ─── */
function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<"button"> & { disabled?: boolean }) {
  return (
    <button
      aria-label="Go to previous page"
      className={cn(
        "flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-border-subtle bg-bg-card text-text-secondary text-xs sm:text-sm hover:bg-bg-hover hover:text-white transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20",
        props.disabled && "opacity-30 cursor-not-allowed pointer-events-none",
        className
      )}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Previous</span>
    </button>
  );
}
PaginationPrevious.displayName = "PaginationPrevious";

/* ─── Next button ─── */
function PaginationNext({
  className,
  ...props
}: React.ComponentProps<"button"> & { disabled?: boolean }) {
  return (
    <button
      aria-label="Go to next page"
      className={cn(
        "flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-border-subtle bg-bg-card text-text-secondary text-xs sm:text-sm hover:bg-bg-hover hover:text-white transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20",
        props.disabled && "opacity-30 cursor-not-allowed pointer-events-none",
        className
      )}
      {...props}
    >
      <span className="hidden sm:inline">Next</span>
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}
PaginationNext.displayName = "PaginationNext";

/* ─── Ellipsis ─── */
function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-9 w-9 items-center justify-center text-text-muted",
        className
      )}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
};
