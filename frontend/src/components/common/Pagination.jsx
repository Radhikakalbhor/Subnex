import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
}) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  if (totalPages <= 1) return null;

  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white/30 backdrop-blur-sm border-t border-black/[0.06]">
      <div className="text-xs text-neutral-500">
        Showing <span className="font-semibold text-neutral-800">{startIdx}</span> to{' '}
        <span className="font-semibold text-neutral-800">{endIdx}</span> of{' '}
        <span className="font-semibold text-neutral-800">{totalItems}</span> entries
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-neutral-700 bg-[#F5F6F8] hover:bg-[#EAEBED] border border-black/[0.04] rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1" strokeWidth={1.75} />
          Previous
        </button>
        <span className="text-xs font-medium text-neutral-500 px-2">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-neutral-700 bg-[#F5F6F8] hover:bg-[#EAEBED] border border-black/[0.04] rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5 ml-1" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
