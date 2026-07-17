import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-center space-x-2 py-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white border border-white/10"
      >
        Previous
      </button>
      <span className="text-sm text-white/60">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white border border-white/10"
      >
        Next
      </button>
    </div>
  );
}
