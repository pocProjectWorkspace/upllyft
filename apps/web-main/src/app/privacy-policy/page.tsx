import { LegalDocumentView } from '@/components/legal/legal-document-view';
import { PRIVACY_POLICY } from '@/lib/legal-content';

export default function PrivacyPolicyPage() {
  return <LegalDocumentView document={PRIVACY_POLICY} />;
}
