// Subtle deep-space backdrop behind the whole app: faint nebula + sparse stars.
// Server component (static) so it costs nothing at runtime.
const STARS = Array.from({ length: 60 }, (_, i) => ({
  top: (i * 73) % 100,
  left: (i * 37 + 11) % 100,
  size: i % 7 === 0 ? 2 : 1,
  delay: (i % 8) * 0.5,
  dur: 3 + (i % 4),
}));

export function CosmicBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      {/* nebula glow */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% -5%, rgba(79,139,255,0.18), transparent 60%),' +
            'radial-gradient(ellipse 50% 40% at 85% 20%, rgba(34,211,238,0.10), transparent 55%),' +
            'radial-gradient(ellipse 55% 45% at 12% 75%, rgba(217,70,239,0.10), transparent 55%)',
        }}
      />
      {/* starfield */}
      {STARS.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  );
}
