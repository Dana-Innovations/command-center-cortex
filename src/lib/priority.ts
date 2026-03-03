import { PriorityItem, EnergySlot } from './types';

export function calcScore(item: PriorityItem): number {
  let s = item.basePriority;
  s += Math.min(item.daysOverdue * 5, 30);
  if (item.needsReply) s += 20;
  if (item.urgent) s += 25;
  if (item.requiresAction) s += 15;
  if (item.multiplePeopleWaiting) s += 10;
  if (item.hardDeadlineWithin7) s += 15;
  if (item.financial) s += 10;
  if (item.legal) s += 10;
  return Math.min(s, 100);
}

export function scoreReason(item: PriorityItem): string {
  const parts: string[] = [];
  if (item.daysOverdue > 0) parts.push(`${item.daysOverdue}d overdue`);
  if (item.needsReply) parts.push('needs your reply');
  if (item.urgent) parts.push('marked Urgent');
  if (item.requiresAction) parts.push('requires action');
  if (item.multiplePeopleWaiting) parts.push('multiple people waiting');
  if (item.hardDeadlineWithin7) parts.push('deadline within 7d');
  if (item.financial) parts.push('financial');
  if (item.legal) parts.push('legal matter');
  return parts.join(' + ');
}

export function scoreClass(score: number): string {
  if (score >= 90) return 'score-red';
  if (score >= 70) return 'score-amber';
  if (score >= 50) return 'score-teal';
  return 'score-gray';
}

export function getEnergySlot(): EnergySlot {
  const now = new Date();
  const pstStr = now.toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    timeZone: 'America/Los_Angeles',
  });
  const parts = pstStr.split(':');
  const h = parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;

  if (h >= 18) {
    return {
      id: 'evening',
      label: 'Wind down — only urgent items shown',
      boost: (item) => (item.urgent ? 0 : -20),
    };
  }
  if (h >= 15) {
    return {
      id: 'post',
      label: 'Strategic deep-work window',
      boost: (item) =>
        item.multiplePeopleWaiting || item.financial || item.legal ? 15 : 0,
    };
  }
  if (h >= 8.5) {
    return {
      id: 'during',
      label: 'Between-session items',
      boost: (item) =>
        item.basePriority <= 20 && !item.requiresAction ? 10 : 0,
    };
  }
  return {
    id: 'pre',
    label: 'Quick wins before your first meeting',
    boost: (item) =>
      item.needsReply && item.daysOverdue < 3 ? 15 : 0,
  };
}
