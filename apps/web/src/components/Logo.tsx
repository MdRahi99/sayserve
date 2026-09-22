/**
 * A speech bubble, because the whole idea is that you can just say it.
 *
 * Drawn inline rather than loaded: it is a few hundred bytes, it never 404s,
 * and it inherits the current colour so it works on the dark staff header as
 * well as the light one.
 */
export function Logo({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M7 11a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-7l-5 4v-4a3 3 0 0 1-3-3z"
        className="fill-card"
      />
      <circle cx="12.5" cy="14.5" r="1.7" fill="currentColor" />
      <circle cx="16" cy="14.5" r="1.7" className="fill-brand" />
      <circle cx="19.5" cy="14.5" r="1.7" fill="currentColor" />
    </svg>
  );
}
