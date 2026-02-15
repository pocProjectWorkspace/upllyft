'use client';

import { useEffect, useRef } from 'react';
import { Card, Badge } from '@upllyft/ui';
import { trackAdImpression, trackAdClick, type BannerAd } from '@/lib/api/ads';

interface FeedAdProps {
  ad: BannerAd;
}

export function FeedAd({ ad }: FeedAdProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackAdImpression(ad.id).catch(() => {});
    }
  }, [ad.id]);

  function handleClick() {
    trackAdClick(ad.id).catch(() => {});
  }

  return (
    <Card className="overflow-hidden border border-gray-100">
      <a
        href={ad.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="block"
      >
        {ad.imageUrl && (
          <img
            src={ad.imageUrl}
            alt={ad.title}
            className="w-full h-40 object-cover"
          />
        )}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Badge color="gray">Sponsored</Badge>
          </div>
          <h3 className="text-sm font-medium text-gray-900">{ad.title}</h3>
          {ad.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ad.description}</p>
          )}
        </div>
      </a>
    </Card>
  );
}
