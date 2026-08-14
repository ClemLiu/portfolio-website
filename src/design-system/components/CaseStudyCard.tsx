import { Tag } from "./Tag";

export type CaseStudyCardProps = {
  title: string;
  description: string;
  tags: string[];
  meta?: string;
  href?: string;
  thumbnailClassName?: string;
};

export const CaseStudyCard = ({
  title,
  description,
  tags,
  meta,
  href = "#",
  thumbnailClassName = "bg-accent-subtle",
}: CaseStudyCardProps) => (
  <a href={href} className="group block">
    <div className={`aspect-[4/3] w-full rounded-xl ${thumbnailClassName} transition-transform group-hover:-translate-y-1`} />
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
        {meta && <span className="font-mono text-xs uppercase tracking-wide text-ink-300">{meta}</span>}
      </div>
      <h3 className="font-serif text-2xl text-paper group-hover:text-accent">{title}</h3>
      <p className="font-sans text-sm text-ink-300">{description}</p>
    </div>
  </a>
);
