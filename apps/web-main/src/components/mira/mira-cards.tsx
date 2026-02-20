'use client';

import { APP_URLS } from '@upllyft/api-client';
import type { MiraCard, MiraAction } from '@/lib/api/mira';

function ExternalIcon() {
  return (
    <svg className="w-3.5 h-3.5 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

export function MiraCardRenderer({ card }: { card: MiraCard }) {
  switch (card.type) {
    case 'therapist':
      return <TherapistCard data={card.data} />;
    case 'community':
      return <CommunityCard data={card.data} />;
    case 'evidence':
      return <EvidenceCard data={card.data} />;
    case 'organisation':
      return <OrganisationCard data={card.data} />;
    case 'conversation':
      return <ConversationCard data={card.data} />;
    case 'screening_prompt':
      return <ScreeningPromptCard data={card.data} />;
    default:
      return null;
  }
}

function TherapistCard({ data }: { data: any }) {
  const bookingUrl = data.therapistProfileId
    ? `${APP_URLS.booking}/therapists/${data.therapistProfileId}`
    : APP_URLS.booking;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 mt-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-teal-700">
            {(data.name || 'T')[0]}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{data.name}</p>
          <p className="text-xs text-gray-500">{data.role}{data.yearsOfExperience ? ` · ${data.yearsOfExperience}y exp` : ''}</p>
        </div>
      </div>
      {data.specialization?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {data.specialization.slice(0, 3).map((s: string) => (
            <span key={s} className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded-full">{s}</span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 mt-2">
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-teal-600 hover:text-teal-700 font-medium"
        >
          View Profile<ExternalIcon />
        </a>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs bg-teal-500 text-white px-3 py-1 rounded-full hover:bg-teal-600 font-medium"
        >
          Book Session
        </a>
      </div>
    </div>
  );
}

function CommunityCard({ data }: { data: any }) {
  const url = data.slug
    ? `${APP_URLS.community}/communities/${data.slug}`
    : APP_URLS.community;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 mt-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-900">{data.name}</p>
        <span className="text-xs text-gray-400">{data.memberCount || 0} members</span>
      </div>
      {data.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{data.description}</p>
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-teal-600 hover:text-teal-700 font-medium mt-2 inline-block"
      >
        Join Community<ExternalIcon />
      </a>
    </div>
  );
}

function EvidenceCard({ data }: { data: any }) {
  const pubmedUrl = data.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${data.pmid}/` : data.doi ? `https://doi.org/${data.doi}` : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 mt-3">
      <p className="text-sm font-medium text-gray-900 line-clamp-2">{data.title}</p>
      <p className="text-xs text-gray-500 mt-1">{data.journal}{data.year ? ` · ${data.year}` : ''}</p>
      {pubmedUrl && (
        <a
          href={pubmedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-teal-600 hover:text-teal-700 font-medium mt-2 inline-block"
        >
          Read on PubMed<ExternalIcon />
        </a>
      )}
    </div>
  );
}

function OrganisationCard({ data }: { data: any }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 mt-3">
      <p className="text-sm font-medium text-gray-900">{data.name}</p>
      {data.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{data.description}</p>
      )}
      {data._count && (
        <p className="text-xs text-gray-400 mt-1">
          {data._count.communities || 0} communities · {data._count.members || 0} members
        </p>
      )}
      {data.website && (
        <a
          href={data.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-teal-600 hover:text-teal-700 font-medium mt-2 inline-block"
        >
          Visit Website<ExternalIcon />
        </a>
      )}
    </div>
  );
}

function ConversationCard({ data }: { data: any }) {
  const url = data.id ? `${APP_URLS.community}/posts/${data.id}` : APP_URLS.community;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 mt-3">
      <p className="text-sm font-medium text-gray-900 line-clamp-1">{data.title}</p>
      <p className="text-xs text-gray-500 mt-1">
        {data.authorName}{data.communityName ? ` in ${data.communityName}` : ''}
        {data.upvotes ? ` · ${data.upvotes} upvotes` : ''}
      </p>
      {data.excerpt && (
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{data.excerpt}</p>
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-teal-600 hover:text-teal-700 font-medium mt-2 inline-block"
      >
        Read Thread<ExternalIcon />
      </a>
    </div>
  );
}

function ScreeningPromptCard({ data }: { data: any }) {
  return (
    <div className="bg-teal-50 rounded-xl border border-teal-200 p-4 mt-3">
      <p className="text-sm font-medium text-teal-900">
        {data?.title || 'Want a more detailed analysis?'}
      </p>
      <p className="text-xs text-teal-700 mt-1">
        {data?.description || 'A quick 15-minute screening can give us much more to work with'}
      </p>
      <a
        href={data?.url || APP_URLS.screening}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-2 text-xs bg-teal-600 text-white px-4 py-1.5 rounded-full hover:bg-teal-700 font-medium"
      >
        Start Screening
      </a>
    </div>
  );
}

export function MiraChoiceChips({
  choices,
  onSelect,
}: {
  choices: string[];
  onSelect: (choice: string) => void;
}) {
  return (
    <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
      {choices.map((choice) => (
        <button
          key={choice}
          onClick={() => onSelect(choice)}
          className="bg-white border border-teal-200 text-teal-700 rounded-full px-4 py-2 text-sm hover:bg-teal-50 cursor-pointer whitespace-nowrap transition-colors flex-shrink-0"
        >
          {choice}
        </button>
      ))}
    </div>
  );
}

export function MiraActionButtons({ actions }: { actions: MiraAction[] }) {
  return (
    <div className="flex flex-col gap-2 mt-3">
      {actions.map((action, i) => (
        <a
          key={i}
          href={action.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          {action.label}
        </a>
      ))}
    </div>
  );
}
