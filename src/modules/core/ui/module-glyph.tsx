type ModuleGlyphName =
  | "home"
  | "pos"
  | "sales"
  | "inventory"
  | "catalog"
  | "tables"
  | "kds"
  | "delivery";

const glyphs: Record<ModuleGlyphName, JSX.Element> = {
  home: (
    <path
      d="M6 14.5 14 7l8 7.5v8a1 1 0 0 1-1 1h-4.5v-5h-5v5H7a1 1 0 0 1-1-1zM10 4.5h4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  pos: (
    <>
      <rect x="5" y="6" width="18" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M9 10h10M9 14h3M15.5 14H19M9 18h5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </>
  ),
  sales: (
    <>
      <path d="M7 19V9m5 10V5m5 14v-7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="m6 7 4-3 4 2 4-3 2 1.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  inventory: (
    <>
      <path d="M5 9.5 14 5l9 4.5-9 4.5zM5 9.5V18l9 4.5 9-4.5V9.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M14 14v8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </>
  ),
  catalog: (
    <>
      <path d="M7 6.5h10a2 2 0 0 1 2 2v11.5l-4-2-4 2-4-2-4 2V8.5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M10 10.5h8M10 14h5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </>
  ),
  tables: (
    <>
      <rect x="7.5" y="6" width="9" height="6.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M10 12.5v5.5M14 12.5v5.5M6 18h12M5 10H3M21 10h-2" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </>
  ),
  kds: (
    <>
      <rect x="4.5" y="5" width="19" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M9 10h10M9 14h6M10 22h8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </>
  ),
  delivery: (
    <>
      <path d="M5 8.5h10v7H5zM15 11h3l2 2v2.5h-5z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <circle cx="9" cy="18" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="18" cy="18" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.9" />
    </>
  ),
};

export function ModuleGlyph({
  name,
  className = "",
}: {
  name: ModuleGlyphName;
  className?: string;
}) {
  return (
    <span className={`scene-glyph ${className}`.trim()}>
      <svg viewBox="0 0 28 28" aria-hidden="true">
        {glyphs[name]}
      </svg>
    </span>
  );
}
