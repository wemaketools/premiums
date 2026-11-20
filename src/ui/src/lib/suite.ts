/** The other modules of the suite this one links to. ClaimsIQ's hosted demo serves its DEMO data set. */
export const CLAIMSIQ_URL = 'https://claims.thebrittany.ai';

/** A claim in ClaimsIQ; only DEMO claims match, because the hosted ClaimsIQ demo serves DEMO data. */
export function claimsIqClaimUrl(claimId: string): string {
  return `${CLAIMSIQ_URL}/claims/${encodeURIComponent(claimId)}`;
}
