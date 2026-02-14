import type { Metadata } from 'next';
import PostDetailClient from './post-detail-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const res = await fetch(`${API_URL}/posts/${id}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return { title: 'Post | Upllyft Community' };
    }

    const post = await res.json();
    const description = post.content?.substring(0, 160) || '';

    return {
      title: `${post.title} | Upllyft Community`,
      description,
      openGraph: {
        title: post.title,
        description,
        url: `/posts/${id}`,
        siteName: 'Upllyft Community',
        type: 'article',
        ...(post.author?.name ? { authors: [post.author.name] } : {}),
      },
      twitter: {
        card: 'summary',
        title: post.title,
        description,
      },
    };
  } catch {
    return { title: 'Post | Upllyft Community' };
  }
}

export default function PostDetailPage() {
  return <PostDetailClient />;
}
