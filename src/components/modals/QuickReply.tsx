"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { TONE_PRESETS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";

interface QuickReplyProps {
  isOpen: boolean;
  onClose: () => void;
  channel?: "email" | "teams" | "slack" | "asana";
  subject?: string;
  sender?: string;
  context?: string;
  url?: string;
}

const CHANNEL_NAMES: Record<string, string> = {
  email: "Outlook",
  teams: "Teams",
  slack: "Slack",
  asana: "Asana",
};

export function QuickReply({
  isOpen,
  onClose,
  channel = "email",
  subject = "",
  sender = "",
  context = "",
  url = "",
}: QuickReplyProps) {
  const { isAri } = useAuth();
  const [draft, setDraft] = useState("");
  const [activeTone, setActiveTone] = useState<string | null>(null);

  const tonePresets = isAri ? TONE_PRESETS : TONE_PRESETS.filter(t => !t.ariOnly);

  if (!isOpen) return null;

  function handleTone(toneId: string) {
    const tone = TONE_PRESETS.find((t) => t.id === toneId);
    if (!tone) return;
    setDraft(tone.generate(context));
    setActiveTone(toneId);
  }

  function handleCopy() {
    navigator.clipboard?.writeText(draft);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-card w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-heading">Quick Reply</h3>
          <button
            className="text-text-muted hover:text-text-heading transition-colors cursor-pointer"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Context */}
        {(subject || sender) && (
          <div className="mb-3 p-2.5 rounded-lg bg-[var(--tab-bg)]">
            {subject && <div className="text-sm font-medium text-text-heading">{subject}</div>}
            {sender && <div className="text-xs text-text-muted">{sender}</div>}
          </div>
        )}

        {/* Tone presets */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tonePresets.map((tone) => (
            <button
              key={tone.id}
              className={cn(
                "text-[10px] px-2.5 py-1 rounded-md transition-all cursor-pointer border",
                activeTone === tone.id
                  ? "border-accent-amber bg-accent-amber/15 text-accent-amber"
                  : "border-[var(--bg-card-border)] text-text-muted hover:border-accent-amber/30 hover:text-text-body"
              )}
              onClick={() => handleTone(tone.id)}
            >
              {tone.label}
            </button>
          ))}
        </div>

        {/* Draft area */}
        <textarea
          className="w-full h-32 bg-[var(--draft-bg)] border border-[rgba(212,164,76,0.1)] rounded-lg p-3 text-sm text-text-body resize-none focus:outline-none focus:border-accent-amber/30"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write your reply or select a tone above..."
        />

        <div className="flex gap-2 mt-3">
          <button
            className="text-xs px-3 py-1.5 rounded-lg bg-accent-amber text-[#0d0d0d] font-medium cursor-pointer hover:bg-accent-amber/90 transition-colors"
            onClick={handleCopy}
          >
            Copy to Clipboard
          </button>
          {url && (
            <a
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--bg-card-border)] text-text-muted hover:text-text-body transition-colors inline-flex items-center"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in {CHANNEL_NAMES[channel] || channel}
            </a>
          )}
          <button
            className="text-xs px-3 py-1.5 rounded-lg text-text-muted hover:text-text-body transition-colors cursor-pointer ml-auto"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
