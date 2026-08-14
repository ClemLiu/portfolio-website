const neutrals = [
  { name: "paper", var: "--color-paper", hex: "#faf9f6" },
  { name: "paper-dark", var: "--color-paper-dark", hex: "#332d46", desc: "dark mode background" },
  { name: "ink-100", var: "--color-ink-100", hex: "#ece9e0" },
  { name: "ink-300", var: "--color-ink-300", hex: "#c7c4b6" },
  { name: "ink-500", var: "--color-ink-500", hex: "#7a7768" },
  { name: "ink-800", var: "--color-ink-800", hex: "#3a382e" },
  { name: "ink-950", var: "--color-ink-950", hex: "#17160f" },
];

const accents = [
  { name: "accent", hex: "#4f3ff0", desc: "base — links, primary buttons, active states" },
  { name: "accent-hover", hex: "#3f2fd4", desc: "hover / pressed state" },
  { name: "accent-subtle", hex: "#ece9fd", desc: "tinted backgrounds, badges" },
];

const typeScale = [
  { label: "display", size: "text-6xl", font: "font-serif", sample: "Product Design" },
  { label: "h1", size: "text-4xl", font: "font-serif", sample: "Rethinking Soccer Data Entry" },
  { label: "h2", size: "text-2xl", font: "font-serif", sample: "Unified Data Table Designs" },
  { label: "body-lg", size: "text-lg", font: "font-sans", sample: "Reducing cognitive load with design guidelines and consistency." },
  { label: "body", size: "text-base", font: "font-sans", sample: "Currently looking for a new job! Je suis bilingue!" },
];

export const Tokens = () => (
  <div className="bg-paper text-ink-950 p-10 space-y-14 font-sans">
    <section>
      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-500 mb-4">Neutrals</h2>
      <div className="flex flex-wrap gap-4">
        {neutrals.map((c) => (
          <div key={c.name} className="w-32">
            <div
              className="h-20 rounded-lg border border-ink-100"
              style={{ background: c.hex }}
            />
            <div className="mt-2 font-mono text-xs">{c.name}</div>
            <div className="font-mono text-xs text-ink-500">{c.hex}</div>
            {c.desc && <div className="text-xs text-ink-500 mt-0.5">{c.desc}</div>}
          </div>
        ))}
      </div>
    </section>

    <section>
      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-500 mb-4">
        Accent — ultra (indigo-violet)
      </h2>
      <div className="flex flex-wrap gap-6">
        {accents.map((c) => (
          <div key={c.name} className="w-56">
            <div
              className="h-24 rounded-lg border border-ink-100"
              style={{ background: c.hex }}
            />
            <div className="mt-2 font-mono text-xs uppercase tracking-wide">{c.name}</div>
            <div className="font-mono text-xs text-ink-500">{c.hex}</div>
            <p className="text-sm text-ink-800 mt-1">{c.desc}</p>
          </div>
        ))}
      </div>
    </section>

    <section>
      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-500 mb-4">
        Type scale — Jua display / sans body
      </h2>
      <div className="space-y-3">
        {typeScale.map((t) => (
          <div key={t.label} className="flex items-baseline gap-4">
            <span className="font-mono text-xs text-ink-500 w-20 shrink-0">{t.label}</span>
            <span className={`${t.font} ${t.size}`}>
              {t.sample}
            </span>
          </div>
        ))}
      </div>
    </section>

    <section>
      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-500 mb-4">
        Mono labels / tags
      </h2>
      <div className="flex flex-wrap gap-2">
        {["PRODUCT DESIGN", "RESEARCH", "PROTOTYPING", "2026", "6 MONTHS"].map((tag) => (
          <span
            key={tag}
            className="font-mono text-xs uppercase tracking-wide border border-ink-300 rounded-pill px-3 py-1"
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  </div>
);
