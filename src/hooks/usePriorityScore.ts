'use client';

import { useMemo } from 'react';
import { useEmails } from './useEmails';
import { useTasks } from './useTasks';
import { useChats } from './useChats';
import { useSalesforce } from './useSalesforce';
import { PriorityItem } from '@/lib/types';
import { calcScore, getEnergySlot } from '@/lib/priority';

export function usePriorityScore() {
  const { emails, loading: emailsLoading } = useEmails();
  const { tasks, loading: tasksLoading } = useTasks();
  const { chats, loading: chatsLoading } = useChats();
  const { opportunities, loading: sfLoading } = useSalesforce();

  const loading = emailsLoading || tasksLoading || chatsLoading || sfLoading;

  const items = useMemo(() => {
    const priorityItems: PriorityItem[] = [];

    for (const email of emails) {
      priorityItems.push({
        title: email.subject,
        source: 'email',
        url: email.outlook_url,
        daysOverdue: email.days_overdue || 0,
        needsReply: email.needs_reply,
        urgent: false,
        requiresAction: email.needs_reply,
        multiplePeopleWaiting: false,
        hardDeadlineWithin7: false,
        financial: false,
        legal: false,
        basePriority: email.is_read ? 10 : 20,
      });
    }

    for (const task of tasks) {
      const isUrgent = task.priority === 'high' || task.priority === 'urgent';
      priorityItems.push({
        title: task.name,
        source: 'asana',
        url: task.permalink_url,
        daysOverdue: task.days_overdue || 0,
        needsReply: false,
        urgent: isUrgent,
        requiresAction: true,
        multiplePeopleWaiting: false,
        hardDeadlineWithin7: task.days_overdue !== null && task.days_overdue >= -7 && task.days_overdue < 0,
        financial: false,
        legal: false,
        basePriority: isUrgent ? 30 : 15,
      });
    }

    for (const chat of chats) {
      priorityItems.push({
        title: chat.topic || chat.last_message_preview || 'Teams chat',
        source: 'teams',
        url: '',
        daysOverdue: 0,
        needsReply: true,
        urgent: false,
        requiresAction: false,
        multiplePeopleWaiting: (chat.members?.length || 0) > 3,
        hardDeadlineWithin7: false,
        financial: false,
        legal: false,
        basePriority: 10,
      });
    }

    // Salesforce: informational — Ari monitors but doesn't directly manage the pipeline
    for (const opp of opportunities) {
      if (opp.is_closed && opp.is_won) continue;
      const stageKey = (opp.stage || '').toLowerCase();
      const isNegotiation = stageKey.includes('negotiation') || stageKey.includes('closing');
      const basePriority = isNegotiation ? 25
        : stageKey.includes('proposal') ? 20
        : stageKey.includes('qualification') ? 15
        : 10;

      priorityItems.push({
        title: `${opp.name} — $${Number(opp.amount).toLocaleString()}`,
        source: 'salesforce',
        url: opp.sf_url || '',
        daysOverdue: 0,
        needsReply: false,
        urgent: false,
        requiresAction: false,
        multiplePeopleWaiting: false,
        hardDeadlineWithin7: false,
        financial: false,
        legal: false,
        basePriority,
      });
    }

    const energySlot = getEnergySlot();

    const scored = priorityItems.map((item) => {
      const baseScore = calcScore(item);
      const bonus = energySlot.boost(item);
      const finalScore = Math.max(0, Math.min(100, baseScore + bonus));
      return {
        ...item,
        score: baseScore,
        energyBonus: bonus,
        displayScore: finalScore,
      };
    });

    scored.sort((a, b) => (b.displayScore ?? 0) - (a.displayScore ?? 0));

    return scored;
  }, [emails, tasks, chats, opportunities]);

  const energySlot = getEnergySlot();

  return { items, loading, energySlot };
}
