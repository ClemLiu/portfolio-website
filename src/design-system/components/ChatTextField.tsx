import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, FormEvent } from "react";

// Icons are the Material "add" and "arrow_upward" glyphs exactly as they're drawn in the Figma file.
const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M11 13H5V11H11V5H13V11H19V13H13V19H11V13Z" fill="currentColor" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M13 7.825L13 20L11 20L11 7.825L5.4 13.425L4 12L12 4L20 12L18.6 13.425L13 7.825Z" fill="currentColor" />
  </svg>
);

const circleButton = {
  boxSizing: "border-box",
  width: 36,
  height: 36,
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  borderRadius: 18,
} as const;

const TEXT_FONT = "400 16px/24px Inter, ui-sans-serif, system-ui, sans-serif";
const TEXT_COLOR = "#e0e0e0";
// the same font, as a canvas wants it (it ignores the line height)
const SAND_FONT = "400 16px Inter, ui-sans-serif, system-ui, sans-serif";

/** the card's stroke at rest (from the design) and while the field has focus */
const STROKE = "#5c5c5c";
const STROKE_FOCUSED = "#a9a9a9";

/** how long a deleted character takes to tumble away and fade out */
const TUMBLE_MS = 150;
/** how long text sent with Enter takes to blow away as sand */
const DISSOLVE_MS = 1000;
/** deleting a whole long message shouldn't spawn hundreds of elements */
const MAX_GHOSTS = 40;

/** the sand canvas reaches this far past the card on every side, so grains can drift out of it */
const SAND_BLEED = 48;
/** the direction the sand blows, in radians clockwise from straight up (1 o'clock = 30°), and how far a grain may stray from it */
const WIND_ANGLE = (30 * Math.PI) / 180;
const WIND_SCATTER = (14 * Math.PI) / 180;
/** upper limit on grains per message, so a long one doesn't tank the frame rate */
const MAX_GRAINS = 9000;

// One grain of the sand a sent message turns into. Positions are in CSS px on the sand canvas.
type Grain = {
  x: number;
  y: number;
  /** how far it drifts over its life */
  dx: number;
  dy: number;
  /** performance.now() time it lets go of the text, and how long it then takes to blow away */
  start: number;
  life: number;
  /** its opacity at rest, from how solid that pixel of the text was */
  alpha: number;
  size: number;
  phase: number;
};

// A deleted character that has left the field but is still on screen while it tumbles away.
type Ghost = { id: number; text: string; left: number; rotate: number };

// Which characters of `prev` are gone in `next`. When it's a plain deletion the caret sits where the removed text
// started, which pins down repeated letters ("aab" -> "ab"); anything else (typing over a selection, paste)
// falls back to the longest common prefix and suffix.
const removedRange = (prev: string, next: string, caret: number): [number, number] => {
  const gone = prev.length - next.length;
  if (gone > 0 && prev.slice(0, caret) === next.slice(0, caret) && prev.slice(caret + gone) === next.slice(caret)) {
    return [caret, caret + gone];
  }
  let start = 0;
  while (start < prev.length && start < next.length && prev[start] === next[start]) start++;
  let endPrev = prev.length;
  let endNext = next.length;
  while (endPrev > start && endNext > start && prev[endPrev - 1] === next[endNext - 1]) {
    endPrev--;
    endNext--;
  }
  return [start, endPrev];
};

export type ChatTextFieldProps = {
  placeholder?: string;
};

// Native rebuild of the "Chat" text field from the Figma "Text Field" page. In the Figma prototype typing sets
// three variables — chat/value (the text), chat/empty (hides the placeholder) and chat/submitOpacity (30 while
// empty, 100 once there's text); here those are just the input's value and `empty` below.
//
// A real <input> can't animate single characters, so the text you see is a mirror drawn underneath it: the input
// keeps all the editing behaviour (caret position, selection, IME, paste) with its text made transparent, and the
// mirror renders the same text in the same font. That's what lets a deleted character be left behind as a "ghost"
// that tumbles down and fades out while the rest of the text closes up, and it's also why the caret you see is
// drawn here (positioned from the input's real caret) rather than being the browser's own.
export const ChatTextField = ({ placeholder = "Type something!" }: ChatTextFieldProps) => {
  const [value, setValue] = useState("");
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [focused, setFocused] = useState(false);
  // true while sent text is still dissolving: the placeholder waits for it to finish, then fades in
  const [holdPlaceholder, setHoldPlaceholder] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);
  // the sand a sent message turns into: a canvas over the card, the grains still in flight, and the frame loop
  const sandRef = useRef<HTMLCanvasElement>(null);
  const grainsRef = useRef<Grain[]>([]);
  const sandFrame = useRef(0);
  // x position (px from the left of the text line) of the caret; null when it shouldn't show. `id` restarts the
  // blink every time the caret moves, so it stays solid while you type.
  const [caret, setCaret] = useState<{ x: number; id: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const nextGhostId = useRef(0);
  const nextCaretId = useRef(0);
  const empty = value.length === 0;

  // the input scrolls sideways once the text is wider than the field; the mirror has to follow
  const syncScroll = () => {
    if (inputRef.current && textRef.current) textRef.current.style.transform = `translateX(${-inputRef.current.scrollLeft}px)`;
  };

  // Puts the caret where the input's real caret is, by measuring the character just before it in the mirror.
  // A selection hides it (the selection highlight takes over), and so does the field not having focus.
  const updateCaret = useCallback(() => {
    const input = inputRef.current;
    const text = textRef.current;
    const track = trackRef.current;
    if (!input || !text || !track || document.activeElement !== input || input.selectionStart !== input.selectionEnd) {
      setCaret(null);
      return;
    }
    const node = text.firstChild;
    const offset = Math.min(input.selectionStart ?? 0, node?.textContent?.length ?? 0);
    let x = 0;
    if (node && offset > 0) {
      const range = document.createRange();
      range.setStart(node, offset - 1);
      range.setEnd(node, offset);
      x = range.getBoundingClientRect().right - track.getBoundingClientRect().left;
    }
    setCaret({ x, id: nextCaretId.current++ });
  }, []);

  // arrow keys, clicks, drags and typing all move the real caret and fire selectionchange
  useEffect(() => {
    document.addEventListener("selectionchange", updateCaret);
    return () => document.removeEventListener("selectionchange", updateCaret);
  }, [updateCaret]);

  // the mirror has just been re-rendered with new text, so the caret has to be measured against it
  useLayoutEffect(() => {
    updateCaret();
  }, [value, updateCaret]);

  const dropGhosts = (ids: number[]) => setGhosts((all) => all.filter((g) => !ids.includes(g.id)));

  // Called before React re-renders, so the mirror still holds the old text and each deleted character's
  // on-screen position can be measured straight from it.
  const spawnGhosts = (prev: string, next: string, caretAt: number) => {
    const textNode = textRef.current?.firstChild;
    const track = trackRef.current;
    if (!textNode || !track) return;
    const [from, to] = removedRange(prev, next, caretAt);
    if (to <= from) return;

    const trackLeft = track.getBoundingClientRect().left;
    const range = document.createRange();
    const created: Ghost[] = [];
    for (let i = from; i < Math.min(to, from + MAX_GHOSTS); i++) {
      range.setStart(textNode, i);
      range.setEnd(textNode, i + 1);
      const box = range.getBoundingClientRect();
      if (box.width === 0) continue;
      created.push({
        id: nextGhostId.current++,
        text: prev[i],
        left: box.left - trackLeft,
        // each one tips over its own way
        rotate: (Math.random() < 0.5 ? -1 : 1) * (16 + Math.random() * 20),
      });
    }
    if (created.length === 0) return;
    setGhosts((all) => [...all, ...created]);
    // animationend normally removes them; this covers a tab that was hidden mid-animation
    window.setTimeout(() => dropGhosts(created.map((g) => g.id)), TUMBLE_MS + 200);
  };

  // Draws the grains still in flight, one frame. Runs until the last one has blown away.
  const drawSand = useCallback(() => {
    sandFrame.current = 0;
    const canvas = sandRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.fillStyle = TEXT_COLOR;

    const now = performance.now();
    const grains = grainsRef.current;
    let kept = 0;
    for (let i = 0; i < grains.length; i++) {
      const g = grains[i];
      const p = Math.max(0, (now - g.start) / g.life);
      if (p >= 1) continue;
      grains[kept++] = g;
      // the wind picks them up slowly, then they go: displacement accelerates, with a little wobble on the way
      const move = p * Math.sqrt(p);
      ctx.globalAlpha = g.alpha * (1 - p * p);
      const s = g.size * (1 + p * 0.6);
      ctx.fillRect(g.x + g.dx * move + Math.sin(g.phase + p * 7) * 2 * p, g.y + g.dy * move + Math.cos(g.phase + p * 5) * 1.5 * p, s, s);
    }
    grains.length = kept;
    ctx.globalAlpha = 1;
    if (kept > 0) sandFrame.current = requestAnimationFrame(drawSand);
  }, []);

  useEffect(
    () => () => {
      cancelAnimationFrame(sandFrame.current);
      window.clearTimeout(holdTimer.current);
    },
    [],
  );

  // Turns the text that was just sent into sand. The text is drawn once to a scratch canvas, in the same font and at
  // the same spot as the mirror, and every pixel of ink becomes a grain. They let go from left to right (with plenty
  // of scatter, and slowly at first), then drift off downwind while fading. Nothing here changes the input.
  const spawnSand = (text: string) => {
    const canvas = sandRef.current;
    const mirror = textRef.current;
    const track = trackRef.current;
    const form = canvas?.parentElement;
    if (!canvas || !mirror || !track || !form || !text) return;

    const dpr = window.devicePixelRatio || 1;
    const formBox = form.getBoundingClientRect();
    const cssW = formBox.width + SAND_BLEED * 2;
    const cssH = formBox.height + SAND_BLEED * 2;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    // pin the CSS size to the backing store's so nothing is stretched
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    const canvasBox = canvas.getBoundingClientRect();
    const trackBox = track.getBoundingClientRect();
    const mirrorBox = mirror.getBoundingClientRect();

    // the part of the line that's visible: the track's width (long text may have scrolled), a little above and below
    const pad = 4;
    const regionW = Math.ceil(trackBox.width);
    const regionH = 24 + pad * 2;
    const regionX = trackBox.left - canvasBox.left;
    const regionY = mirrorBox.top - canvasBox.top - pad;
    const textX = mirrorBox.left - trackBox.left;

    const scratch = document.createElement("canvas");
    scratch.width = Math.max(1, Math.round(regionW * dpr));
    scratch.height = Math.max(1, Math.round(regionH * dpr));
    const sctx = scratch.getContext("2d", { willReadFrequently: true });
    if (!sctx) return;
    sctx.scale(dpr, dpr);
    sctx.font = SAND_FONT;
    sctx.fillStyle = "#fff";
    sctx.textBaseline = "alphabetic";
    const metrics = sctx.measureText("Hg");
    const ascent = metrics.fontBoundingBoxAscent ?? 15.5;
    const descent = metrics.fontBoundingBoxDescent ?? 3.9;
    // the baseline of a 24px line box holding this font
    sctx.fillText(text, textX, pad + (24 - (ascent + descent)) / 2 + ascent);
    const textWidth = Math.max(1, sctx.measureText(text).width);

    const { data, width, height } = sctx.getImageData(0, 0, scratch.width, scratch.height);
    let inked = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 24) inked++;
    const keep = Math.min(1, MAX_GRAINS / Math.max(1, inked));

    const now = performance.now();
    const spread = DISSOLVE_MS * 0.55;
    const made: Grain[] = [];
    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const a = data[(py * width + px) * 4 + 3];
        if (a <= 24 || (keep < 1 && Math.random() > keep)) continue;
        // 0 at the start of the text, 1 at its end, mixed with chance so the edge of the erosion is ragged
        const along = Math.min(1, Math.max(0, (px / dpr - textX) / textWidth));
        const order = 0.6 * along + 0.4 * Math.random();
        // each grain heads for 1 o'clock (30° clockwise from straight up), give or take 14° of scatter
        const heading = WIND_ANGLE + (Math.random() - 0.5) * 2 * WIND_SCATTER;
        const distance = 40 + Math.random() * 120;
        made.push({
          x: regionX + px / dpr,
          y: regionY + py / dpr,
          dx: Math.sin(heading) * distance,
          dy: -Math.cos(heading) * distance,
          // sqrt: few let go at first, then more and more, so the whole thing eases in
          start: now + spread * Math.sqrt(order),
          life: DISSOLVE_MS * (0.35 + Math.random() * 0.1),
          alpha: (a / 255) * (0.75 + Math.random() * 0.25),
          size: (1 / dpr) * (1 + Math.random() * 0.5),
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
    grainsRef.current.push(...made);
    // draw straight away so the sand is already in place on the frame the field clears
    cancelAnimationFrame(sandFrame.current);
    drawSand();
  };

  const reducesMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    if (!reducesMotion() && next !== value) spawnGhosts(value, next, e.target.selectionStart ?? next.length);
    setValue(next);
    syncScroll();
  };

  // Enter (or the send button). For the prototype that just clears the field, with the text dissolving away
  // where it stood.
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (empty) return;
    if (!reducesMotion()) {
      spawnSand(value);
      setHoldPlaceholder(true);
      window.clearTimeout(holdTimer.current);
      holdTimer.current = window.setTimeout(() => setHoldPlaceholder(false), DISSOLVE_MS);
    }
    setValue("");
    syncScroll();
    // clicking the send button moved focus onto it; typing should carry on in the field
    inputRef.current?.focus();
  };

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 800 }}>
      {/* a slow, subtle halo in the brand blue and gold that travels around the outside of the stroke; the card's own
          fill covers the middle of it, so only the glow past the edge shows */}
      <div className="tf-glow" aria-hidden="true" />
      <form
        onSubmit={handleSubmit}
        style={{
          position: "relative",
          zIndex: 1,
          boxSizing: "border-box",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 16,
          padding: 24,
          background: "#171717",
          border: "1px solid",
          borderColor: focused ? STROKE_FOCUSED : STROKE,
          transition: "border-color 150ms ease",
          borderRadius: 32,
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ alignSelf: "stretch", display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            aria-label="Add"
            style={{ ...circleButton, border: "1px solid #f5f5f5", background: "transparent", color: "#f5f5f5", cursor: "pointer" }}
          >
            <PlusIcon />
          </button>
        </div>

        {/* clipped sideways (long text scrolls inside the field) but not vertically, so a falling character stays
            visible below the line instead of vanishing at its edge */}
        <div ref={trackRef} style={{ position: "relative", alignSelf: "stretch", height: 24, overflowX: "clip", overflowY: "visible" }}>
          {/* the text you see: a mirror of the input's value, plus the characters that are on their way out */}
          <span
            ref={textRef}
            aria-hidden="true"
            style={{ position: "absolute", top: 0, left: 0, whiteSpace: "pre", font: TEXT_FONT, color: TEXT_COLOR, pointerEvents: "none" }}
          >
            {value}
          </span>
          {ghosts.map((g) => (
            <span
              key={g.id}
              aria-hidden="true"
              className="tf-ghost"
              onAnimationEnd={() => dropGhosts([g.id])}
              style={{ left: g.left, font: TEXT_FONT, color: TEXT_COLOR, animationDuration: `${TUMBLE_MS}ms`, "--tf-rotate": `${g.rotate}deg` } as CSSProperties}
            >
              {g.text}
            </span>
          ))}

          {/* the vertical line showing where typing will go */}
          {caret && <span key={caret.id} aria-hidden="true" className="tf-caret" style={{ left: caret.x }} />}

          {/* the real field: all the editing, with its own text and caret hidden (the mirror and caret above draw
              them) so only the selection highlight shows */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onFocus={() => {
              setFocused(true);
              updateCaret();
            }}
            onBlur={() => {
              setFocused(false);
              setCaret(null);
            }}
            onKeyUp={syncScroll}
            onSelect={syncScroll}
            onClick={syncScroll}
            placeholder={placeholder}
            aria-label="Message"
            autoComplete="off"
            className={holdPlaceholder ? "tf-input tf-input--hold" : "tf-input"}
            style={{
              position: "relative",
              display: "block",
              boxSizing: "border-box",
              width: "100%",
              height: 24,
              padding: 0,
              border: 0,
              outline: "none",
              background: "transparent",
              color: "transparent",
              caretColor: "transparent",
              font: TEXT_FONT,
            }}
          />
        </div>

        <button
          type="submit"
          disabled={empty}
          aria-label="Send"
          style={{ ...circleButton, border: 0, background: "#f5f5f5", color: "#1d1b20", opacity: empty ? 0.3 : 1, cursor: empty ? "default" : "pointer" }}
        >
          <ArrowUpIcon />
        </button>

        {/* where a sent message blows away as sand; reaches past the card so grains can drift out of it */}
        <canvas
          ref={sandRef}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -SAND_BLEED - 1,
            left: -SAND_BLEED - 1,
            pointerEvents: "none",
          }}
        />
      </form>
    </div>
  );
};
