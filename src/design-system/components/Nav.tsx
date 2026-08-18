import { useEffect, useRef } from "react";
import { LogoCursorReactive } from "./LogoCursorReactive";

const LinkedInIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.446-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.114 20.452H3.56V9h3.554v11.452z" />
  </svg>
);

export const Nav = ({
  brand = "Clem",
  aboutHref = "/about",
  linkedInHref = "https://www.linkedin.com/in/clément-liu-6606b290/",
}: {
  brand?: string;
  aboutHref?: string;
  linkedInHref?: string;
}) => {
  const navRef = useRef<HTMLElement>(null);

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
      <div className="flex items-center justify-center gap-4 sm:gap-16">
        <a
          href={aboutHref}
          className="font-serif text-lg text-paper transition-colors hover:text-accent sm:text-2xl"
        >
          About
        </a>
        <a href="/" aria-label={brand}>
          <LogoCursorReactive
            className="h-16 w-auto sm:h-[106px]"
            wiggle={7}
            smoothen={1.7}
            octaves={4}
            noiseSpeed={0.9}
            idleSpinSpeed={45}
            hoverSpinSpeed={200}
          />
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
    </nav>
  );
};
