"use client";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { AttentionFeedbackControl } from "@/components/ui/AttentionFeedbackControl";
import { ConnectPrompt } from "@/components/ui/ConnectPrompt";
import { SlackIcon } from "@/components/ui/icons";
import { useSlackFeed } from "@/hooks/useSlackFeed";
import { useAttention } from "@/lib/attention/client";
import { buildSlackAttentionTarget } from "@/lib/attention/targets";
import { useConnections } from "@/hooks/useConnections";
import { CaptureButton } from "@/components/ui/CaptureButton";
import { useVaultCaptureContext } from "@/components/modals/VaultCaptureProvider";

export function SlackCard() {
  const { messages, loading } = useSlackFeed();
  const { slack: slackConnected } = useConnections();
  const { applyTarget } = useAttention();
  const { open: openCapture } = useVaultCaptureContext();

  const rankedMessages = messages
    .map((message) => {
      const target = buildSlackAttentionTarget(message, "signals", 32);
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
    <section className="glass-card anim-card" style={{ animationDelay: "80ms" }}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text-heading mb-4">
        <SlackIcon />
        Slack
        {slackConnected && (
          <span className="inline-flex items-center rounded-full bg-[rgba(90,199,139,0.12)] text-accent-green px-2 py-0.5 text-xs font-medium">
            {rankedMessages.length} messages
          </span>
        )}
      </h2>
      {!slackConnected ? (
        <ConnectPrompt service="Slack" />
      ) : loading && rankedMessages.length === 0 ? (
        <div className="text-sm text-text-muted animate-pulse py-4 text-center">Loading Slack…</div>
      ) : rankedMessages.length === 0 ? (
        <EmptyState />
      ) : (
      <div className="space-y-0 divide-y divide-[var(--bg-card-border)]">
        {rankedMessages.slice(0, 8).map(({ message: msg, target, attention }, i) => (
          <div
            key={msg.id || i}
            className={cn(
              "flex items-start justify-between gap-3 py-3",
              i === 0 && "pt-0",
            )}
          >
            <div className="flex items-start gap-2 min-w-0">
              <span className="inline-flex items-center rounded-md bg-white/5 text-text-muted px-1.5 py-0.5 text-[10px] font-bold tracking-wide shrink-0 mt-0.5">
                #{msg.channel_name || "general"}
              </span>
              <div className="min-w-0">
                <div className="text-sm text-text-body line-clamp-2">{msg.text || "(no text)"}</div>
                <span className="text-xs text-text-muted">{msg.author_name}</span>
                {msg.thread_reply_count > 0 && (
                  <span className="text-xs text-text-muted ml-2">{msg.thread_reply_count} replies</span>
                )}
                {attention.explanation.length > 0 && (
                  <div className="mt-1 text-[11px] text-text-muted">{attention.explanation.join(" · ")}</div>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <AttentionFeedbackControl
                target={target}
                surface="signals"
                compact
              />
              <CaptureButton
                compact
                content={msg.text || ""}
                sourceType="slack"
                sourceMeta={{
                  from: msg.author_name,
                  channel: msg.channel_name,
                  timestamp: msg.timestamp,
                  url: msg.permalink ?? undefined,
                }}
                onCapture={openCapture}
              />
              {msg.permalink && (
                <a
                  href={msg.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-text-muted hover:text-accent-amber transition-colors px-2 py-1 rounded-md hover:bg-[var(--accent-amber-dim)] cursor-pointer"
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
