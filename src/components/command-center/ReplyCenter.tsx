"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { TONE_PRESETS } from "@/lib/constants";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExternalLinkIcon } from "@/components/ui/icons";

interface ReplyItem {
  id: string;
  channel: "email" | "teams" | "slack" | "asana";
  subject: string;
  sender: string;
  daysAgo: number;
  url: string;
  tags: string[];
  context: string;
  message?: string;
}


const DEMO_REPLIES: ReplyItem[] = [
  { id: "r1", channel: "email", subject: "RE: Sonance Q3 Dealer Program", sender: "Mike Thornton", daysAgo: 2, url: "#", tags: ["REPLY", "FINANCIAL"], context: "Mike asking about Q3 dealer program updates and pricing changes.", message: "Hi Ari,\n\nFollowing up on our conversation last week — do you have the updated Q3 dealer program details? We need to finalize pricing for the new Sonance lineup before the June 1 deadline.\n\nAlso, any update on the co-op marketing funds allocation? A few of our top dealers have been asking.\n\nThanks,\nMike" },
  { id: "r2", channel: "email", subject: "NPI v. Dana — Claim Construction Ruling", sender: "Sarah Chen (Legal)", daysAgo: 38, url: "#", tags: ["REPLY", "LEGAL"], context: "Legal team needs direction on patent claim construction ruling.", message: "Ari,\n\nThe court issued the claim construction ruling in NPI v. Dana yesterday. The ruling is mixed — we got favorable construction on claims 1-3 but unfavorable on claim 7 (the dependent claim covering the mounting bracket assembly).\n\nWe need your input on whether to proceed to trial or explore settlement. The trial is currently set for September. Legal fees through trial are estimated at $800K-$1.2M.\n\nPlease advise on preferred direction so we can respond to opposing counsel by next Friday.\n\nBest,\nSarah" },
  { id: "r3", channel: "email", subject: "EP Wealth Tax Season — MThornton", sender: "Mark Thornton (EP Wealth)", daysAgo: 42, url: "#", tags: ["REPLY", "FINANCIAL"], context: "Tax advisor needs signatures and decisions on estimated payments.", message: "Hi Ari,\n\nHope you're doing well. A few items that need your attention for the tax season:\n\n1. We need your signature on the K-1 extensions by April 15\n2. Q2 estimated tax payments — I'm recommending we increase the federal estimate to $145K based on the projected Sonance distribution\n3. The Roth conversion window — we discussed doing a backdoor Roth contribution. Need your go-ahead to proceed\n\nCan you give me a call this week? Happy to walk through everything.\n\nBest,\nMark" },
  { id: "r4", channel: "teams", subject: "Cortex MCP for Claude", sender: "Jeana Ceglia", daysAgo: 0, url: "#", tags: ["REPLY", "ACTION"], context: "Jeana wants to discuss integrating Cortex with Claude MCP server.", message: "Hey Ari — just saw the Cortex MCP integration docs. I think we could use this to connect Claude directly to our Salesforce data and internal docs. Want me to set up a proof of concept? I'd need access to the Claude API key and about 2 days to prototype it." },
  { id: "r5", channel: "teams", subject: "Build from SCRATCH?", sender: "Derick Dahl", daysAgo: 0, url: "#", tags: ["REPLY", "URGENT"], context: "Derick questioning whether to rebuild the dealer portal from scratch.", message: "Ari — I know we talked about iterating on the existing dealer portal, but honestly the tech debt is killing us. Every feature takes 3x longer than it should. The React Native app is on an unsupported version and the API layer is a mess.\n\nI think we should seriously consider a full rebuild. I can have a proposal with timeline and cost ready by EOW. Thoughts?" },
  { id: "r6", channel: "slack", subject: "Christine Crain — Patron decision", sender: "Christine Crain", daysAgo: 0, url: "#", tags: ["REPLY"], context: "Christine asking about patron event replacement since Steve was vetoed.", message: "Hey Ari — quick question. Steve was on the list for the patron spot at the gala but Scott vetoed, says he's not social enough for that kind of event. Do you have a replacement in mind? We need to confirm by Thursday." },
  { id: "r7", channel: "slack", subject: "David Stark — QNAP install Monday", sender: "David Stark", daysAgo: 0, url: "#", tags: ["REPLY", "ACTION"], context: "David wants to install new QNAP on Monday.", message: "Hey! The new QNAP arrived. I'd like to come by Monday to install it and migrate everything over from the old Synology. Should take about 4 hours. Does Monday morning work? Also — should I coordinate with Christina on the network config?" },
  { id: "r8", channel: "email", subject: "Locauto Rental Damage €330", sender: "Locauto Support", daysAgo: 14, url: "#", tags: ["REPLY", "FINANCIAL"], context: "Rental company claiming €330 in damage charges from Italy trip.", message: "Dear Mr. Supran,\n\nFollowing your rental agreement #IT-2024-38291, our inspection team has identified damage to the front bumper of the vehicle (Fiat 500, plate EM 429 XL).\n\nThe repair cost is estimated at €330. As per the rental agreement, this amount will be charged to the credit card on file unless disputed within 14 days.\n\nPlease find attached the damage report and photos.\n\nRegards,\nLocauto Customer Service" },
  { id: "r9", channel: "asana", subject: "Compensation decisions finalization", sender: "HR / Asana", daysAgo: 6, url: "#", tags: ["URGENT", "ACTION"], context: "Overdue: finalize compensation decisions for leadership team." },
  { id: "r10", channel: "email", subject: "AI Article Forward — Scott (WRV)", sender: "Scott Wheeler", daysAgo: 5, url: "#", tags: ["REPLY"], context: "Scott forwarded an AI article and wants your take.", message: "Ari — saw this piece in HBR about AI in manufacturing distribution. Thought of our conversation about using AI for demand forecasting. Worth a read.\n\nWhat's your take? Think there's something here for Sonance?\n\n-Scott" },
  { id: "r11", channel: "asana", subject: "SLT self evaluations", sender: "HR / Asana", daysAgo: 8, url: "#", tags: ["ACTION"], context: "Senior Leadership Team self evaluations are overdue." },
  { id: "r12", channel: "slack", subject: "Travis Leo — Claude Excel/PPT auth", sender: "Travis Leo", daysAgo: 0, url: "#", tags: ["REPLY", "ACTION"], context: "Travis can't install Claude Excel/PPT plugins, auth broken.", message: "Hey Ari — I've been trying to get the Claude plugins working for Excel and PowerPoint but the authentication keeps failing. We're on GoDaddy-hosted O365 and it seems like the Microsoft Marketplace auth flow doesn't work right with our setup. Any ideas? Travis from Cinergy is having the same issue." },
];

const CHANNEL_COLORS: Record<string, string> = {
  email: "tag-email",
  teams: "tag-teams",
  slack: "tag-slack",
  asana: "tag-asana",
};

const CHANNEL_NAMES: Record<string, string> = {
  email: "Outlook",
  teams: "Teams",
  slack: "Slack",
  asana: "Asana",
};

function ageBadgeClass(days: number) {
  if (days >= 30) return "bg-accent-red/20 text-accent-red";
  if (days >= 7) return "bg-accent-amber/20 text-accent-amber";
  if (days >= 1) return "bg-accent-teal/20 text-accent-teal";
  return "bg-[var(--tab-bg)] text-text-muted";
}

interface ReplyCenterProps {
  items?: ReplyItem[];
}

export function ReplyCenter({ items = DEMO_REPLIES }: ReplyCenterProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [activeDrafts, setActiveDrafts] = useState<Record<string, string>>({});
  const [activeTones, setActiveTones] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [promptTexts, setPromptTexts] = useState<Record<string, string>>({});
  const [streamingIds, setStreamingIds] = useState<Set<string>>(new Set());

  const counts = {
    all: items.length,
    email: items.filter((i) => i.channel === "email").length,
    teams: items.filter((i) => i.channel === "teams").length,
    slack: items.filter((i) => i.channel === "slack").length,
    asana: items.filter((i) => i.channel === "asana").length,
  };

  const filtered = items.filter((item) => {
    if (dismissedIds.has(item.id)) return false;
    if (activeFilter === "all") return true;
    return item.channel === activeFilter;
  });

  function handleTone(itemId: string, toneId: string, context: string) {
    const tone = TONE_PRESETS.find((t) => t.id === toneId);
    if (!tone) return;
    setActiveDrafts((prev) => ({ ...prev, [itemId]: tone.generate(context) }));
    setActiveTones((prev) => ({ ...prev, [itemId]: toneId }));
  }

  function handlePromptMode(itemId: string) {
    setActiveTones((prev) => ({ ...prev, [itemId]: "ai-prompt" }));
    setActiveDrafts((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    setExpandedId(itemId);
  }

  async function handleAIDraft(item: ReplyItem) {
    const prompt = promptTexts[item.id]?.trim();
    if (!prompt) return;

    setStreamingIds((prev) => new Set(prev).add(item.id));
    // Use a sentinel space so the draft area renders while streaming
    setActiveDrafts((prev) => ({ ...prev, [item.id]: " " }));

    try {
      const response = await fetch("/api/ai/draft-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: item.message || item.context,
          prompt,
          channel: item.channel,
          sender: item.sender,
          subject: item.subject,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Request failed (${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setActiveDrafts((prev) => ({ ...prev, [item.id]: fullText }));
        }
      }

      if (!fullText.trim()) {
        throw new Error("Empty response from AI");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setActiveDrafts((prev) => ({
        ...prev,
        [item.id]: `Error: ${msg}. Please try again.`,
      }));
    } finally {
      setStreamingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  function handleDismiss(id: string) {
    setDismissedIds((prev) => new Set(prev).add(id));
    if (expandedId === id) setExpandedId(null);
  }

  function handleCopy(text: string) {
    navigator.clipboard?.writeText(text);
  }

  return (
    <section className="glass-card anim-card" style={{ animationDelay: "240ms" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-heading">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Reply Center
          <span className="inline-flex items-center rounded-full bg-accent-amber/15 text-accent-amber px-2 py-0.5 text-xs font-medium">
            {filtered.length}
          </span>
        </h2>
        <div className="flex gap-1 flex-wrap">
          {(["all", "email", "teams", "slack", "asana"] as const).map((f) => (
            <button
              key={f}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                activeFilter === f
                  ? "bg-[var(--tab-active-bg)] text-accent-amber"
                  : "text-text-muted hover:text-text-body hover:bg-[var(--tab-bg)]"
              )}
              onClick={() => setActiveFilter(f)}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1 opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
      <div className="space-y-0 divide-y divide-[var(--bg-card-border)]">
        {filtered.map((item) => {
          const isExpanded = expandedId === item.id;
          const isPromptMode = activeTones[item.id] === "ai-prompt";
          const isStreaming = streamingIds.has(item.id);

          return (
            <div key={item.id} className="py-3">
              <div className="flex items-start gap-3">
                <span className={cn("text-[10px] font-bold uppercase tracking-wide rounded-md px-2 py-0.5 shrink-0 mt-0.5", CHANNEL_COLORS[item.channel])}>
                  {item.channel}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      className="hot-link text-sm font-medium text-left cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      {item.subject}
                    </button>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-muted hover:text-text-body shrink-0 transition-colors"
                        title={`Open in ${CHANNEL_NAMES[item.channel]}`}
                      >
                        <ExternalLinkIcon size={12} />
                      </a>
                    )}
                    {item.daysAgo > 0 && (
                      <span className={cn("text-[10px] font-semibold rounded-full px-1.5 py-0.5", ageBadgeClass(item.daysAgo))}>
                        {item.daysAgo}d
                      </span>
                    )}
                    {item.tags.map((tag) => (
                      <span key={tag} className="text-[9px] uppercase tracking-wider text-text-muted bg-[var(--tab-bg)] rounded px-1.5 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-text-muted">{item.sender}</div>

                  {/* Expanded original message */}
                  {isExpanded && item.message && (
                    <div className="mt-2 p-3 rounded-lg bg-[var(--tab-bg)] border-l-2 border-accent-amber/30">
                      <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
                        From {item.sender}
                      </div>
                      <p className="text-xs text-text-body whitespace-pre-wrap">
                        {item.message}
                      </p>
                    </div>
                  )}

                  {/* Tone preset buttons + Prompt Reply */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {TONE_PRESETS.map((tone) => (
                      <button
                        key={tone.id}
                        className={cn(
                          "text-[10px] px-2 py-1 rounded-md transition-all cursor-pointer border",
                          activeTones[item.id] === tone.id
                            ? "border-accent-amber bg-accent-amber/15 text-accent-amber"
                            : "border-[var(--bg-card-border)] text-text-muted hover:border-accent-amber/30 hover:text-text-body"
                        )}
                        onClick={() => handleTone(item.id, tone.id, item.context)}
                      >
                        {tone.label}
                      </button>
                    ))}
                    <button
                      className={cn(
                        "text-[10px] px-2 py-1 rounded-md transition-all cursor-pointer border",
                        isPromptMode
                          ? "border-accent-amber bg-accent-amber/15 text-accent-amber"
                          : "border-[var(--bg-card-border)] text-text-muted hover:border-accent-amber/30 hover:text-text-body"
                      )}
                      onClick={() => handlePromptMode(item.id)}
                    >
                      Prompt Reply
                    </button>
                  </div>

                  {/* Prompt input area */}
                  {isPromptMode && !activeDrafts[item.id] && !isStreaming && (
                    <div className="mt-2 p-3 rounded-lg bg-[var(--draft-bg)] border border-[rgba(212,164,76,0.1)]">
                      <textarea
                        className="w-full h-20 bg-transparent border border-[var(--bg-card-border)] rounded-lg p-2 text-xs text-text-body resize-none focus:outline-none focus:border-accent-amber/30 placeholder:text-text-muted"
                        placeholder="Dictate or type your thoughts on how to reply..."
                        value={promptTexts[item.id] || ""}
                        onChange={(e) =>
                          setPromptTexts((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                      />
                      <button
                        className="mt-2 text-[10px] px-2.5 py-1 rounded-md bg-accent-amber text-[#0d0d0d] font-medium cursor-pointer hover:bg-accent-amber/90 transition-colors disabled:opacity-50"
                        disabled={!promptTexts[item.id]?.trim()}
                        onClick={() => handleAIDraft(item)}
                      >
                        Draft Reply
                      </button>
                    </div>
                  )}

                  {/* Streaming indicator */}
                  {isStreaming && !activeDrafts[item.id] && (
                    <div className="mt-2 p-3 rounded-lg bg-[var(--draft-bg)] border border-[rgba(212,164,76,0.1)]">
                      <div className="text-xs text-text-muted animate-pulse">Drafting...</div>
                    </div>
                  )}

                  {/* Draft area (editable) */}
                  {activeDrafts[item.id] && (
                    <div className="mt-2 p-3 rounded-lg bg-[var(--draft-bg)] border border-[rgba(212,164,76,0.1)]">
                      <textarea
                        className="w-full text-xs text-text-body whitespace-pre-wrap font-sans mb-2 bg-transparent resize-none focus:outline-none min-h-[60px]"
                        value={activeDrafts[item.id]}
                        onChange={(e) =>
                          setActiveDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        rows={Math.max(3, activeDrafts[item.id].split("\n").length + 1)}
                      />
                      <div className="flex gap-2">
                        <button
                          className="text-[10px] px-2.5 py-1 rounded-md bg-accent-amber text-[#0d0d0d] font-medium cursor-pointer hover:bg-accent-amber/90 transition-colors"
                          onClick={() => handleCopy(activeDrafts[item.id])}
                        >
                          Copy to Clipboard
                        </button>
                        {item.url && (
                          <a
                            className="text-[10px] px-2.5 py-1 rounded-md border border-[var(--bg-card-border)] text-text-muted hover:text-text-body transition-colors"
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open in {CHANNEL_NAMES[item.channel]}
                          </a>
                        )}
                        <button
                          className="text-[10px] px-2.5 py-1 rounded-md text-text-muted hover:text-accent-red transition-colors cursor-pointer"
                          onClick={() => handleDismiss(item.id)}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
}
