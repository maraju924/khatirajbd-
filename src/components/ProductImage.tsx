import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { ProductCategory } from '../types';

interface ProductImageProps {
  src: string;
  alt: string;
  category?: ProductCategory;
  className?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  category = 'honey',
  className = 'w-full h-full object-cover',
}) => {
  const [hasError, setHasError] = useState(false);

  const fallbackGradient: Record<ProductCategory, string> = {
    honey: 'from-amber-600/15 via-stone-100 to-emerald-900/10',
    ghee_oil: 'from-yellow-600/15 via-stone-100 to-emerald-900/10',
    superfoods: 'from-emerald-800/15 via-stone-100 to-rose-900/10',
    nuts_dates: 'from-amber-800/15 via-stone-100 to-stone-200',
    wellness: 'from-emerald-900/15 via-stone-100 to-amber-700/10',
    skincare: 'from-rose-700/15 via-stone-100 to-amber-700/10',
    kitchen_cutlery: 'from-slate-700/15 via-stone-100 to-emerald-900/10',
    combo: 'from-amber-700/15 via-stone-100 to-emerald-900/15',
    fashion: 'from-emerald-900/10 via-stone-100 to-amber-900/10',
    electronics: 'from-zinc-900/10 via-stone-100 to-emerald-900/10',
    jewellery: 'from-amber-600/15 via-stone-100 to-yellow-900/10',
    organic_food: 'from-amber-700/10 via-stone-100 to-emerald-800/10',
    home_lifestyle: 'from-orange-800/10 via-stone-100 to-stone-200',
  };

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br ${
          fallbackGradient[category] || fallbackGradient.honey
        } p-6 text-center select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-12 h-12 rounded-xl bg-white/90 border border-stone-200/80 flex items-center justify-center text-[#0E4B2D] mb-2.5 shadow-2xs">
          <Package className="w-6 h-6" />
        </div>
        <span className="text-xs font-medium text-zinc-700 line-clamp-2 max-w-[20ch]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
