"use client";
import { SlackCard } from "@/components/command-center/SlackCard";
import { AIFeedCard } from "@/components/command-center/AIFeedCard";
import { JeanaSection } from "@/components/command-center/JeanaSection";
import { EmailHygieneCard } from "@/components/command-center/EmailHygieneCard";
import { AttentionFeedbackControl } from "@/components/ui/AttentionFeedbackControl";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/useTasks";
import { useChats } from "@/hooks/useChats";
import { useTeamsChannelMessages } from "@/hooks/useTeamsChannelMessages";
import { transformJeanaItems } from "@/lib/transformers";
import { useAttention } from "@/lib/attention/client";
import {
  buildTeamsChannelMessageAttentionTarget,
  buildTeamsChatAttentionTarget,
} from "@/lib/attention/targets";
import { useAuth } from "@/hooks/useAuth";
import { useConnections } from "@/hooks/useConnections";
import { ConnectPrompt } from "@/components/ui/ConnectPrompt";

function TeamsChatsCard() {
  const { chats, loading } = useChats();
  const { user } = useAuth();
  const { applyTarget } = useAttention();
  const { m365: m365Connected } = useConnections();
  const fullName = user?.user_metadata?.full_name ?? "";
  const rankedChats = chats
    .filter(chat => {
      if (fullName && chat.topic === fullName && chat.last_message_from === fullName) return false;
      if (chat.topic === 'Teams Chat' && !chat.last_message_preview && !chat.last_message_from) return false;
      return true;
    })
    .map((chat) => {
      const target = buildTeamsChatAttentionTarget(chat, "signals", 40);
      const attention = applyTarget(target);
      return { chat, target, attention };
    })
    .filter((item) => !item.attention.hidden)
    .sort(
      (a, b) =>
        b.attention.finalScore - a.attention.finalScore ||
        new Date(b.chat.last_activity).getTime() -
          new Date(a.chat.last_activity).getTime()
    );

  return (
    <section className="glass-card anim-card p-5">
      <h2 className="text-sm font-semibold text-text-heading mb-4 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Teams Chats
        {!loading && (
          <span className="text-[10px] bg-white/5 text-text-muted px-2 py-0.5 rounded-full">{rankedChats.length}</span>
        )}
      </h2>

      {!m365Connected ? (
        <ConnectPrompt service="Microsoft 365" />
      ) : loading ? (
        <div className="text-sm text-text-muted animate-pulse">Loading chats…</div>
      ) : rankedChats.length === 0 ? (
        <div className="text-sm text-text-muted">No Teams chats found.</div>
      ) : (
        <div className="space-y-0 divide-y divide-[var(--bg-card-border)]">
          {rankedChats.map(({ chat, target, attention }, i) => {
            const topic = chat.topic || 'Teams Chat';
            const preview = chat.last_message_preview || '';
            const from = chat.last_message_from || '';
            const isGroup = chat.chat_type === 'group' || chat.chat_type === 'meeting';
            return (
              <div key={chat.id || i} className="py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#5865f2]/20 flex items-center justify-center shrink-0 text-[11px] font-bold text-[#5865f2] mt-0.5">
                  {topic.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text-heading truncate">{topic}</span>
                    {isGroup && <span className="text-[9px] bg-white/5 text-text-muted px-1.5 py-0.5 rounded shrink-0">group</span>}
                  </div>
                  {from && <div className="text-[11px] text-text-muted mt-0.5">{from}</div>}
                  {preview && (
                    <div className="text-xs text-text-muted/80 mt-1 line-clamp-2 leading-snug">{preview}</div>
                  )}
                  {attention.explanation.length > 0 && (
                    <div className="mt-1 text-[11px] text-text-muted">{attention.explanation.join(" · ")}</div>
                  )}
                  {!preview && !from && (
                    <div className="text-xs text-text-muted/40 mt-0.5 italic">No recent messages</div>
                  )}
                </div>
                <AttentionFeedbackControl target={target} surface="signals" compact />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TeamsChannelsCard() {
  const { messages, loading } = useTeamsChannelMessages();
  const { applyTarget } = useAttention();
  const rankedMessages = messages
    .map((message) => {
      const target = buildTeamsChannelMessageAttentionTarget(
        message,
        "signals",
        34
      );
      const attention = applyTarget(target);
      return { message, target, attention };
    })
    .filter((item) => !item.attention.hidden)
    .sort(
      (a, b) =>
        b.attention.finalScore - a.attention.finalScore ||
        new Date(b.message.timestamp).getTime() -
          new Date(a.message.timestamp).getTime()
    );

  return (
    <section className="glass-card anim-card p-5">
      <h2 className="text-sm font-semibold text-text-heading mb-4 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M8 9h8M8 13h8M8 17h5" />
        </svg>
        Teams Channels
        {!loading && (
          <span className="text-[10px] bg-white/5 text-text-muted px-2 py-0.5 rounded-full">{rankedMessages.length}</span>
        )}
      </h2>
      {loading ? (
        <div className="text-sm text-text-muted animate-pulse">Loading channels…</div>
      ) : rankedMessages.length === 0 ? (
        <div className="text-sm text-text-muted">No prioritized channel activity yet.</div>
      ) : (
        <div className="space-y-0 divide-y divide-[var(--bg-card-border)]">
          {rankedMessages.slice(0, 8).map(({ message, target, attention }) => (
            <div key={message.id} className="flex items-start gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-text-heading truncate">
                    {message.team_name}
                  </span>
                  <span className="text-[10px] rounded-full bg-white/5 px-2 py-0.5 text-text-muted">
                    #{message.channel_name}
                  </span>
                </div>
                <div className="mt-1 text-xs text-text-muted">
                  {message.author_name}
                </div>
                <div className="mt-1 text-xs text-text-muted/80 line-clamp-2">
                  {message.text}
                </div>
                {attention.explanation.length > 0 && (
                  <div className="mt-1 text-[11px] text-text-muted">
                    {attention.explanation.join(" · ")}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <AttentionFeedbackControl target={target} surface="signals" compact />
                {message.web_url && (
                  <a
                    href={message.web_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-text-muted hover:text-accent-amber transition-colors"
                  >
                    Open
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function SignalsView() {
  const { isAri } = useAuth();
  const { tasks } = useTasks();
  const { m365: m365Connected, slack: slackConnected } = useConnections();
  const jeanaItems = transformJeanaItems(tasks);

  const showTeams = m365Connected;
  const showTeamsChannels = m365Connected;
  const showSlack = slackConnected;
  const chatCardCount =
    (showTeams ? 1 : 0) + (showTeamsChannels ? 1 : 0) + (showSlack ? 1 : 0);

  return (
    <div className="space-y-5">
      {chatCardCount > 0 && (
        <div className={cn("grid gap-5", chatCardCount >= 2 && "grid-cols-1 lg:grid-cols-2", chatCardCount >= 3 && "xl:grid-cols-3")}>
          {showTeams && <TeamsChatsCard />}
          {showTeamsChannels && <TeamsChannelsCard />}
          {showSlack && <SlackCard />}
        </div>
      )}
      {m365Connected && <EmailHygieneCard />}
      <AIFeedCard />
      {isAri && <JeanaSection items={jeanaItems} />}
    </div>
  );
}
