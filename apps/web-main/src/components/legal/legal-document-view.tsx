import { Fragment } from 'react';
import { companyRegistrationLines } from '@/lib/company';
import { LEGAL_EFFECTIVE_DATE, type LegalBlock, type LegalDocument, type LegalRun } from '@/lib/legal-content';

function Runs({ runs }: { runs: LegalRun[] }) {
  return (
    <>
      {runs.map((run, i) =>
        run.bold ? (
          <strong key={i} className="font-semibold text-gray-900">{run.text}</strong>
        ) : (
          <Fragment key={i}>{run.text}</Fragment>
        ),
      )}
    </>
  );
}

/** Splits the flat block list into one card per heading. */
function toSections(blocks: LegalBlock[]) {
  const sections: { heading: string; body: LegalBlock[] }[] = [];
  for (const block of blocks) {
    if (block.type === 'h') sections.push({ heading: block.text, body: [] });
    else sections[sections.length - 1]?.body.push(block);
  }
  return sections;
}

/** Consecutive list items render as one <ul>. */
function SectionBody({ body }: { body: LegalBlock[] }) {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < body.length; i++) {
    const block = body[i];
    if (block.type === 'li') {
      const items: LegalBlock[] = [];
      while (i < body.length && body[i].type === 'li') items.push(body[i++]);
      i--;
      out.push(
        <ul key={i} className="list-disc pl-5 space-y-2 text-sm text-gray-600 leading-relaxed">
          {items.map((item, j) => (
            <li key={j}>{item.type !== 'h' && <Runs runs={item.runs} />}</li>
          ))}
        </ul>,
      );
    } else if (block.type === 'p') {
      out.push(
        <p key={i} className="text-sm text-gray-600 leading-relaxed">
          <Runs runs={block.runs} />
        </p>,
      );
    }
  }
  return <div className="space-y-3">{out}</div>;
}

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  const registration = companyRegistrationLines();

  return (
    <div className="min-h-screen bg-gray-50/50">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{document.title}</h1>
          <p className="text-sm text-gray-500">Effective date: {LEGAL_EFFECTIVE_DATE}</p>
        </div>

        <div className="space-y-6">
          {toSections(document.blocks).map((section) => (
            <div key={section.heading} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
              <h2 className="text-base font-semibold text-gray-900 mb-4">{section.heading}</h2>
              <SectionBody body={section.body} />
            </div>
          ))}
        </div>

        {registration.length > 0 && (
          <div className="mt-6 text-xs text-gray-500 space-y-1 text-center">
            {registration.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </a>
        </div>
      </main>
    </div>
  );
}
