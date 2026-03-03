"use client";
import { useState } from "react";

interface ComposeEmailProps {
  isOpen: boolean;
  onClose: () => void;
  to?: string;
  subject?: string;
  body?: string;
}

export function ComposeEmail({ isOpen, onClose, to = "", subject = "", body = "" }: ComposeEmailProps) {
  const [toValue, setToValue] = useState(to);
  const [subjectValue, setSubjectValue] = useState(subject);
  const [bodyValue, setBodyValue] = useState(body);

  if (!isOpen) return null;

  function handleCopy() {
    const text = `To: ${toValue}\nSubject: ${subjectValue}\n\n${bodyValue}`;
    navigator.clipboard?.writeText(text);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="glass-card w-full max-w-xl mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-heading">Compose Email</h3>
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

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1 block">To</label>
            <input
              type="email"
              className="w-full bg-[var(--draft-bg)] border border-[rgba(212,164,76,0.1)] rounded-lg px-3 py-2 text-sm text-text-body focus:outline-none focus:border-accent-amber/30"
              value={toValue}
              onChange={(e) => setToValue(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1 block">Subject</label>
            <input
              type="text"
              className="w-full bg-[var(--draft-bg)] border border-[rgba(212,164,76,0.1)] rounded-lg px-3 py-2 text-sm text-text-body focus:outline-none focus:border-accent-amber/30"
              value={subjectValue}
              onChange={(e) => setSubjectValue(e.target.value)}
              placeholder="Subject line"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1 block">Message</label>
            <textarea
              className="w-full h-40 bg-[var(--draft-bg)] border border-[rgba(212,164,76,0.1)] rounded-lg p-3 text-sm text-text-body resize-none focus:outline-none focus:border-accent-amber/30"
              value={bodyValue}
              onChange={(e) => setBodyValue(e.target.value)}
              placeholder="Write your message..."
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            className="text-xs px-3 py-1.5 rounded-lg bg-accent-amber text-[#0d0d0d] font-medium cursor-pointer hover:bg-accent-amber/90 transition-colors"
            onClick={handleCopy}
          >
            Copy to Clipboard
          </button>
          <a
            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--bg-card-border)] text-text-muted hover:text-text-body transition-colors inline-flex items-center"
            href={`https://outlook.office365.com/mail/deeplink/compose?to=${encodeURIComponent(toValue)}&subject=${encodeURIComponent(subjectValue)}&body=${encodeURIComponent(bodyValue)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Outlook
          </a>
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
