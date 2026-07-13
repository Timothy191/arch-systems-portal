import CookieConsent from "@/components/marketing/CookieConsent";

export default function CookieConsentPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-heading)]">
        Cookie Preferences
      </h1>
      <div className="mt-4 rounded-2xl border border-black/[0.06] bg-white/70 p-6 text-sm leading-relaxed text-[var(--text-heading)]">
        <p className="font-medium text-[var(--accent-red)]">
          This page is a placeholder and requires final legal review before
          production use.
        </p>
        <p className="mt-3">
          This page exists to centralize cookie preference management. Replace
          this content with finalized legal counsel text describing cookie
          categories, retention, and opt-out instructions.
        </p>
        <p className="mt-4 text-[var(--text-muted)]">
          For immediate preference changes, use the cookie banner in the corner
          of the portal.
        </p>
        <CookieConsent />
      </div>
    </div>
  );
}
