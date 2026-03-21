"use client";

import { useMemo } from "react";
import { useEmails } from "@/hooks/useEmails";
import { useCalendar } from "@/hooks/useCalendar";
import { useTasks } from "@/hooks/useTasks";
import { useChats } from "@/hooks/useChats";
import { useSalesforce } from "@/hooks/useSalesforce";
import { usePeople } from "@/hooks/usePeople";
import type { TabId } from "@/lib/tab-config";

export type TabBadges = Partial<Record<TabId, number | null>>;

export function useTabBadges(): TabBadges {
  const { emails } = useEmails();
  const { chats } = useChats();
  const { events } = useCalendar();
  const { tasks } = useTasks();
  const { openOpps } = useSalesforce();
  const { people } = usePeople();

  return useMemo(() => {
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Los_Angeles",
    });

    const commsCount =
      emails.filter((e) => e.needs_reply).length +
      chats.length;

    const calCount = events.filter((e) => {
      const start = new Date(e.start_time).toLocaleDateString("en-CA", {
        timeZone: "America/Los_Angeles",
      });
      return start === today;
    }).length;

    const opsCount = tasks.filter(
      (t) => !t.completed && t.days_overdue > 0
    ).length;

    const perfCount = openOpps.filter(
      (o) => !o.is_closed && o.days_to_close <= 14
    ).length;

    const peopleCount = people.filter(
      (p) => p.urgency === "red"
    ).length;

    return {
      home: null,
      communications: commsCount > 0 ? commsCount : null,
      people: peopleCount > 0 ? peopleCount : null,
      calendar: calCount > 0 ? calCount : null,
      performance: perfCount > 0 ? perfCount : null,
      operations: opsCount > 0 ? opsCount : null,
    };
  }, [chats.length, emails, events, openOpps, people, tasks]);
}
