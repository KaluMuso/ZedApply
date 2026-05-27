"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { plainTextToMarkdown } from "@/lib/markdownNormalizer";
import { cn } from "@/lib/utils";

const MAIN_SUBTITLE_HEADINGS = new Set([
  "requirements",
  "location",
  "method of application",
  "how to apply",
  "qualifications",
  "key responsibilities",
  "job purpose",
  "duties",
  "responsibilities",
  "experience",
  "education",
  "competencies",
  "preferred qualifications",
  "secondary job functions",
  "compensation structure",
  "about the role",
  "about the company",
  "job summary",
  "essential functions",
  "minimum qualifications",
]);

export type JobDescriptionSections = {
  section_responsibilities?: string | null;
  section_requirements?: string | null;
  section_benefits?: string | null;
  section_how_to_apply?: string | null;
  section_about?: string | null;
};

function headingText(children: React.ReactNode): string {
  if (typeof children === "string") return children.trim();
  if (Array.isArray(children)) {
    return children
      .map((c) => (typeof c === "string" ? c : ""))
      .join("")
      .trim();
  }
  return "";
}

function isMainSubtitle(text: string): boolean {
  const key = text.replace(/:$/, "").trim().toLowerCase();
  return MAIN_SUBTITLE_HEADINGS.has(key);
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  const text = headingText(children);
  const main = isMainSubtitle(text);
  return (
    <h3
      className={cn(
        "job-description-heading font-bold tracking-widest uppercase text-muted-foreground",
        main ? "text-xs mt-8 mb-3 first:mt-0" : "text-[11px] mt-6 mb-2 opacity-90",
      )}
    >
      {children}
    </h3>
  );
}

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <SectionHeading>{children}</SectionHeading>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <SectionHeading>{children}</SectionHeading>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <SectionHeading>{children}</SectionHeading>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      className="underline text-primary dark:text-primary"
    >
      {children}
    </a>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-2 leading-relaxed whitespace-pre-line">{children}</p>
  ),
  hr: () => <hr className="my-6 border-0 border-t border-[var(--line)]" />,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-4 border-l-[3px] border-[var(--green-500)] bg-[var(--bg-2)] py-3 px-4 rounded-r-lg text-[var(--ink-2)]">
      {children}
    </blockquote>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <SectionHeading>{children}</SectionHeading>
  ),
};

function MarkdownBlock({ md }: { md: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {md}
    </ReactMarkdown>
  );
}

function StructuredSectionCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <section
      className="rounded-xl border p-4 mb-4"
      style={{ borderColor: "var(--line)", background: "var(--bg-2)" }}
    >
      <h3 className="job-description-heading text-xs font-bold tracking-widest uppercase text-muted-foreground mb-3">
        {title}
      </h3>
      <MarkdownBlock md={body} />
    </section>
  );
}

function hasStructuredSections(sections: JobDescriptionSections): boolean {
  return Boolean(
    sections.section_responsibilities?.trim() ||
      sections.section_requirements?.trim() ||
      sections.section_benefits?.trim() ||
      sections.section_how_to_apply?.trim() ||
      sections.section_about?.trim(),
  );
}

export function JobDescription({
  description,
  descriptionMarkdown,
  sections,
}: {
  description: string | null | undefined;
  descriptionMarkdown?: string | null;
  sections?: JobDescriptionSections;
}) {
  const structured = sections ?? {};
  if (hasStructuredSections(structured)) {
    const cards: { title: string; body: string }[] = [];
    if (structured.section_responsibilities?.trim()) {
      cards.push({
        title: "Responsibilities",
        body: structured.section_responsibilities.trim(),
      });
    }
    if (structured.section_requirements?.trim()) {
      cards.push({
        title: "Requirements",
        body: structured.section_requirements.trim(),
      });
    }
    if (structured.section_benefits?.trim()) {
      cards.push({
        title: "Benefits",
        body: structured.section_benefits.trim(),
      });
    }
    if (structured.section_how_to_apply?.trim()) {
      cards.push({
        title: "How to apply",
        body: structured.section_how_to_apply.trim(),
      });
    }
    if (structured.section_about?.trim()) {
      cards.push({ title: "About", body: structured.section_about.trim() });
    }
    return (
      <div className="job-description-markdown prose prose-sm max-w-none text-sm text-foreground/90 dark:text-foreground/90 dark:prose-invert">
        {cards.map((card) => (
          <StructuredSectionCard key={card.title} title={card.title} body={card.body} />
        ))}
      </div>
    );
  }

  const md =
    (descriptionMarkdown && descriptionMarkdown.trim()) ||
    plainTextToMarkdown(description || "");

  if (!md) {
    return (
      <p className="text-sm text-muted-foreground dark:text-muted-foreground">
        No description provided.
      </p>
    );
  }

  return (
    <div className="job-description-markdown prose prose-sm max-w-none text-sm text-foreground/90 dark:text-foreground/90 dark:prose-invert">
      <MarkdownBlock md={md} />
    </div>
  );
}
