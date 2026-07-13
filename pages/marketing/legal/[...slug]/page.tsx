import type { Metadata } from "next";

const PLACEHOLDER_NOTICE =
  "This document is a placeholder and requires final legal review before production use.";

const POLICIES: Record<string, { title: string; description: string }> = {
  "privacy-policy": {
    title: "Privacy Policy",
    description:
      "This Privacy Policy placeholder describes how Arch-Systems may collect, use, and safeguard personal information across industrial operations portal deployments. Replace this section with finalized legal counsel before going live.",
  },
  "terms-of-service": {
    title: "Terms of Service",
    description:
      "These Terms of Service placeholder govern access to and use of the Arch-Systems Industrial Operations Portal. This text does not constitute legal advice and must be reviewed by qualified counsel.",
  },
  "cookie-policy": {
    title: "Cookie Policy",
    description:
      "This Cookie Policy placeholder explains what cookies and similar tracking technologies are used on this portal. Replace with finalized policy text from legal counsel.",
  },
};

function resolvePolicy(slug: string[]) {
  const key = slug.join("/").toLowerCase();
  return (
    POLICIES[key] ?? {
      title: slug.join(" / "),
      description: PLACEHOLDER_NOTICE,
    }
  );
}

export function generateMetadata({
  params,
}: {
  params: { slug?: string[] };
}): Metadata {
  const policy = resolvePolicy(params.slug ?? []);
  return {
    title: `${policy.title} — Arch-Systems`,
    description: policy.description,
  };
}

export default function LegalPage({ params }: { params: { slug?: string[] } }) {
  const policy = resolvePolicy(params.slug ?? []);
  const breadcrumb = params.slug?.length
    ? ["Legal", ...params.slug].join(" › ")
    : "Legal";

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 text-xs text-[var(--text-muted)]"
      >
        {breadcrumb}
      </nav>
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-heading)]">
        {policy.title}
      </h1>
      <div className="mt-4 rounded-2xl border border-black/[0.06] bg-white/70 p-6 text-sm leading-relaxed text-[var(--text-heading)]">
        <p className="font-medium text-[var(--accent-red)]">
          {PLACEHOLDER_NOTICE}
        </p>
        <p className="mt-3">{policy.description}</p>
        <p className="mt-4 text-[var(--text-muted)]">
          Route:{" "}
          <code className="font-mono">
            /legal/{params.slug?.join("/") ?? ""}
          </code>
        </p>
      </div>
    </div>
  );
}
