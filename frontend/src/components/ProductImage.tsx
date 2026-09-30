import React, { useEffect, useState } from 'react';
import { productEmoji } from '../services/productEmoji';

interface ProductImageProps {
  src?: string | null;
  /** Product name — drives the emoji fallback. */
  name: string;
  /** Tailwind size classes for the wrapper box, e.g. "w-11 h-11". */
  className?: string;
  /** Emoji font size class, defaults to text-xl. */
  emojiClassName?: string;
  /** Extra classes for the wrapper's background/rounding. */
  wrapperClassName?: string;
}

/**
 * Product image with a graceful emoji fallback:
 *  - shows the product emoji immediately (no blank flash while loading)
 *  - cross-fades to the photo once loaded
 *  - stays on the emoji forever if the URL is missing or fails
 * Offline-first: if the network is down the emoji simply remains.
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  name,
  className = 'w-11 h-11',
  emojiClassName = 'text-xl',
  wrapperClassName = 'bg-orange-50',
}) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // Reset when switching to a different product/image
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  const showImage = !!src && !failed;

  return (
    <div className={`${className} ${wrapperClassName} rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 relative`}>
      {/* Emoji underlay: visible while loading, after failure, or when src missing */}
      <span
        className={`${emojiClassName} transition-opacity duration-200 ${
          loaded ? 'opacity-0' : 'opacity-100'
        } absolute`}
      >
        {productEmoji(name)}
      </span>
      {showImage && (
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};
