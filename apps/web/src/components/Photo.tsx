/**
 * Menu photos are not in yet, so items show a plain placeholder rather than a
 * broken image or a stock picture of someone else's burger.
 */
export function Photo({ url, alt, className = "" }: { url?: string; alt: string; className?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={alt} className={`object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div className={`bg-surface ${className}`} role="img" aria-label={`Photo of ${alt} coming soon`}>
      <svg viewBox="0 0 100 100" className="w-full h-full text-line" preserveAspectRatio="none" aria-hidden>
        <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="0.5" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="0.5" />
      </svg>
    </div>
  );
}
