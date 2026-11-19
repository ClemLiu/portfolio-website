import { useEffect, useRef, useState } from "react";
import { LogoCursorReactive } from "./LogoCursorReactive";

const LinkedInIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.446-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.114 20.452H3.56V9h3.554v11.452z" />
  </svg>
);

const linkClass = "font-serif text-base text-paper transition-colors hover:text-accent md:text-2xl";

export const Nav = ({
  brand = "Clem",
  portfolioHref = "/",
  prototypeHref = "/prototype",
  aboutHref = "/about",
  linkedInHref = "https://www.linkedin.com/in/clément-liu-6606b290/",
}: {
  brand?: string;
  portfolioHref?: string;
  prototypeHref?: string;
  aboutHref?: string;
  linkedInHref?: string;
}) => {
  const navRef = useRef<HTMLElement>(null);
  // Nav is persisted across client-side navigations, so the current page
  // can't come from props — track it from the location instead. Starts null
  // (nothing underlined) so server and first client render match.
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setPath(window.location.pathname.replace(/\/$/, "") || "/");
    update();
    document.addEventListener("astro:page-load", update);
    return () => document.removeEventListener("astro:page-load", update);
  }, []);

  // case studies live under /work/, which belongs to Portfolio
  const isPortfolio = path === "/" || (path?.startsWith("/work/") ?? false);
  const linkClassFor = (active: boolean) =>
    active ? `${linkClass} underline decoration-2 underline-offset-4` : linkClass;

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    // Nav is transition:persist'd — this component only ever mounts once
    // per session (the same DOM node/instance carries across page
    // navigations, which is the whole point: it keeps the logo's idle
    // animation running continuously instead of restarting on every page
    // load). Once the entrance animation has played, strip the class
    // permanently so nothing can replay it later: Astro's client router
    // briefly clears the <html> "seen" gating class during every swap,
    // and relying on that gate alone made the blur-fade-in animation
    // (which starts from opacity: 0) flash on every navigation.
    if (sessionStorage.getItem("clem-entrance-seen")) {
      el.classList.remove("blur-fade-in");
      return;
    }
    const handleEnd = () => el.classList.remove("blur-fade-in");
    el.addEventListener("animationend", handleEnd, { once: true });
    return () => el.removeEventListener("animationend", handleEnd);
  }, []);

  return (
    <nav ref={navRef} className="blur-fade-in relative bg-paper-dark py-6 font-sans">
      {/* Below md the logo sits on its own row with the links underneath
          (three text links plus the logo are wider than a phone); from md
          up it's a single row: logo on the left, links + LinkedIn on the right. */}
      <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
        <a href="/" aria-label={brand} className="shrink-0">
          <LogoCursorReactive
            className="h-16 w-auto md:h-[106px]"
            wiggle={7}
            smoothen={1.7}
            octaves={4}
            noiseSpeed={0.9}
            idleSpinSpeed={45}
            hoverSpinSpeed={200}
          />
        </a>
        <div className="flex items-center gap-5 md:gap-8">
          <a href={portfolioHref} className={linkClassFor(isPortfolio)} aria-current={isPortfolio ? "page" : undefined}>
            Portfolio
          </a>
          <a href={prototypeHref} className={linkClassFor(path === prototypeHref)} aria-current={path === prototypeHref ? "page" : undefined}>
            Prototype
          </a>
          <a href={aboutHref} className={linkClassFor(path === aboutHref)} aria-current={path === aboutHref ? "page" : undefined}>
            About
          </a>
          <a
            href={linkedInHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="text-paper transition-colors hover:text-accent"
          >
            <LinkedInIcon />
          </a>
        </div>
      </div>
    </nav>
  );
};
