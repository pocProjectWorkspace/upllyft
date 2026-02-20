'use client';

import type { PubMedArticle } from '@/lib/api/insights';

interface EvidenceTabProps {
  articles: PubMedArticle[];
}

export function EvidenceTab({ articles }: EvidenceTabProps) {
  const safeArticles = articles || [];

  if (safeArticles.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center fade-in">
        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">No research articles found</p>
        <p className="text-sm text-gray-400 mt-1">PubMed results will appear here when available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in">
      <p className="text-sm text-gray-600 mb-4">
        {safeArticles.length} relevant research article{safeArticles.length !== 1 ? 's' : ''} from PubMed
      </p>
      {safeArticles.map((article, idx) => (
        <div key={article.pmid} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <a
                href={article.doi ? `https://doi.org/${article.doi}` : `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-gray-900 hover:text-teal-600 transition-colors leading-snug mb-1 block"
              >
                {article.title}
              </a>
              <p className="text-sm text-gray-500 mb-3">
                {article.journal} ({article.year})
                {article.authors && article.authors.length > 0 && (
                  <> &mdash; {article.authors.slice(0, 3).join(', ')}{article.authors.length > 3 ? ' et al.' : ''}</>
                )}
              </p>
              {article.abstract && (
                <p className="text-sm text-gray-600 leading-relaxed mb-3">{article.abstract}</p>
              )}
              <div className="flex items-center gap-3">
                {article.doi && (
                  <a
                    href={`https://doi.org/${article.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
                  >
                    DOI
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
                <a
                  href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  PubMed
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
