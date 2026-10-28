// What a merged ticket really holds: one problem per root cause, counted from the reports.
// Builds on causes.ts (parser vs hint, by tenant and form) and adds the reports the desk itself
// read as a one-day move (desk-notes.json). Those are not a month/day flip, so they are not
// `parser` or `hint`, whatever tenant they came from.
import { causeOf, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'shift';

export const PROBLEMS: Record<Problem, { title: string; what: string }> = {
  parser: {
    title: 'Shared parser reads day-first dates month first',
    what: 'A day-first tenant books 7 April; the invite says 4 July. Day and month trade places.',
  },
  hint: {
    title: 'booking-v3 form hints MM/DD/YYYY to day-first tenants',
    what: 'People type what the hint under the date field tells them, month first; the form then reads it day first.',
  },
  shift: {
    title: 'Invites land one day early',
    what: 'Same day and month, one day earlier (Tuesday shows as Monday). Not a flip: a time zone or DST shift.',
  },
};

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem | 'unplaced' {
  if (oneDayMove.includes(r.id)) return 'shift';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem | 'unplaced';
  reports: Report[];
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  tenants: string[];
  firstSeen: string;
  lastSeen: string;
};

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const by = new Map<ProblemGroup['problem'], Report[]>();
  for (const r of reports) {
    const p = problemOf(r, tenantOf(r), oneDayMove);
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  return [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        taggedAs: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {}),
        tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}

// How many reports intake tagged with a tag other than the problem they belong to.
export function mistagged(groups: ProblemGroup[]): number {
  return groups.reduce((n, g) => n + g.reports.filter((r) => r.meta.intakeTag !== g.problem).length, 0);
}
