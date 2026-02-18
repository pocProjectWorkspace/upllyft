'use client';

import type { PubMedArticle } from '@/lib/api/insights';

interface EvidenceTabProps {
  articles: PubMedArticle[];
}

export function EvidenceTab({ articles }: EvidenceTabProps) {
  if (articles.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center fade-in">
        <p className="text-gray-500">No research articles found for this analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Research Evidence</h2>
      {articles.map((article, idx) => (
        <div key={article.pmid} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 leading-snug mb-1">{article.title}</h3>
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
