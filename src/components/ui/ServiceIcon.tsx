"use client";

interface ServiceIconProps {
  kind: "email" | "chat" | "slack" | "asana";
  size?: number;
  className?: string;
}

export function ServiceIcon({ kind, size = 16, className }: ServiceIconProps) {
  switch (kind) {
    case "email":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
          <rect x="1" y="3" width="14" height="10" rx="2" stroke="#0078d4" strokeWidth="1.3" />
          <path d="M1.5 4.5L8 9L14.5 4.5" stroke="#0078d4" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "chat":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
          <path d="M2.5 2.5h11a1.5 1.5 0 011.5 1.5v6a1.5 1.5 0 01-1.5 1.5H9l-3 2.5v-2.5H2.5A1.5 1.5 0 011 10V4a1.5 1.5 0 011.5-1.5z" stroke="#6264a7" strokeWidth="1.3" strokeLinejoin="round" />
          <circle cx="5" cy="7" r="0.75" fill="#6264a7" />
          <circle cx="8" cy="7" r="0.75" fill="#6264a7" />
          <circle cx="11" cy="7" r="0.75" fill="#6264a7" />
        </svg>
      );
    case "slack":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
          <path d="M3.5 9.5a1.25 1.25 0 110-2.5h3.25v2.5a1.25 1.25 0 01-1.25 1.25H3.5z" stroke="#4a154b" strokeWidth="1.1" />
          <path d="M12.5 6.5a1.25 1.25 0 110 2.5H9.25V6.5a1.25 1.25 0 011.25-1.25h2z" stroke="#4a154b" strokeWidth="1.1" />
          <path d="M6.5 3.5a1.25 1.25 0 112.5 0v3.25H6.5a1.25 1.25 0 01-1.25-1.25v-2z" stroke="#4a154b" strokeWidth="1.1" />
          <path d="M9.5 12.5a1.25 1.25 0 11-2.5 0V9.25H9.5a1.25 1.25 0 011.25 1.25v2z" stroke="#4a154b" strokeWidth="1.1" />
        </svg>
      );
    case "asana":
      return (
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
          <circle cx="8" cy="4.5" r="2.5" stroke="#f06a6a" strokeWidth="1.3" />
          <circle cx="4" cy="10.5" r="2.5" stroke="#f06a6a" strokeWidth="1.3" />
          <circle cx="12" cy="10.5" r="2.5" stroke="#f06a6a" strokeWidth="1.3" />
        </svg>
      );
  }
}
