import Image from "next/image";
import { Marquee } from "@repo/ui/Marquee";

interface BrandLogo {
  src?: string;
  name: string;
  width: number;
  height: number;
}

const BRAND_LOGOS: BrandLogo[] = [
  { src: "/logo.svg", name: "Arch", width: 72, height: 20 },
  { src: "/archlinux-logo-black-scalable.svg", name: "Arch Linux", width: 72, height: 20 },
  { name: "Plantcor", width: 80, height: 22 },
  { src: "/branding/ai/openai.svg", name: "OpenAI", width: 20, height: 20 },
  { src: "/branding/ai/anthropic.svg", name: "Anthropic", width: 20, height: 20 },
  { src: "/branding/ai/google.svg", name: "Google", width: 20, height: 20 },
  { src: "/branding/ai/github.svg", name: "GitHub", width: 20, height: 20 },
  { src: "/branding/ai/meta.svg", name: "Meta", width: 22, height: 20 },
  { src: "/branding/ai/vercel.svg", name: "Vercel", width: 20, height: 20 },
  { src: "/branding/ai/eve.svg", name: "Eve AI", width: 20, height: 20 },
];

/**
 * Animated brand / AI-provider logo strip for the login card footer.
 */
export function LoginBrandBanner() {
  const maskStyle = {
    maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
    WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
  };

  return (
    <div className="w-full">
      <p className="mb-2 text-center text-[13px] font-medium tracking-wide text-[var(--text-secondary)] select-none leading-relaxed px-1">
        Plantcor Mainframe · Powered by Arch Systems · Integrated Intelligence
      </p>
      <div
        role="separator"
        aria-hidden="true"
        className="mx-auto mb-2.5 h-px w-full max-w-[280px] bg-border-subtle"
      />
      <div
        className="w-full overflow-hidden py-1 opacity-85 transition-opacity duration-300 hover:opacity-100"
        style={maskStyle}
        role="region"
        aria-label="Partner and AI provider brands"
      >
        <Marquee pauseOnHover className="[--duration:42s] [--gap:0.75rem] p-0">
          {BRAND_LOGOS.flatMap((logo, index) => {
            const key = logo.src ?? logo.name;
            const item = (
              <div
                key={key}
                className="flex h-8 shrink-0 items-center gap-2"
                title={logo.name}
              >
                {logo.src ? (
                  <Image
                    src={logo.src}
                    alt=""
                    width={logo.width}
                    height={logo.height}
                    className="h-5 w-auto max-w-[5rem] object-contain"
                    unoptimized
                  />
                ) : null}
                <span className="whitespace-nowrap text-[13px] font-medium tracking-wide text-[var(--text-secondary)]">
                  {logo.name}
                </span>
              </div>
            );

            if (index === 0) return [item];

            return [
              <span
                key={`sep-${key}`}
                aria-hidden
                className="flex h-8 shrink-0 items-center text-[13px] leading-none text-[var(--text-secondary)] select-none"
              >
                |
              </span>,
              item,
            ];
          })}
        </Marquee>
      </div>
    </div>
  );
}
