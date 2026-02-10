import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
}

export function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between gap-4 pt-4 flex-wrap" data-testid="table-pagination">
      <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
        Showing {startItem}-{endItem} of {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          data-testid="button-prev-page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((page) => {
            if (totalPages <= 5) return true;
            if (page === 1 || page === totalPages) return true;
            if (Math.abs(page - currentPage) <= 1) return true;
            return false;
          })
          .reduce<(number | "ellipsis")[]>((acc, page, idx, arr) => {
            if (idx > 0 && page - (arr[idx - 1] as number) > 1) {
              acc.push("ellipsis");
            }
            acc.push(page);
            return acc;
          }, [])
          .map((item, idx) =>
            item === "ellipsis" ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                ...
              </span>
            ) : (
              <Button
                key={item}
                variant={item === currentPage ? "default" : "outline"}
                size="icon"
                onClick={() => onPageChange(item)}
                data-testid={`button-page-${item}`}
              >
                {item}
              </Button>
            )
          )}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          data-testid="button-next-page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function usePagination<T>(items: T[], pageSize: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedItems = items.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  return {
    currentPage: safeCurrentPage,
    totalPages,
    paginatedItems,
    setCurrentPage,
    totalItems: items.length,
    pageSize,
  };
}
