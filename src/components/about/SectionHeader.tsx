import type { ReactNode } from "react";
import Reveal from "./Reveal";

export default function SectionHeader({
  eyebrow,
  title,
  children,
  center = false,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
  center?: boolean;
}) {
  return (
    <Reveal className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-brand">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-[40px]">
        {title}
      </h2>
      {children && <div className="mt-4 space-y-4 text-[16px] leading-relaxed text-body">{children}</div>}
    </Reveal>
  );
}
