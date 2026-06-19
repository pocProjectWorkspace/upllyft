'use client';

import { use } from 'react';
import { ReviewsTab } from '@/components/tabs/reviews-tab';

export default function ReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ReviewsTab caseId={id} />;
}
