'use client';

import { useEffect, useRef, useState } from 'react';
import { trackBannerAdImpression, trackBannerAdClick } from '@/lib/api/banner-ads';
import type { BannerAd } from '@/lib/api/banner-ads';

interface FeedAdProps {
    ad: BannerAd;
    className?: string;
}

export function FeedAd({ ad, className = '' }: FeedAdProps) {
    const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (hasTrackedImpression || !containerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (entry.isIntersecting) {
                    trackBannerAdImpression(ad.id).catch(console.error);
                    setHasTrackedImpression(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.5 } // Track impression when at least 50% visible
        );

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [ad.id, hasTrackedImpression]);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        trackBannerAdClick(ad.id).catch(console.error);
        window.open(ad.targetUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div
            ref={containerRef}
            className={`relative py-4 w-full cursor-pointer ${className}`}
            onClick={handleClick}
        >
            <div className="absolute top-6 right-2 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white font-medium z-10 pointer-events-none">
                Sponsored
            </div>
            <div className="rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    className="w-full h-auto object-cover"
                    style={{ maxHeight: ad.placement === 'BANNER_TOP' ? '120px' : '250px' }}
                />
            </div>
        </div>
    );
}
