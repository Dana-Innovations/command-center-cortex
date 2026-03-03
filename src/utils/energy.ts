export function getEnergyEmoji(slotId: string): string {
  switch (slotId) {
    case 'pre':
      return '\u26A1';
    case 'during':
      return '\uD83D\uDCCB';
    case 'post':
      return '\uD83E\uDDE0';
    case 'evening':
      return '\uD83C\uDF19';
    default:
      return '\u2B50';
  }
}

export function getEnergyDescription(slotId: string): string {
  switch (slotId) {
    case 'pre':
      return 'Pre-session: Quick wins before your first meeting';
    case 'during':
      return 'Between sessions: Low-effort items to clear the queue';
    case 'post':
      return 'Post-session: Strategic deep-work window';
    case 'evening':
      return 'Evening: Wind down — only urgent items shown';
    default:
      return '';
  }
}
