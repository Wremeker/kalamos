import { useEffect, useState } from 'react';
import { AlertDialog, Button, Spinner } from '@heroui/react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Home,
  MoreHorizontal,
  Plus,
  Trash2,
  Zap,
} from 'lucide-react';
import { documentsApi, type DocumentSummary } from '../api';
import { DocumentEditor } from './DocumentEditor';

function formatUpdated(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function Workspace({
  docId,
  onOpen,
  onBack,
}: {
  docId: string | null;
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DocumentSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = () => {
    setLoading(true);
    documentsApi
      .list()
      .then((list) => {
        setDocs(list);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const create = async () => {
    setCreating(true);
    try {
      const doc = await documentsApi.create('Untitled');
      onOpen(doc.id);
    } finally {
      setCreating(false);
    }
  };

  // Open the confirmation popup; actual deletion happens in confirmDelete.
  const requestDelete = (doc: DocumentSummary) => setPendingDelete(doc);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setDeleting(true);
    try {
      await documentsApi.remove(id);
      if (id === docId) onBack();
      setPendingDelete(null);
      refresh();
    } finally {
      setDeleting(false);
    }
  };

  const activeDoc = docs.find((d) => d.id === docId) ?? null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans text-foreground">
      {/* ─────────────── Sidebar (animated collapse) ─────────────── */}
      <aside
        className={`shrink-0 overflow-hidden border-border bg-background-secondary transition-[width] duration-300 ease-in-out ${
          collapsed ? 'w-0 border-r-0' : 'w-64 border-r'
        }`}
      >
        <div className="flex h-full w-64 flex-col">
          {/* workspace switcher */}
          <button
            type="button"
            className="mx-2 mt-4 flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-hover"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-400 text-black">
              <Zap className="size-4 fill-current" />
            </span>
            <span className="flex-1 text-base font-semibold">Kalamos</span>
            <ChevronDown className="size-4 text-muted" />
          </button>

          {/* navigation */}
          <nav className="mt-3 flex-1 space-y-px overflow-y-auto px-2 pb-2">
            <SidebarItem icon={<Home className="size-4" />} label="Home" onClick={onBack} />

            <p className="mt-4 mb-1 px-2 text-xs font-semibold tracking-wide text-muted uppercase">
              Documents
            </p>
            {docs.map((doc) => (
              <div key={doc.id} className="group/doc relative">
                <button
                  type="button"
                  onClick={() => onOpen(doc.id)}
                  className={`flex w-full items-center gap-2 rounded-md py-1.5 pr-9 pl-2 text-left text-sm transition-colors ${
                    doc.id === docId
                      ? 'bg-surface font-medium text-foreground'
                      : 'text-foreground/90 hover:bg-surface-hover'
                  }`}
                >
                  {doc.icon ? (
                    <span className="size-4 shrink-0 text-center text-sm leading-4">
                      {doc.icon}
                    </span>
                  ) : (
                    <FileText className="size-4 shrink-0 text-muted" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{doc.title || 'Untitled'}</span>
                </button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete ${doc.title || 'Untitled'}`}
                  className="absolute top-1/2 right-1 -translate-y-1/2 text-muted opacity-0 transition-opacity group-hover/doc:opacity-100 hover:text-danger"
                  onPress={() => requestDelete(doc)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </nav>

          {/* footer action */}
          <div className="border-t border-border p-2">
            <Button
              fullWidth
              size="sm"
              variant="ghost"
              isPending={creating}
              onPress={create}
              className="justify-start gap-2 text-muted"
            >
              <Plus className="size-4" />
              New page
            </Button>
          </div>
        </div>
      </aside>

      {/* ─────────────── Main content ─────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* top bar */}
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onPress={() => setCollapsed((c) => !c)}
            >
              {collapsed ? (
                <ChevronsRight className="size-5 text-muted" />
              ) : (
                <ChevronsLeft className="size-5 text-muted" />
              )}
            </Button>
            {docId && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
                <span className="text-foreground/60">Documents</span>
                <span className="text-foreground/40">/</span>
                <span className="max-w-[16rem] truncate text-foreground">
                  {activeDoc?.title || 'Untitled'}
                </span>
              </button>
            )}
          </div>
          <Button isIconOnly size="sm" variant="ghost" aria-label="More options">
            <MoreHorizontal className="size-5 text-muted" />
          </Button>
        </div>

        {/* scrollable body */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {docId ? (
            <div className="flex flex-1 flex-col bg-white px-12 pt-10 pb-16 lg:px-20">
              <DocumentEditor documentId={docId} />
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-8 pb-8">
              <ListView
                docs={docs}
                loading={loading}
                creating={creating}
                error={error}
                onOpen={onOpen}
                onCreate={create}
                onRemove={requestDelete}
                onRetry={refresh}
              />
            </div>
          )}
        </div>
      </main>

      {/* ─────────────── Delete confirmation popup ─────────────── */}
      <AlertDialog
        isOpen={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Heading>Delete document?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p className="text-sm text-muted">
                  “{pendingDelete?.title || 'Untitled'}” will be permanently deleted. This action
                  can’t be undone.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button variant="tertiary" onPress={() => setPendingDelete(null)}>
                  Cancel
                </Button>
                <Button variant="danger" isPending={deleting} onPress={confirmDelete}>
                  Delete
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}

function ListView({
  docs,
  loading,
  creating,
  error,
  onOpen,
  onCreate,
  onRemove,
  onRetry,
}: {
  docs: DocumentSummary[];
  loading: boolean;
  creating: boolean;
  error: string | null;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onRemove: (doc: DocumentSummary) => void;
  onRetry: () => void;
}) {
  return (
    <>
      {/* hero */}
      <header className="pt-6 pb-8">
        <h1 className="text-4xl font-bold tracking-tight">Documents</h1>
        <p className="mt-3 text-lg text-muted">All your notes, drafts &amp; ideas live here.</p>
      </header>

      <div className="h-px bg-border" />

      {/* content states */}
      {loading ? (
        <div className="flex items-center gap-3 py-16 text-muted">
          <Spinner size="sm" />
          <span>Loading documents…</span>
        </div>
      ) : error ? (
        <div className="my-8 rounded-xl border border-danger/30 bg-danger-soft p-5 text-danger-soft-foreground">
          <p className="font-medium">Could not reach the server.</p>
          <p className="mt-1 text-sm opacity-80">{error}</p>
          <Button size="sm" variant="danger" className="mt-4" onPress={onRetry}>
            Retry
          </Button>
        </div>
      ) : (
        <section className="pt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">All documents</h2>
            <Button size="sm" variant="primary" isPending={creating} onPress={onCreate}>
              <Plus className="size-4" />
              New document
            </Button>
          </div>

          {docs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <FileText className="mx-auto size-8 text-muted" />
              <p className="mt-3 font-medium">No documents yet</p>
              <p className="mt-1 text-sm text-muted">Create your first document to get started.</p>
              <Button size="sm" variant="primary" className="mt-5" onPress={onCreate}>
                <Plus className="size-4" />
                New document
              </Button>
            </div>
          ) : (
            <ul className="-mx-2">
              {docs.map((doc) => (
                <li key={doc.id} className="group">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpen(doc.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpen(doc.id);
                      }
                    }}
                    data-testid="doc-link"
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {doc.icon ? (
                      <span className="flex size-8 shrink-0 items-center justify-center text-2xl leading-none">
                        {doc.icon}
                      </span>
                    ) : (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface text-muted">
                        <FileText className="size-4" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {doc.title || 'Untitled'}
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {formatUpdated(doc.updatedAt)}
                    </span>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete ${doc.title || 'Untitled'}`}
                      className="shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger"
                      onPress={() => onRemove(doc)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

function SidebarItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
        active
          ? 'bg-surface font-medium text-foreground'
          : 'text-foreground/90 hover:bg-surface-hover'
      }`}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}
