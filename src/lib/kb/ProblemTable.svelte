<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { uniqueById, type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { groupByProblem, mistagged, PROBLEMS } from '#lib/kb/problems';

  // issues: problem → link to the ticket filed for it.
  let { ticket, issues = {} }: { ticket: number; issues?: Record<string, string> } = $props();

  const rows = $derived(reports as Report[]);
  const merged = $derived(uniqueById(rows).filter((r) => r.mergedInto === ticket));
  const groups = $derived(groupByProblem(merged, tenantOf, notes.oneDayMove));
  const counted = $derived(groups.reduce((n, g) => n + g.reports.length, 0));
  const tags = (t: Record<string, number>) =>
    Object.entries(t)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, n]) => `${tag} ×${n}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{merged.length}</strong> reports merged into #{ticket} ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
  · export rows {rows.length}, {rows.length - merged.length} of them repeats
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>seen</th><th>intake tagged as</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      <tr>
        <td>
          <code>{g.problem}</code>
          {#if g.problem !== 'unplaced'}<br /><span class="what">{PROBLEMS[g.problem].title}</span>{/if}
        </td>
        <td><strong>{g.reports.length}</strong></td>
        <td title={g.tenants.join(', ')}>{g.tenants.length}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td class="tags">{tags(g.taggedAs)}</td>
        <td>{#if issues[g.problem]}<a href={issues[g.problem]}>{issues[g.problem].replace(/^.*\/issues\//, '#')}</a>{:else}none{/if}</td>
      </tr>
    {/each}
  </tbody>
  <tfoot>
    <tr><td>total</td><td><strong>{counted}</strong></td><td colspan="4"></td></tr>
  </tfoot>
</table>

<p class="note">
  {mistagged(groups)} of {merged.length} reports carry an intake tag that is not their problem. Intake guesses from the
  reporter's browser; the problem follows the tenant, its form and what the report says.
</p>

<style>
  .sum { font-size: 1.1rem; }
  .what { color: var(--muted); font-size: 0.85em; }
  .tags { color: var(--muted); font-size: 0.85em; }
  .note { color: var(--muted); font-size: 0.85em; }
  tfoot td { font-weight: 600; }
</style>
