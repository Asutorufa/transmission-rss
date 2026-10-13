import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import * as Switch from "@radix-ui/react-switch";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import useSWR from "swr";
import { CloseIcon, DeleteIcon, EditIcon, PlusIcon } from "./icons";

type RSS = {
  disabled: boolean;
  name: string;
  url: string;
  download_dir: string;
  internal?: number;
  regexp?: string[];
  exclude_regexp?: string[];
  download_after?: number;
  expire_time?: number;
  fetch_interval?: number;
  label?: string[];
};

type Status = { running: boolean };
type Editor = { index: number; original: RSS | null; draft: RSS };

const CONFIG_URL = "/api/v1/config";
const STATUS_URL = "/api/v1/status";
const emptyRSS = (): RSS => ({ disabled: true, name: "", url: "", download_dir: "" });

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.text()) || "HTTP " + res.status);
  return res.json() as Promise<T>;
}

async function sendJSON(method: "PUT" | "PATCH" | "DELETE", payload: unknown) {
  const res = await fetch(CONFIG_URL, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.text()) || "HTTP " + res.status);
}

function parentDir(path: string): string {
  const normalized = path.replace(/[\\/]+$/, "");
  const last = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
  return last < 0 ? "." : normalized.slice(0, last) || normalized[0];
}

function suggestions(configs: RSS[]): string[] {
  return [...new Set(configs.map(({ download_dir }) => {
    const path = /(?:^|[\\/])Season [^\\/]+$/i.test(download_dir)
      ? parentDir(download_dir)
      : download_dir;
    return parentDir(path);
  }).filter((path) => path !== "."))];
}

function toLocalInput(seconds?: number): string {
  if (!seconds) return "";
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string): number | undefined {
  if (!value) return undefined;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? undefined : Math.floor(timestamp / 1000);
}

function IconButton({ label, onClick, children, danger = false }: {
  label: string; onClick?: () => void; children: ReactNode; danger?: boolean;
}) {
  return (
    <Tooltip.Root delayDuration={250}>
      <Tooltip.Trigger asChild>
        <button type="button" className={"icon-button" + (danger ? " danger" : "")} aria-label={label} onClick={onClick}>{children}</button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="tooltip" sideOffset={5}>{label}<Tooltip.Arrow className="tooltip-arrow" /></Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function ArrayEditor({ title, values, onChange, placeholder }: {
  title: string; values?: string[]; onChange: (values: string[]) => void; placeholder: string;
}) {
  const [value, setValue] = useState("");
  const items = values ?? [];
  const add = () => {
    const item = value.trim();
    if (!item) return;
    onChange([...items, item]);
    setValue("");
  };
  return (
    <fieldset className="array-editor">
      <legend>{title}</legend>
      {items.length === 0 && <div className="array-empty">No entries added</div>}
      {items.map((item, index) => (
        <div className="array-row" key={index}>
          <input aria-label={title + " " + (index + 1)} value={item}
            onChange={(event) => onChange(items.map((old, i) => i === index ? event.target.value : old))} />
          <button type="button" className="icon-button danger" aria-label={"Remove " + title + " " + (index + 1)}
            onClick={() => onChange(items.filter((_, i) => i !== index))}><DeleteIcon /></button>
        </div>
      ))}
      <div className="array-row">
        <input aria-label={"Add " + title} placeholder={placeholder} value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} />
        <button type="button" className="icon-button add" aria-label={"Add " + title} onClick={add}><PlusIcon /></button>
      </div>
    </fieldset>
  );
}

function EditDialog({ editor, setEditor, directories, saving, onSave, onClose, message }: {
  editor: Editor; setEditor: (e: Editor) => void; directories: string[];
  saving: boolean; onSave: () => void; onClose: () => void; message: string | null;
}) {
  const datalistId = useId();
  const rss = editor.draft;
  const update = (changes: Partial<RSS>) => setEditor({ ...editor, draft: { ...rss, ...changes } });
  const valid = !!rss.name.trim() && !!rss.url.trim() && !!rss.download_dir.trim();

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content" aria-describedby={undefined}>
          <div className="dialog-heading">
            <div>
              <Dialog.Title>{editor.original ? "Edit RSS feed" : "Add RSS feed"}</Dialog.Title>
              <p>Configure the feed, matching rules and download destination.</p>
            </div>
            <Dialog.Close asChild><button type="button" className="icon-button" disabled={saving} aria-label="Close"><CloseIcon /></button></Dialog.Close>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); if (valid && !saving) onSave(); }}>
            <div className="form-scroll">
              {message && <div className="notice error" role="alert">{message}</div>}
              <label className="switch-row">
                <span>Enabled <small>Allow this feed to be processed</small></span>
                <Switch.Root checked={!rss.disabled} onCheckedChange={(enabled) => update({ disabled: !enabled })} className="switch-root">
                  <Switch.Thumb className="switch-thumb" />
                </Switch.Root>
              </label>
              <div className="form-grid">
                <label className="field"><span>Name <b>*</b></span><input value={rss.name} required disabled={!!editor.original} onChange={(event) => update({ name: event.target.value })} /></label>
                <label className="field"><span>Feed URL <b>*</b></span><input type="url" required value={rss.url} placeholder="https://example.com/rss" onChange={(event) => update({ url: event.target.value })} /></label>
                <label className="field"><span>Download directory <b>*</b></span>
                  <input required list={datalistId} value={rss.download_dir} placeholder="/downloads/shows" onChange={(event) => update({ download_dir: event.target.value })} />
                  <datalist id={datalistId}>{directories.map((directory) => <option key={directory} value={directory} />)}</datalist>
                </label>
                <label className="field"><span>Fetch interval (ms)</span><input type="number" min="0" step="1"
                  value={rss.fetch_interval ?? ""} placeholder="Default" onChange={(event) => update({ fetch_interval: event.target.value === "" ? undefined : Number(event.target.value) })} /></label>
                <label className="field"><span>Download after</span><input type="datetime-local" value={toLocalInput(rss.download_after)}
                  onChange={(event) => update({ download_after: fromLocalInput(event.target.value) })} /></label>
                <label className="field"><span>Expire at</span><input type="datetime-local" value={toLocalInput(rss.expire_time)}
                  onChange={(event) => update({ expire_time: fromLocalInput(event.target.value) })} /></label>
              </div>
              <ArrayEditor title="Include regular expressions" placeholder="Add matching pattern" values={rss.regexp}
                onChange={(regexp) => update({ regexp })} />
              <ArrayEditor title="Exclude regular expressions" placeholder="Add exclusion pattern" values={rss.exclude_regexp}
                onChange={(exclude_regexp) => update({ exclude_regexp })} />
              <ArrayEditor title="Transmission labels" placeholder="Add label" values={rss.label}
                onChange={(label) => update({ label })} />
            </div>
            <div className="dialog-actions">
              <button type="button" className="button outline" onClick={onClose} disabled={saving}>Cancel</button>
              <button className="button primary" type="submit" disabled={!valid || saving}>{saving ? "Saving…" : "Save feed"}</button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DeleteButton({ rss, busy, onDelete }: { rss: RSS; busy: boolean; onDelete: () => void }) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild><button className="icon-button danger" type="button" aria-label={"Delete " + rss.name} disabled={busy}><DeleteIcon /></button></AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="dialog-overlay" />
        <AlertDialog.Content className="confirm-content">
          <AlertDialog.Title>Delete RSS feed?</AlertDialog.Title>
          <AlertDialog.Description>The feed <strong>{rss.name}</strong> will be removed from your configuration. This cannot be undone.</AlertDialog.Description>
          <div className="dialog-actions">
            <AlertDialog.Cancel asChild><button className="button outline" type="button">Cancel</button></AlertDialog.Cancel>
            <AlertDialog.Action asChild><button className="button destructive" type="button" onClick={onDelete}>Delete feed</button></AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function Dashboard() {
  const { data, error, mutate } = useSWR<RSS[]>(CONFIG_URL, getJSON, { revalidateOnFocus: true });
  const { data: status, mutate: mutateStatus } = useSWR<Status>(STATUS_URL, getJSON, { refreshInterval: 5000 });
  const feeds = Array.isArray(data) ? data : [];
  const directories = useMemo(() => suggestions(feeds), [data]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);

  const openNew = () => { setMessage(null); setEditor({ index: -1, original: null, draft: emptyRSS() }); };
  const openEdit = (index: number, rss: RSS) => {
    setMessage(null);
    setEditor({ index, original: structuredClone(rss), draft: structuredClone(rss) });
  };

  const save = async () => {
    if (!editor || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      if (editor.original) {
        await sendJSON("PATCH", { index: editor.index, config: editor.draft, original: editor.original });
      } else {
        await sendJSON("PUT", editor.draft);
      }
      await mutate();
      setEditor(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (index: number, rss: RSS) => {
    setBusy(true);
    setMessage(null);
    try {
      await sendJSON("DELETE", { index, config: rss });
      await mutate();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const triggerJob = async () => {
    setTriggering(true);
    setMessage(null);
    try {
      const res = await fetch("/start_job");
      if (!res.ok) throw new Error(await res.text() || "HTTP " + res.status);
      await mutateStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setTriggering(false);
    }
  };

  return (
    <Tooltip.Provider>
      <div className="app">
        <header className="app-header">
          <div className="brand"><span className="brand-mark">↗</span><span>Transmission <strong>RSS</strong></span></div>
          <span className="header-caption">Feed management</span>
        </header>
        <main className="container">
          <div className="hero">
            <div><p className="eyebrow">OVERVIEW</p><h1>RSS Feeds</h1><p className="subtitle">Manage subscriptions and automate downloads.</p></div>
            <div className="hero-actions">
              <span className={"status" + (status?.running ? " active" : "")}><span className="status-dot" />{status?.running ? "Running" : "Waiting"}</span>
              <button type="button" className="button outline" onClick={triggerJob} disabled={triggering || status?.running}>
                {triggering ? "Starting…" : "Start job"}
              </button>
              <button type="button" className="button primary" onClick={openNew}><PlusIcon /> Add feed</button>
            </div>
          </div>
          {message && <div className="notice error" role="alert"><span>{message}</span><button aria-label="Dismiss" onClick={() => setMessage(null)}><CloseIcon /></button></div>}
          {error && <div className="notice error" role="alert">Failed to load feeds: {String(error)}</div>}
          <section className="panel">
            <div className="panel-heading"><h2>Subscriptions</h2><span>{feeds.length} feeds</span></div>
            {!data && !error ? <div className="empty-state">Loading feeds…</div> :
              feeds.length === 0 ? <div className="empty-state"><h3>No feeds yet</h3><p>Add an RSS feed to get started.</p><button className="button primary" onClick={openNew}><PlusIcon /> Add feed</button></div> :
              <div className="table-wrap"><table>
                <thead><tr><th className="narrow">#</th><th>Name</th><th>Status</th><th>Download directory</th><th className="actions-col">Actions</th></tr></thead>
                <tbody>{feeds.map((rss, index) => (
                  <tr key={index}><td className="muted">{index + 1}</td><td><strong>{rss.name}</strong><span className="feed-url" title={rss.url}>{rss.url}</span></td>
                    <td><span className={"pill" + (rss.disabled ? " disabled" : " enabled")}><span className="pill-dot" />{rss.disabled ? "Disabled" : "Enabled"}</span></td>
                    <td className="download-path" title={rss.download_dir}>{rss.download_dir}</td>
                    <td><div className="row-actions"><IconButton label={"Edit " + rss.name} onClick={() => openEdit(index, rss)}><EditIcon /></IconButton><DeleteButton rss={rss} busy={busy} onDelete={() => void remove(index, rss)} /></div></td>
                  </tr>
                ))}</tbody>
              </table></div>}
          </section>
        </main>
      </div>
      {editor && <EditDialog editor={editor} setEditor={setEditor} directories={directories} saving={busy}
        onSave={() => void save()} message={message} onClose={() => { if (!busy) setEditor(null); }} />}
    </Tooltip.Provider>
  );
}
