// Every member can buy and sell. These are community email domains, not trading roles.
export const COMMUNITY_EMAIL_PATTERN = /^[^@\s]+@(um6p\.ma|student\.1337\.ma)$/i;

export function isCommunityEmail(email: string): boolean {
  return typeof email === 'string' && COMMUNITY_EMAIL_PATTERN.test(email.trim());
}
