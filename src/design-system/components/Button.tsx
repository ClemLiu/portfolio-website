import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary: "bg-accent text-paper hover:bg-accent-hover",
  secondary: "border border-ink-950 text-ink-950 hover:bg-ink-100",
  ghost: "text-ink-950 hover:text-accent",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill px-5 py-2.5 font-sans text-sm font-medium transition-colors";

type CommonProps = {
  variant?: Variant;
  children: ReactNode;
};

type ButtonProps = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type LinkProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export const Button = ({ variant = "primary", children, href, ...rest }: ButtonProps | LinkProps) => {
  const className = `${base} ${variantClasses[variant]}`;
  if (href) {
    return (
      <a className={className} href={href} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }
  return (
    <button className={className} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
};
