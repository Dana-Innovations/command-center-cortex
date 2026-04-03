# Meeting Prep: Internal Meeting Enrichment

**Date:** 2026-04-02
**Status:** Approved
**Approach:** A -- Enrich existing `MeetingPrepView.tsx` directly

## Context

The existing Meeting Prep feature pulls context from Outlook calendar, emails, Asana tasks, Salesforce opps, and AI research (web search + relationship dossiers). However, **Teams data is completely absent** -- no DMs, no channel messages, no channel matching. For internal meetings, Teams is where most of the real context lives.

This spec adds Teams channels, Teams DMs, and enhanced Asana "what changed" awareness into the existing meeting prep pipeline.

## Decisions

- **Meeting type detection:** Auto-classify as `one-on-one`, `recurring-team`, or `cross-functional` to drive section priority
- **Channel matching:** Name match first, then attendee-overlap scoring
- **Lookback window:** Auto-detect cadence from calendar history, fallback 7 days
- **Teams depth:** Summary only -- counts, highlights, top threads by reply count. No full message content.

## Files Modified

- `src/components/views/MeetingPrepView.tsx` -- all changes happen here (new functions, new sections, reordered layout)

## Section 1: Meeting Type Detection

New function: `classifyMeeting(event: CalendarEvent, allEvents: CalendarEvent[])`

Returns: `'one-on-one' | 'recurring-team' | 'cross-functional'`

| Type | Detection Logic |
|---|---|
| `one-on-one` | 2 attendees (including organizer), or subject contains "1:1", "one on one", "check-in" |
| `recurring-team` | Subject matches a past event from same organizer within last 60 days |
| `cross-functional` | 3+ attendees, doesn't match recurring pattern |

### Cadence Detection

New function: `detectLookbackDate(event: CalendarEvent, allEvents: CalendarEvent[]): Date`

- Query `allEvents` for past events with matching subject + organizer
- If found: lookback = gap between the two most recent occurrences
- Fallback: 7 days

## Section 2: Teams Channel Matching

New function: `findRelevantChannels(event, channels, channelMessages, attendeeNames, lookbackDate)`

Returns: Top 3 `RelevantChannel[]`

### Name Matching (primary)
- Tokenize meeting subject into keywords (3+ chars, skip stop words)
- Score each `TeamsChannel` by keyword matches in `channel_name` or `team_name`
- Exact substring match gets highest weight

### Attendee Overlap (secondary)
- For each channel, count how many meeting attendees appear as `author_name` in `TeamsChannelMessage` within lookback window
- Channels where 50%+ of attendees are active get score boost

### Output per channel
- Channel name + team name
- Message count since lookback date
- Thread count (messages with `reply_count > 0`)
- Most active author in window

## Section 3: Teams DM Context

New function: `findRelevantChats(event, chats, attendeeNames, lookbackDate)`

Returns: `RelevantChat[]`

### Matching
- For each attendee name, find `Chat` objects where `members` array contains a name match (reuse existing `nameMatchesLoose`)
- Filter to chats with `last_activity` after lookback date

### Output per chat
- Chat topic (if set) or member names
- Activity level badge: "Active" (5+ messages in window), "Light" (1-4), none
- Last message preview truncated to ~80 chars + timestamp
- `web_url` link to open in Teams

### Priority by meeting type
- `one-on-one`: DM section placed 2nd (after prep bullets)
- `recurring-team` / `cross-functional`: DM section placed below channels, only if matches exist

## Section 4: Enhanced Asana Task Context

Enhancement to existing `relatedTasks` logic in `buildMeetingContext`.

### Change tagging
Each matched task gets a `changeType`:
- `newly-completed` -- completed within lookback window
- `became-overdue` -- `days_overdue > 0` and `due_on` falls between lookback date and now (i.e., it became overdue during this window)
- `newly-created` -- `created_at` within lookback window
- `ongoing` -- open, existed before lookback

### Display
- Summary line at top of Tasks section: "3 completed, 1 became overdue, 2 new since last sync"
- Group tasks by change type with subtle label badges
- Overdue tasks continue to surface as risk bullets (existing behavior)

## Section 5: UI Layout

All rendering uses the existing `CollapsibleSection` component. No new views or tabs.

### Section ordering by meeting type

| Priority | `one-on-one` | `recurring-team` | `cross-functional` |
|---|---|---|---|
| 1 | Prep Bullets | Prep Bullets | Prep Bullets |
| 2 | Teams DMs | Teams Channels | Teams Channels |
| 3 | Email Threads | Asana Tasks | Email Threads |
| 4 | Asana Tasks | Email Threads | Asana Tasks |
| 5 | Teams Channels | Teams DMs | Teams DMs |
| 6 | Salesforce Opps | Salesforce Opps | Salesforce Opps |

### New UI elements
- **Teams Channels section:** Channel name header, stat rows (message count, active threads, most active author). Compact, no message content.
- **Teams DMs section:** One row per chat -- member name, activity badge, last message preview (~80 chars), timestamp.
- **Meeting type badge:** Small pill next to meeting subject at top of right panel: "1:1", "Team Sync", or "Cross-functional".
- **Task change badges:** Subtle colored labels on tasks: green for completed, red for became-overdue, blue for new.

## Hooks Required

Already exist and provide the data:
- `useCalendar()` -- `CalendarEvent[]` (already used)
- `useEmails()` -- `Email[]` (already used)
- `useTasks()` -- `Task[]` (already used)
- `useSalesforce()` -- `SalesforceOpportunity[]` (already used)
- `useTeams()` -- `TeamsChannel[]` (new to this view)
- `useChats()` -- `Chat[]` (new to this view)
- `useTeamsChannelMessages()` -- `TeamsChannelMessage[]` (new to this view)

## Verification

1. Open Command Center, navigate to Meeting Prep tab
2. Select a recurring internal meeting -- verify "Team Sync" badge, channel activity section shows counts, Asana tasks grouped by change type
3. Select a 1:1 -- verify "1:1" badge, DMs section appears in position 2, shows activity level
4. Select a cross-functional meeting with 3+ people -- verify "Cross-functional" badge, channels prioritized over DMs
5. Verify cadence detection: recurring weekly meeting should show ~7 day lookback, biweekly should show ~14 days
6. Verify fallback: ad-hoc meeting with no history defaults to 7 day lookback
