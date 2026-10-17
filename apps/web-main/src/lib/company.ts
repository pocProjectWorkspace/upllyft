/**
 * The legal company behind Upllyft, as shown on the Terms of Service and Privacy Policy.
 *
 * Fill `cin` and `registeredOffice` EXACTLY as on the Ministry of Corporate Affairs
 * record (mca.gov.in → Company/LLP Master Data). Until they are set, the pages show
 * the company name only — never a bracketed placeholder.
 */
export const COMPANY = {
  legalName: 'Mindssparc Private Limited',
  /** Corporate Identity Number, e.g. U72900KL2024PTC012345. */
  cin: '',
  /** Registered office address, as filed with the MCA. */
  registeredOffice: '',
} as const;

/** "Mindssparc Private Limited (operator of Upllyft)", plus CIN and registered office once set. */
export function companyContactLines(): string[] {
  return [
    `${COMPANY.legalName} (operator of Upllyft)`,
    ...(COMPANY.cin ? [`CIN: ${COMPANY.cin}`] : []),
    ...(COMPANY.registeredOffice ? [`Registered office: ${COMPANY.registeredOffice}`] : []),
  ];
}
