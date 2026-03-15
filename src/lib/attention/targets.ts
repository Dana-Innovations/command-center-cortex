import type {
  AsanaCommentThread,
  CalendarEvent,
  Chat,
  Email,
  SlackFeedMessage,
  Task,
  TeamsChannelMessage,
} from "@/lib/types";
import type { AttentionTarget } from "@/lib/attention/types";
import {
  buildFocusPreferenceKey,
  extractActorKey,
  extractTopicKeys,
} from "@/lib/attention/utils";

function buildTarget(
  target: Omit<AttentionTarget, "topicKeys" | "actorKeys"> & {
    actorKeys?: Array<string | null>;
    topicSources?: Array<string | null | undefined>;
  }
): AttentionTarget {
  return {
    ...target,
    actorKeys: (target.actorKeys ?? []).filter(
      (value): value is string => typeof value === "string" && Boolean(value)
    ),
    topicKeys: extractTopicKeys(...(target.topicSources ?? [])),
  };
}

export function buildEmailAttentionTarget(
  email: Email,
  surface = "reply-center",
  baseScore = 48
) {
  return buildTarget({
    provider: "outlook_mail",
    itemType: "email",
    itemId: email.message_id || email.id,
    title: email.subject || "(no subject)",
    timestamp: email.received_at,
    baseScore,
    surface,
    resourceKeys: [
      email.folder_id
        ? buildFocusPreferenceKey("outlook_mail", "mail_folder", email.folder_id)
        : null,
      buildFocusPreferenceKey("outlook_mail", "mail_root", "mail"),
    ].filter((value): value is string => Boolean(value)),
    actorKeys: [
      extractActorKey("sender", email.from_email || email.from_name),
      extractActorKey("author", email.from_name),
    ],
    topicSources: [email.subject, email.preview, email.folder],
    metadata: {
      outlookUrl: email.outlook_url,
      folder: email.folder,
      folderId: email.folder_id ?? null,
      sender: email.from_email || email.from_name,
    },
  });
}

export function buildCalendarAttentionTarget(
  event: CalendarEvent,
  surface = "digest",
  baseScore = 40
) {
  return buildTarget({
    provider: "outlook_calendar",
    itemType: "calendar_event",
    itemId: event.event_id || event.id,
    title: event.subject,
    timestamp: event.start_time,
    baseScore,
    surface,
    resourceKeys: [
      buildFocusPreferenceKey(
        "outlook_calendar",
        "calendar",
        event.calendar_id || "primary"
      ),
      buildFocusPreferenceKey("outlook_calendar", "calendar_root", "calendar"),
    ],
    actorKeys: [extractActorKey("organizer", event.organizer)],
    topicSources: [event.subject, event.location, event.organizer],
    metadata: {
      outlookUrl: event.outlook_url,
      joinUrl: event.join_url,
      calendarId: event.calendar_id || "primary",
    },
  });
}

export function buildTaskAttentionTarget(
  task: Task,
  surface = "digest",
  baseScore = 44
) {
  return buildTarget({
    provider: "asana",
    itemType: "asana_task",
    itemId: task.task_gid || task.id,
    title: task.name,
    timestamp: task.modified_at || task.synced_at,
    baseScore,
    surface,
    resourceKeys: [
      task.project_gid
        ? buildFocusPreferenceKey("asana", "asana_project", task.project_gid)
        : null,
    ].filter((value): value is string => Boolean(value)),
    actorKeys: [
      extractActorKey("assignee", task.assignee_email || task.assignee_name || task.assignee),
      extractActorKey("author", task.created_by_email || task.created_by_name),
    ],
    topicSources: [task.name, task.notes, task.project_name],
    metadata: {
      permalinkUrl: task.permalink_url,
      projectGid: task.project_gid ?? null,
      projectName: task.project_name,
    },
  });
}

export function buildAsanaCommentAttentionTarget(
  thread: AsanaCommentThread,
  surface = "reply-center",
  baseScore = 46
) {
  return buildTarget({
    provider: "asana",
    itemType: "asana_comment",
    itemId: thread.id,
    title: thread.task_name,
    timestamp: thread.latest_comment_at,
    baseScore,
    surface,
    resourceKeys: [
      thread.project_gid
        ? buildFocusPreferenceKey("asana", "asana_project", thread.project_gid)
        : null,
    ].filter((value): value is string => Boolean(value)),
    actorKeys: [
      extractActorKey("commenter", thread.latest_commenter_email || thread.latest_commenter_name),
    ],
    topicSources: [thread.task_name, thread.latest_comment_text, thread.project_name],
    metadata: {
      permalinkUrl: thread.permalink_url,
      taskGid: thread.task_gid,
      projectGid: thread.project_gid ?? null,
      projectName: thread.project_name,
    },
  });
}

export function buildTeamsChatAttentionTarget(
  chat: Chat,
  surface = "reply-center",
  baseScore = 42
) {
  return buildTarget({
    provider: "teams",
    itemType: "teams_chat",
    itemId: chat.chat_id || chat.id,
    title: chat.topic || "Teams Chat",
    timestamp: chat.last_activity,
    baseScore,
    surface,
    resourceKeys: [
      `teams::chat::${chat.chat_id || chat.id}`,
    ],
    actorKeys: [extractActorKey("sender", chat.last_message_from)],
    topicSources: [chat.topic, chat.last_message_preview],
    metadata: {
      webUrl: chat.web_url ?? null,
      chatType: chat.chat_type,
    },
  });
}

export function buildTeamsChannelMessageAttentionTarget(
  message: TeamsChannelMessage,
  surface = "signals",
  baseScore = 38
) {
  return buildTarget({
    provider: "teams",
    itemType: "teams_channel_message",
    itemId: message.message_id || message.id,
    title: `${message.team_name} / ${message.channel_name}`,
    timestamp: message.timestamp,
    baseScore,
    surface,
    resourceKeys: [
      buildFocusPreferenceKey("teams", "teams_channel", message.channel_id),
      buildFocusPreferenceKey("teams", "teams_team", message.team_id),
    ],
    actorKeys: [extractActorKey("sender", message.author_name)],
    topicSources: [message.channel_name, message.text, message.team_name],
    metadata: {
      webUrl: message.web_url ?? null,
      teamId: message.team_id,
      channelId: message.channel_id,
    },
  });
}

export function buildSlackAttentionTarget(
  message: SlackFeedMessage,
  surface = "signals",
  baseScore = 34
) {
  return buildTarget({
    provider: "slack",
    itemType: "slack_message",
    itemId: message.message_ts || message.id,
    title: `#${message.channel_name}`,
    timestamp: message.timestamp,
    baseScore,
    surface,
    resourceKeys: [
      message.channel_id
        ? buildFocusPreferenceKey("slack", "slack_channel", message.channel_id)
        : null,
    ].filter((value): value is string => Boolean(value)),
    actorKeys: [extractActorKey("author", message.author_name)],
    topicSources: [message.channel_name, message.text, message.author_name],
    metadata: {
      permalink: message.permalink,
      channelId: message.channel_id ?? null,
    },
  });
}
