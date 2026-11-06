// Quiet ambient background: a fine paper-grain texture plus two very soft,
// static light washes. Deliberately understated — no bouncing neon blobs.
export function FloatingBg() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base wash */}
      <div className="absolute inset-0 bg-background" />

      {/* Two soft, static light sources */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(900px 520px at 8% -6%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 62%), radial-gradient(760px 460px at 96% 4%, color-mix(in oklab, var(--accent) 16%, transparent), transparent 60%)",
        }}
      />

      {/* Fine grain — reads as printed paper rather than a gradient poster */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, currentColor 0 1px, transparent 1px 3px)",
          color: "var(--color-foreground)",
        }}
      />
    </div>
  );
}
