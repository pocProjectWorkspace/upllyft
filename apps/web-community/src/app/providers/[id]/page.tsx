'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CommunityShell } from '@/components/community-shell';
import { useProvider } from '@/hooks/use-providers';
import { trackContactClick } from '@/lib/api/providers';
import { Button, Card, Badge, Skeleton } from '@upllyft/ui';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ProviderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: provider, isLoading } = useProvider(id);

  function handleContactClick() {
    if (provider) {
      trackContactClick(provider.id);
    }
  }

  function handleShare() {
    if (navigator.share && provider) {
      navigator.share({
        title: provider.organizationName,
        text: `Check out ${provider.organizationName} on Upllyft`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  if (isLoading) {
    return (
      <CommunityShell>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-24" />
          <Card className="p-6 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </Card>
        </div>
      </CommunityShell>
    );
  }

  if (!provider) {
    return (
      <CommunityShell>
        <div className="max-w-3xl mx-auto text-center py-20">
          <h2 className="text-xl font-semibold text-gray-900">Provider not found</h2>
          <p className="text-gray-500 mt-2">This provider may have been removed or doesn't exist.</p>
          <Link href="/providers">
            <Button variant="outline" className="mt-4">Back to Providers</Button>
          </Link>
        </div>
      </CommunityShell>
    );
  }

  return (
    <CommunityShell>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back */}
        <Link href="/providers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Providers
        </Link>

        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{provider.organizationName}</h1>
            {provider.isVerified && (
              <svg className="w-6 h-6 text-teal-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge color="teal">{provider.organizationType}</Badge>
            <Badge color="blue">
              {provider.city}, {provider.state}
            </Badge>
            {provider.isVerified && <Badge color="green">Verified</Badge>}
          </div>
        </div>

        {/* Details card */}
        <Card className="p-6 space-y-6">
          {/* Contact person */}
          {provider.contactPersonName && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Contact Person</h3>
              <p className="text-gray-700">{provider.contactPersonName}</p>
            </div>
          )}

          {/* Full address */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Address</h3>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-700">{provider.address}</p>
                <p className="text-gray-700">{provider.city}, {provider.state}</p>
                {provider.country && <p className="text-gray-500 text-sm">{provider.country}</p>}
              </div>
            </div>
          </div>

          {/* Contact section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Contact</h3>
            <div className="space-y-3">
              {provider.contactNumber && (
                <a
                  href={`tel:${provider.contactNumber}`}
                  onClick={handleContactClick}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-teal-600">{provider.contactNumber}</p>
                  </div>
                </a>
              )}

              {provider.email && (
                <a
                  href={`mailto:${provider.email}`}
                  onClick={handleContactClick}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-sm text-teal-600">{provider.email}</p>
                  </div>
                </a>
              )}

              {provider.websiteLinkedin && (
                <a
                  href={provider.websiteLinkedin.startsWith('http') ? provider.websiteLinkedin : `https://${provider.websiteLinkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleContactClick}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Website</p>
                    <p className="text-sm text-teal-600 truncate max-w-xs">{provider.websiteLinkedin}</p>
                  </div>
                </a>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {provider.viewCount} views
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Added {formatDate(provider.createdAt)}
            </div>
          </div>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Link href="/providers">
            <Button variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Button>
          </Link>
          <Button variant="outline" onClick={handleShare}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </Button>
        </div>
      </div>
    </CommunityShell>
  );
}
