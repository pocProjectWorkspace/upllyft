import { LegalDocumentView } from '@/components/legal/legal-document-view';
import { TERMS_OF_SERVICE } from '@/lib/legal-content';

export default function TermsOfServicePage() {
  return <LegalDocumentView document={TERMS_OF_SERVICE} />;
}
