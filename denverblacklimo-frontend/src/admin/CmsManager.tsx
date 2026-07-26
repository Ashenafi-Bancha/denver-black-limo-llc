import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Building, Image as ImageIcon, Layout, Info, Briefcase, Car, Map, Star,
  Plus, Trash2, Upload, Check, Loader2, ChevronLeft, Pencil, X, ArrowUp, ArrowDown,
} from 'lucide-react'
import { CONTENT_GROUPS, blankFromFields, type ContentGroup, type FieldSpec } from './cmsSchema'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
const FILE_BASE = API_URL.replace(/\/api\/?$/, '')

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  building: Building, image: ImageIcon, layout: Layout, info: Info,
  briefcase: Briefcase, car: Car, map: Map, star: Star,
}

async function uploadImage(file: File, token: string): Promise<string | null> {
  const fd = new FormData()
  fd.append('image', file)
  const res = await fetch(`${API_URL}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
  if (!res.ok) return null
  const { url } = await res.json()
  return url.startsWith('/') ? FILE_BASE + url : url
}

async function saveKey(key: string, value: unknown, token: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ key, value }),
  })
  return res.ok
}

// ─────────────────────────────────────────────
// Field inputs
// ─────────────────────────────────────────────

const inputCls =
  'w-full rounded border border-white/10 bg-brand-black px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-brand-gold'

function ImageInput({ value, onChange, token }: { value: string; onChange: (v: string) => void; token: string }) {
  const [busy, setBusy] = useState(false)
  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    setBusy(true)
    const url = await uploadImage(e.target.files[0], token)
    if (url) onChange(url)
    setBusy(false)
  }
  return (
    <div className="flex items-center gap-3">
      {value ? (
        <img src={value} alt="" className="h-14 w-20 shrink-0 rounded object-cover ring-1 ring-white/10" />
      ) : (
        <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded bg-brand-black text-white/30 ring-1 ring-white/10"><ImageIcon className="h-5 w-5" /></div>
      )}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Image URL or upload →" className={inputCls} />
      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded border border-white/10 px-3 py-2.5 text-xs font-semibold text-brand-gold hover:bg-brand-gold/10" title="Upload from computer">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        <input type="file" accept="image/*" className="hidden" onChange={handle} />
      </label>
    </div>
  )
}

function StringList({ value, onChange, isImage, token }: { value: string[]; onChange: (v: string[]) => void; isImage?: boolean; token: string }) {
  const list = Array.isArray(value) ? value : []
  const upd = (i: number, v: string) => onChange(list.map((x, idx) => (idx === i ? v : x)))
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div className="space-y-2">
      {list.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex-1">
            {isImage ? <ImageInput value={item} onChange={(v) => upd(i, v)} token={token} /> : <input value={item} onChange={(e) => upd(i, e.target.value)} className={inputCls} />}
          </div>
          <button onClick={() => move(i, -1)} className="rounded border border-white/10 p-2 text-white/40 hover:text-white" title="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
          <button onClick={() => move(i, 1)} className="rounded border border-white/10 p-2 text-white/40 hover:text-white" title="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
          <button onClick={() => onChange(list.filter((_, idx) => idx !== i))} className="rounded border border-white/10 p-2 text-white/40 hover:text-red-400" title="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ))}
      <button onClick={() => onChange([...list, ''])} className="flex items-center gap-1.5 rounded border border-brand-gold/40 px-3 py-1.5 text-xs font-semibold text-brand-gold hover:bg-brand-gold/10">
        <Plus className="h-3.5 w-3.5" /> Add {isImage ? 'Image' : 'Item'}
      </button>
    </div>
  )
}

function ObjectList({ spec, value, onChange, token }: { spec: FieldSpec; value: Record<string, unknown>[]; onChange: (v: Record<string, unknown>[]) => void; token: string }) {
  const list = Array.isArray(value) ? value : []
  const fields = spec.itemFields || []
  const titleKey = spec.itemTitleKey || fields[0]?.key
  const [open, setOpen] = useState<number | null>(null)
  const upd = (i: number, item: Record<string, unknown>) => onChange(list.map((x, idx) => (idx === i ? item : x)))
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div className="space-y-2">
      {list.map((item, i) => (
        <div key={i} className="rounded border border-white/10 bg-brand-black/40">
          <div className="flex items-center justify-between px-3 py-2">
            <button onClick={() => setOpen(open === i ? null : i)} className="flex-1 text-left text-sm text-white/90">
              <span className="mr-2 text-white/30">{i + 1}.</span>{String(item[titleKey] || 'Untitled')}
            </button>
            <div className="flex items-center gap-1">
              <button onClick={() => move(i, -1)} className="rounded p-1.5 text-white/40 hover:text-white"><ArrowUp className="h-3.5 w-3.5" /></button>
              <button onClick={() => move(i, 1)} className="rounded p-1.5 text-white/40 hover:text-white"><ArrowDown className="h-3.5 w-3.5" /></button>
              <button onClick={() => setOpen(open === i ? null : i)} className="rounded p-1.5 text-brand-gold/70 hover:text-brand-gold"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => onChange(list.filter((_, idx) => idx !== i))} className="rounded p-1.5 text-white/40 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          {open === i && (
            <div className="border-t border-white/10 p-3">
              <ItemFields fields={fields} value={item} onChange={(v) => upd(i, v)} token={token} />
            </div>
          )}
        </div>
      ))}
      <button onClick={() => { onChange([...list, blankFromFields(fields)]); setOpen(list.length) }} className="flex items-center gap-1.5 rounded border border-brand-gold/40 px-3 py-1.5 text-xs font-semibold text-brand-gold hover:bg-brand-gold/10">
        <Plus className="h-3.5 w-3.5" /> Add {spec.label.replace(/s$/, '')}
      </button>
    </div>
  )
}

function FieldInput({ spec, value, onChange, token }: { spec: FieldSpec; value: unknown; onChange: (v: unknown) => void; token: string }) {
  switch (spec.type) {
    case 'textarea':
      return <textarea rows={3} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={spec.placeholder} className={inputCls} />
    case 'number':
      return <input type="number" value={Number(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} className={inputCls} />
    case 'image':
      return <ImageInput value={String(value ?? '')} onChange={onChange} token={token} />
    case 'stringList':
      return <StringList value={value as string[]} onChange={onChange} token={token} />
    case 'imageList':
      return <StringList value={value as string[]} onChange={onChange} isImage token={token} />
    case 'objectList':
      return <ObjectList spec={spec} value={value as Record<string, unknown>[]} onChange={onChange} token={token} />
    default:
      return <input value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} placeholder={spec.placeholder} className={inputCls} />
  }
}

function ItemFields({ fields, value, onChange, token }: { fields: FieldSpec[]; value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void; token: string }) {
  const set = (k: string, v: unknown) => onChange({ ...value, [k]: v })
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key} className={f.full || f.type === 'objectList' || f.type === 'stringList' || f.type === 'imageList' ? 'sm:col-span-2' : ''}>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-brand-gold/70">{f.label}</label>
          <FieldInput spec={f} value={value[f.key]} onChange={(v) => set(f.key, v)} token={token} />
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// Editors
// ─────────────────────────────────────────────

function Toast({ msg }: { msg: string }) {
  return <span className="flex items-center gap-1.5 text-sm text-green-400"><Check className="h-4 w-4" /> {msg}</span>
}

function SingletonEditor({ group, current, token, onBack, onSaved }: { group: ContentGroup; current: Record<string, unknown> | undefined; token: string; onBack: () => void; onSaved: () => void }) {
  const [value, setValue] = useState<Record<string, unknown>>({ ...(group.default as object), ...(current || {}) })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async () => {
    setSaving(true)
    const ok = await saveKey(group.key, value, token)
    setSaving(false)
    setMsg(ok ? 'Saved!' : 'Save failed')
    if (ok) onSaved()
    setTimeout(() => setMsg(''), 2500)
  }

  return (
    <EditorShell group={group} onBack={onBack} saving={saving} msg={msg} onSave={save}>
      <ItemFields fields={group.fields} value={value} onChange={setValue} token={token} />
    </EditorShell>
  )
}

function CollectionEditor({ group, current, token, onBack, onSaved }: { group: ContentGroup; current: Record<string, unknown>[] | undefined; token: string; onBack: () => void; onSaved: () => void }) {
  const [items, setItems] = useState<Record<string, unknown>[]>(current && current.length ? current : (group.default as Record<string, unknown>[]))
  const [editing, setEditing] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const titleKey = group.itemTitleKey || 'title'
  const imgKey = group.itemImageKey

  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    setItems(next)
  }

  const save = async () => {
    setSaving(true)
    const ok = await saveKey(group.key, items, token)
    setSaving(false)
    setMsg(ok ? 'Saved!' : 'Save failed')
    if (ok) onSaved()
    setTimeout(() => setMsg(''), 2500)
  }

  return (
    <EditorShell group={group} onBack={onBack} saving={saving} msg={msg} onSave={save}>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-white/10 bg-brand-black/40 p-3">
            {imgKey && (
              <img src={String(item[imgKey] || '')} alt="" className="h-12 w-16 shrink-0 rounded object-cover ring-1 ring-white/10" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{String(item[titleKey] || 'Untitled')}</p>
              <p className="truncate text-xs text-white/40">{String(item.shortDescription || item.description || item.quote || item.subtitle || '')}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => move(i, -1)} className="rounded p-2 text-white/40 hover:text-white"><ArrowUp className="h-4 w-4" /></button>
              <button onClick={() => move(i, 1)} className="rounded p-2 text-white/40 hover:text-white"><ArrowDown className="h-4 w-4" /></button>
              <button onClick={() => setEditing(i)} className="flex items-center gap-1 rounded border border-brand-gold/40 px-3 py-1.5 text-xs font-semibold text-brand-gold hover:bg-brand-gold/10"><Pencil className="h-3.5 w-3.5" /> Edit</button>
              <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="rounded p-2 text-white/40 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        <button onClick={() => { const next = [...items, blankFromFields(group.fields)]; setItems(next); setEditing(next.length - 1) }} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-brand-gold/40 py-3 text-sm font-semibold text-brand-gold hover:bg-brand-gold/5">
          <Plus className="h-4 w-4" /> Add New {group.title.replace(/s$/, '')}
        </button>
      </div>

      <AnimatePresence>
        {editing !== null && items[editing] && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={() => setEditing(null)}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="my-8 w-full max-w-2xl rounded-xl border border-white/10 bg-brand-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <h3 className="font-display text-lg text-brand-gold">Edit Item</h3>
                <button onClick={() => setEditing(null)} className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto p-5">
                <ItemFields fields={group.fields} value={items[editing]} onChange={(v) => setItems(items.map((x, idx) => (idx === editing ? v : x)))} token={token} />
              </div>
              <div className="flex justify-end gap-3 border-t border-white/10 p-4">
                <button onClick={() => setEditing(null)} className="rounded px-4 py-2 text-sm text-white/70 hover:bg-white/5">Done</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </EditorShell>
  )
}

function EditorShell({ group, onBack, saving, msg, onSave, children }: { group: ContentGroup; onBack: () => void; saving: boolean; msg: string; onSave: () => void; children: React.ReactNode }) {
  return (
    <div>
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-sm text-white/60 hover:text-brand-gold"><ChevronLeft className="h-4 w-4" /> Back to Content</button>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-brand-gold">{group.title}</h1>
          <p className="mt-1 text-sm text-white/60">{group.description}</p>
        </div>
        <div className="flex items-center gap-4">
          {msg && <Toast msg={msg} />}
          <button onClick={onSave} disabled={saving} className="flex items-center gap-2 rounded bg-gold-gradient px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-brand-black transition hover:scale-[1.02] disabled:opacity-70">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save Changes
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-brand-surface p-5 md:p-6">{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Manager (group grid + routing)
// ─────────────────────────────────────────────

export function CmsManager({ token, settings, refresh }: { token: string; settings: Record<string, unknown>; refresh: () => Promise<void> }) {
  const [active, setActive] = useState<string | null>(null)
  const group = CONTENT_GROUPS.find((g) => g.key === active)

  if (group) {
    const current = settings[group.key]
    const back = () => setActive(null)
    return group.kind === 'singleton' ? (
      <SingletonEditor group={group} current={current as Record<string, unknown> | undefined} token={token} onBack={back} onSaved={refresh} />
    ) : (
      <CollectionEditor group={group} current={current as Record<string, unknown>[] | undefined} token={token} onBack={back} onSaved={refresh} />
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-brand-gold">Content Management</h1>
        <p className="mt-1 text-sm text-white/60">Edit every section of your website — text and images. Changes go live instantly.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CONTENT_GROUPS.map((g) => {
          const Icon = ICONS[g.icon] || Layout
          const count = Array.isArray(settings[g.key]) ? (settings[g.key] as unknown[]).length : null
          return (
            <button key={g.key} onClick={() => setActive(g.key)} className="group flex flex-col rounded-xl border border-white/10 bg-brand-surface p-5 text-left transition hover:border-brand-gold/50 hover:bg-brand-gold/5">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-gold/10 text-brand-gold"><Icon className="h-5 w-5" /></div>
                {g.kind === 'collection' && <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/50">{count ?? (g.default as unknown[]).length} items</span>}
              </div>
              <h3 className="mt-4 font-semibold text-white group-hover:text-brand-gold">{g.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/50">{g.description}</p>
              <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-brand-gold opacity-0 transition group-hover:opacity-100"><Pencil className="h-3 w-3" /> Manage</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
