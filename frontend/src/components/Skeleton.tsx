import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <div className={`bg-stone-200 rounded animate-pulse ${className}`} />
  );
};

export const BookCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-orange-100/50 p-4 space-y-4 flex flex-col h-full shadow-sm">
      {/* Cover Shimmer */}
      <div className="aspect-[3/4] bg-stone-100 rounded-xl relative overflow-hidden animate-shimmer" />
      
      {/* Title / Info Shimmer */}
      <div className="space-y-2 flex-grow">
        <div className="h-3 w-1/3 bg-stone-200 rounded animate-shimmer" />
        <div className="h-4 w-3/4 bg-stone-200 rounded animate-shimmer" />
        <div className="h-3 w-1/2 bg-stone-200 rounded animate-shimmer" />
        <div className="space-y-1 pt-2">
          <div className="h-2.5 w-full bg-stone-200 rounded animate-shimmer" />
          <div className="h-2.5 w-5/6 bg-stone-200 rounded animate-shimmer" />
        </div>
      </div>
      
      {/* Button Shimmer */}
      <div className="h-8 w-full bg-stone-200 rounded-xl animate-shimmer mt-4" />
    </div>
  );
};

export const BookGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <BookCardSkeleton key={idx} />
      ))}
    </div>
  );
};
export default Skeleton;
