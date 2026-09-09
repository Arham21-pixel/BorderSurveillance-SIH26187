export function NetraEyeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.8" />
      <circle cx="16" cy="16" r="4" fill="currentColor" />
      <path
        d="M16 2V6M16 26V30M2 16H6M26 16H30"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.6"
      />
    </svg>
  );
}

export default function NetraLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div
        className={`rounded-full bg-netra-accent/10 border border-netra-accent/25 flex items-center justify-center shrink-0 shadow-[0_0_16px_-4px_rgba(38,229,229,0.7)] ${
          compact ? "w-8 h-8" : "w-9 h-9"
        }`}
      >
        <NetraEyeIcon className={compact ? "w-4 h-4 text-netra-accent" : "w-5 h-5 text-netra-accent"} />
      </div>
      <span
        className={`font-netra text-white leading-none truncate ${compact ? "!text-[17px]" : ""}`}
      >
        netra
      </span>
    </div>
  );
}
