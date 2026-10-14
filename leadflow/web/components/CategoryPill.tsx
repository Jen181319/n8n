import type { Category } from '@/lib/types';

export default function CategoryPill({ cat }: { cat?: Category }) {
  return cat ? <span className="pill" style={{ background: cat.color }}>{cat.name}</span> : <span className="muted">—</span>;
}
