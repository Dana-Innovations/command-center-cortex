/**
 * Shared people normalization utilities.
 * Used by both the client-side usePeople hook and server-side snapshot persistence.
 */

export const EXCLUDE_SENDERS = new Set([
  'microsoft', 'noreply', 'no-reply', 'notifications', 'donotreply',
  'do-not-reply', 'mailer', 'bounce', 'asana', 'slack', 'zoom',
  'linkedin', 'twitter', 'youtube', 'google', 'apple', 'amazon',
  'support', 'info', 'help', 'team', 'newsletter', 'marketing',
  'updates', 'alert', 'digest', 'billing', 'security', 'postmaster',
  'feedback', 'survey', 'promotion', 'offers', 'deals', 'shop',
  'vercel', 'github', 'copilot', 'mileageplus', 'monday.com', 'roon',
]);

export function shouldExclude(name: string, email: string): boolean {
  const ln = name.toLowerCase();
  const le = email.toLowerCase();
  for (const ex of EXCLUDE_SENDERS) {
    if (ln.includes(ex) || le.includes(ex)) return true;
  }
  if (le.match(/\+(noreply|bounce|mail)\@/)) return true;
  if (le.match(/^(no-?reply|noreply|notification|alert|auto|bounce|mailer|postmaster)/)) return true;
  return false;
}

export function normalizeName(name: string): string {
  return name
    .replace(/<.*>/, '')
    .replace(/\(.*\)/, '')
    .replace(/\s*[\u2013\u2014-]\s*(Forward|Fwd|Delegate|Shared|On Behalf Of)\s*$/i, '')
    .trim();
}

export function personKey(name: string): string {
  return name.toLowerCase().trim();
}

export function isOwnName(name: string, fullName: string): boolean {
  if (!fullName || !name) return false;
  const nameLower = name.toLowerCase();
  const firstNameLower = fullName.split(' ')[0].toLowerCase();
  if (firstNameLower.length <= 2) return false;
  return nameLower.includes(firstNameLower);
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}
