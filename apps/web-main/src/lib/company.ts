/**
 * The legal company behind Upllyft, as shown on the Terms of Service and Privacy Policy.
 *
 * Fill `cin` and `registeredOffice` EXACTLY as on the Ministry of Corporate Affairs
 * record (mca.gov.in → Company/LLP Master Data). Until they are set, nothing extra is
 * shown — never a bracketed placeholder.
 */
export const COMPANY = {
  legalName: 'MindsSparc Private Limited',
  /** Corporate Identity Number, e.g. U72900KL2024PTC012345. */
  cin: '',
  /** Registered office address, as filed with the MCA. */
  registeredOffice: '',
} as const;

/** CIN and registered office, shown under the legal documents once filled in. */
export function companyRegistrationLines(): string[] {
  return [
    ...(COMPANY.cin ? [`CIN: ${COMPANY.cin}`] : []),
    ...(COMPANY.registeredOffice ? [`Registered office: ${COMPANY.registeredOffice}`] : []),
  ];
}
