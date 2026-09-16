import { CHMSU_BRAND } from "@/config/brand";

export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return <span className="flex items-center gap-2.5"><img src={CHMSU_BRAND.logoPath} alt="CHMSU seal" className={compact ? "size-8 object-contain" : "size-10 object-contain"} /><span className="min-w-0"><strong className="block truncate text-sm font-bold tracking-tight">{compact ? CHMSU_BRAND.shortName : CHMSU_BRAND.name}</strong><span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#087f5b]">{CHMSU_BRAND.tagline}</span></span></span>;
}
