import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "./icons";
import { MomentumLegend } from "./Momentum";
import { FiltersPanel, PerPageSelect, ScoringPanel } from "./Panels";
import { PlayerTable } from "./PlayerTable";
import { COLUMNS, NO_FILTERS, filterRows, fromQuery, sortRows, toQuery, toRows, type Filters, type Settings, type SortKey } from "./model";
import { rescore, type PlayersData } from "./rescore.js";

// The Buy Low / Sell High tool. players.json holds base values only; rescore.js turns them into the table for
// whatever point values the visitor sets. Settings, filters, sort and columns live in the page URL, so a
// bookmark or a copied link brings them back.

const DATA_URL = "/data/players.json";
const PER_PAGE = [25, 50, 100];

type PanelId = "scoring" | "filters";

// first page, the pages around the current one, last page: 1 … 4 5 6 … 12
const pageList = (current: number, total: number): (number | "…")[] => {
  const start = Math.min(Math.max(current - 1, 1), Math.max(total - 2, 1));
  const keep = [...new Set([1, start, start + 1, start + 2, total])].filter((p) => p <= total).sort((a, b) => a - b);
  return keep.flatMap((p, i) => (i > 0 && p - keep[i - 1] > 1 ? ["…" as const, p] : [p]));
};

export const BuyLowTool = () => {
  const [settings, setSettings] = useState<Settings>(() => fromQuery(window.location.search));
  const [panel, setPanel] = useState<PanelId | null>(() => (window.matchMedia("(min-width: 900px)").matches ? "filters" : null));
  const [data, setData] = useState<PlayersData | null>(null);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE[0]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const { weights, filters, sort, columns, density } = settings;

  const load = useCallback(() => {
    setFailed(false);
    // "no-cache" re-checks with the server, so a daily data update shows up right away
    fetch(DATA_URL, { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((next: PlayersData) => {
        setData(next);
        // a link can ask for a games window the data doesn't offer yet (early season): show the season instead
        setSettings((s) =>
          s.filters.games && !next.windows?.includes(s.filters.games) ? { ...s, filters: { ...s.filters, games: null } } : s,
        );
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const query = toQuery(settings);
  useEffect(() => {
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    // history.state belongs to Astro's client router, so it's passed back untouched
    window.history.replaceState(window.history.state, "", url);
  }, [query]);

  // re-score shortly after the last change to FP Settings or Games, not on every keystroke
  const { games } = filters;
  const [scoredWith, setScoredWith] = useState({ weights, games });
  useEffect(() => {
    const timer = window.setTimeout(() => setScoredWith({ weights, games }), 250);
    return () => window.clearTimeout(timer);
  }, [weights, games]);
  const updating = data !== null && (scoredWith.weights !== weights || scoredWith.games !== games);

  const rows = useMemo(() => {
    if (!data) return [];
    // rescore.js throws on a window the data doesn't have
    const offered = scoredWith.games && data.windows?.includes(scoredWith.games) ? scoredWith.games : null;
    const result = rescore(data, scoredWith.weights, { all: true, games: offered });
    return toRows(result.rows, result.players!);
  }, [data, scoredWith]);
  const teams = useMemo(() => (data ? [...new Set(data.players.map((p) => p.team))].sort() : []), [data]);
  const shown = useMemo(() => sortRows(filterRows(rows, filters), sort), [rows, filters, sort]);

  const pages = Math.max(1, Math.ceil(shown.length / perPage));
  const current = Math.min(page, pages);
  const first = (current - 1) * perPage;
  const visible = shown.slice(first, first + perPage);

  const update = (next: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...next }));
    // a new filter, sort or scoring changes what's on each page
    if (next.filters || next.sort || next.weights) setPage(1);
  };
  const setFilters = (next: Filters) => update({ filters: next });
  const onSort = (key: SortKey) => {
    // first click: names A–Z, buys first for "vs exp", biggest first for everything else
    const start = key === "name" || key === "vsExp" ? "asc" : "desc";
    update({ sort: { key, dir: sort.key === key ? (sort.dir === "asc" ? "desc" : "asc") : start } });
  };

  const copyLink = async () => {
    let message = "Link copied. Bookmark it to keep your FP settings and filters.";
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      message = "Couldn't copy. Bookmark this page, or copy the address bar.";
    }
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  };

  const chips = [
    filters.games !== null && { label: `Games: L${filters.games}`, clear: { games: null } },
    filters.q && { label: `Search: ${filters.q}`, clear: { q: "" } },
    filters.pos.length > 0 && { label: `Pos: ${filters.pos.join(", ")}`, clear: { pos: [] as string[] } },
    filters.teams.length > 0 && {
      label: filters.teams.length <= 3 ? `Teams: ${filters.teams.join(", ")}` : `Teams: ${filters.teams.length}`,
      clear: { teams: [] as string[] },
    },
    filters.momentum.length > 0 && {
      label: filters.momentum.length <= 3 ? `Momentum: ${filters.momentum.join(", ")}` : `Momentum: ${filters.momentum.length}`,
      clear: { momentum: [] as string[] },
    },
  ].filter((c) => !!c);

  const toggle = (id: PanelId, label: string, icon: IconName) => (
    <button type="button" className="bl-button" aria-expanded={panel === id} onClick={() => setPanel((p) => (p === id ? null : id))}>
      <Icon name={icon} />
      {label}
    </button>
  );

  if (failed) {
    return (
      <div className="bl bl-tokens">
        <div className="bl-empty">
          <strong>Couldn't load the player data</strong>
          <p>Check your connection and try again.</p>
          <button type="button" className="bl-button bl-button--small" onClick={load}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bl bl-tokens">
      <MomentumLegend />

      <div className="bl-toolbar">
        <div className="bl-actions">
          {toggle("scoring", "FP Settings", "tune")}
          {toggle("filters", "Filters", "filter")}
          <button type="button" className="bl-button" onClick={copyLink}>
            <Icon name="link" />
            Copy link
          </button>
        </div>
        {chips.length > 0 && (
          <>
            <span className="bl-separator" />
            <span className="bl-toolbar-label">Filters</span>
            <div className="bl-filter-chips">
              {chips.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  className="bl-filter-chip"
                  aria-label={`Remove filter ${c.label}`}
                  onClick={() => setFilters({ ...filters, ...c.clear })}
                >
                  {c.label}
                  <Icon name="close" size={12} />
                </button>
              ))}
            </div>
            <button type="button" className="bl-button bl-button--ghost bl-clear" onClick={() => setFilters(NO_FILTERS)}>
              Clear all
            </button>
          </>
        )}
      </div>

      <div className="bl-content">
        {panel === "filters" && <FiltersPanel filters={filters} teams={teams} windows={data ? (data.windows ?? []) : undefined} columns={columns} density={density} onChange={update} />}
        {panel === "scoring" && <ScoringPanel weights={weights} onChange={(w) => update({ weights: w })} />}

        <PlayerTable
          rows={visible}
          columns={COLUMNS.filter((c) => columns.includes(c.id))}
          sort={sort}
          density={density}
          role={data?.model.role ?? { toi: 1.5, ppToi: 0.75 }}
          loading={!data}
          updating={updating}
          onSort={onSort}
          empty={
            <div className="bl-empty">
              <Icon name="search" size={20} />
              <strong>No players match these filters</strong>
              <p>Try removing a filter or picking a different Games range.</p>
              <button type="button" className="bl-button bl-button--small" onClick={() => setFilters(NO_FILTERS)}>
                Clear filters
              </button>
            </div>
          }
          footer={
            <div className="bl-footer">
              <span className="bl-summary" aria-live="polite">
                {!data
                  ? "Loading players…"
                  : updating
                    ? "Updating…"
                    : shown.length === 0
                      ? `Showing 0 of ${rows.length} players`
                      : `Showing ${first + 1}–${first + visible.length} of ${shown.length} players`}
              </span>
              <PerPageSelect
                options={PER_PAGE}
                value={perPage}
                onChange={(n) => {
                  setPerPage(n);
                  setPage(1);
                }}
              />
              <nav className="bl-pagination" aria-label="Table pages">
                <button type="button" aria-label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}>
                  <Icon name="chevron-left" />
                </button>
                {pageList(current, pages).map((p, i) =>
                  p === "…" ? (
                    <span key={`gap-${i}`}>…</span>
                  ) : (
                    <button key={p} type="button" aria-current={p === current ? "page" : undefined} onClick={() => setPage(p)}>
                      {p}
                    </button>
                  ),
                )}
                <button type="button" aria-label="Next page" disabled={current === pages} onClick={() => setPage(current + 1)}>
                  <Icon name="chevron-right" />
                </button>
              </nav>
            </div>
          }
        />
      </div>

      {toast &&
        createPortal(
          <div className="bl-tokens bl-toast" role="status">
            <Icon name="check-circle" />
            {toast}
          </div>,
          document.body,
        )}
    </div>
  );
};
