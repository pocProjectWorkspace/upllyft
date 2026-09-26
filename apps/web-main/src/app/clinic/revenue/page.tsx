'use client';

// Revenue is served at /reports — redirect to keep sidebar link working
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RevenuePage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/clinic/reports');
    }, [router]);
    return null;
}
