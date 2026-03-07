'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface PersonDetailIdentity {
  name: string;
  email: string;
  title?: string;
  department?: string;
}

export interface PersonDetailEmail {
  subject: string;
  preview: string;
  date: string;
  direction: 'sent' | 'received';
  isRead?: boolean;
  from?: string;
  url: string;
}

export interface PersonDetailMeeting {
  subject: string;
  date: string;
  endTime?: string;
  location?: string;
  isOnline?: boolean;
  attendeeCount?: number;
  attendees?: string[];
  url: string;
}

export interface PersonDetailChat {
  text: string;
  from: string;
  date: string;
  url: string;
}

export interface PersonDetailSlack {
  text: string;
  channel: string;
  date: string;
  url: string;
}

export interface PersonDetailTask {
  name: string;
  project: string;
  status: string;
  due: string;
  url: string;
}

export interface PersonDetailResponse {
  identity: PersonDetailIdentity;
  emails: PersonDetailEmail[];
  meetings: PersonDetailMeeting[];
  chats: PersonDetailChat[];
  slackMessages: PersonDetailSlack[];
  tasks: PersonDetailTask[];
  stats: {
    totalEmails: number;
    totalMeetings: number;
    firstContact: string;
    lastContact: string;
  };
}

export function usePersonDetail(
  personName: string | null,
  personEmail?: string,
  teamsChatId?: string
) {
  const [detail, setDetail] = useState<PersonDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Map<string, PersonDetailResponse>>(new Map());

  const fetchDetail = useCallback(async (name: string, email?: string, chatId?: string) => {
    const cacheKey = name.toLowerCase().trim();

    if (cache.current.has(cacheKey)) {
      setDetail(cache.current.get(cacheKey)!);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ name });
      if (email) params.set('email', email);
      if (chatId) params.set('chatId', chatId);

      const res = await fetch(`/api/data/person-detail?${params}`);
      if (!res.ok) throw new Error(`Failed: ${res.status}`);

      const data: PersonDetailResponse = await res.json();
      cache.current.set(cacheKey, data);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (personName) {
      fetchDetail(personName, personEmail, teamsChatId);
    } else {
      setDetail(null);
      setError(null);
    }
  }, [personName, personEmail, teamsChatId, fetchDetail]);

  const refresh = useCallback(() => {
    if (personName) {
      const cacheKey = personName.toLowerCase().trim();
      cache.current.delete(cacheKey);
      fetchDetail(personName, personEmail, teamsChatId);
    }
  }, [personName, personEmail, teamsChatId, fetchDetail]);

  return { detail, loading, error, refresh };
}
