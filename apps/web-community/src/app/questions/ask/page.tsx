'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AskQuestionRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/posts/create?type=QUESTION');
  }, [router]);

  return null;
}
