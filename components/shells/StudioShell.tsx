"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { PaneResizeHandle } from "@/components/PaneResizeHandle";
import { SidePanel } from "@/components/SidePanel";
import { ViewToggle } from "@/components/ViewToggle";
import { LatexPreview } from "@/components/LatexPreview";
import { StudioMenu } from "@/components/studio/StudioMenu";
import { StudioCommandPalette } from "@/components/studio/StudioCommandPalette";
import { StudioStatusBar } from "@/components/studio/StudioStatusBar";
import { ShareRoom } from "@/components/ShareRoom";
import { NamePicker } from "@/components/NamePicker";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { VimCheatsheetDialog } from "@/components/VimCheatsheetDialog";
import { StudioRoomChat } from "@/components/studio/StudioRoomChat";
import { SafeSvg } from "@/components/SafeSvg";
import type { VimEditorHandle } from "@/components/VimEditor";
import {
  createCollabUser,
  createRoomId,
  loadDisplayName,
  readRoomFromLocation,
  saveDisplayName,
  writeRoomToLocation,
} from "@/lib/collab";
import {
  loadEditorMode,
  saveEditorMode,
  type EditorMode,
} from "@/lib/editor-mode";
import { loadOnboardingSeen, saveOnboardingSeen } from "@/lib/onboarding";
import { loadViewMode, saveViewMode } from "@/lib/storage";
import { loadRelativeLineNumbers, saveRelativeLineNumbers } from "@/lib/editor-settings";
import { useStudioSplitLayout } from "@/lib/use-studio-split-layout";
import { usePaneLayout } from "@/lib/use-pane-layout";
import { STARTER_NOTE } from "@/lib/starter-content";
import { getTemplateContent } from "@/lib/templates";
import {
  clearRecentRooms,
  loadRecentRooms,
  recordRecentRoom,
  type RecentRoom,
} from "@/lib/recent-rooms";
import type { UiVariant } from "@/lib/ui-variant";
import type {
  CollabStatus,
  CollabUser,
  NewRoomOptions,
  ViewMode,
  VimMode,
} from "@/lib/types";

const VimEditor = dynamic(
  () => import("@/components/VimEditor").then((m) => m.VimEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center px-4 font-mono text-xs uppercase tracking-[1.2px] text-mute sm:px-5">
        Connecting room…
      </div>
    ),
  },
);

type StudioShellProps = {
  uiVariant: UiVariant;
  onUiVariantChange: (variant: UiVariant) => void;
};

export function StudioShell({
  uiVariant,
  onUiVariantChange,
}: StudioShellProps) {
  const [note, setNote] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [editorMode, setEditorMode] = useState<EditorMode>("vim");
  const [vimMode, setVimMode] = useState<VimMode>("normal");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [collabStatus, setCollabStatus] =
    useState<CollabStatus>("connecting");
  const [peerCount, setPeerCount] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<CollabUser | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [seed, setSeed] = useState<string | null>(STARTER_NOTE);
  const [relativeLineNumbers, setRelativeLineNumbers] = useState(true);
  const editorRef = useRef<VimEditorHandle>(null);

  useEffect(() => {
    const existing = readRoomFromLocation();
    const room = existing ?? createRoomId();
    writeRoomToLocation(room);
    setRoomId(room);

    const storedMode = loadViewMode();
    if (storedMode != null) setViewMode(storedMode);

    const mode = loadEditorMode();
    setEditorMode(mode);

    const storedName = loadDisplayName();
    if (storedName) {
      setUser(createCollabUser({ name: storedName }));
      setNeedsName(false);
    } else if (mode === "standard") {
      // Standard invitees skip the name modal.
      setUser(createCollabUser());
      setNeedsName(false);
      if (!loadOnboardingSeen()) setOnboardingOpen(true);
    } else {
      setUser(createCollabUser());
      setNeedsName(true);
    }
    setRelativeLineNumbers(loadRelativeLineNumbers());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveRelativeLineNumbers(relativeLineNumbers);
  }, [relativeLineNumbers, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveViewMode(viewMode);
  }, [viewMode, hydrated]);

  const handleEditorMode = useCallback((mode: EditorMode) => {
    saveEditorMode(mode);
    setEditorMode(mode);
    if (mode === "standard") {
      setNeedsName(false);
      setEditingName(false);
    }
    requestAnimationFrame(() => editorRef.current?.focus());
  }, []);

  const handleViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    requestAnimationFrame(() => editorRef.current?.focus());
  }, []);

  const handleNameSubmit = useCallback((name: string) => {
    const firstJoin = needsName;
    saveDisplayName(name);
    setUser((prev) =>
      prev
        ? { ...prev, name }
        : createCollabUser({ name }),
    );
    setNeedsName(false);
    setEditingName(false);
    if (firstJoin && !loadOnboardingSeen()) {
      setOnboardingOpen(true);
    } else {
      requestAnimationFrame(() => editorRef.current?.focus());
    }
  }, [needsName]);

  const closeOnboarding = useCallback(() => {
    saveOnboardingSeen();
    setOnboardingOpen(false);
    requestAnimationFrame(() => editorRef.current?.focus());
  }, []);

  const openNameEdit = useCallback(() => {
    setEditingName(true);
  }, []);

  const handleNewRoom = useCallback((opts?: NewRoomOptions) => {
    const room = opts?.roomId ?? createRoomId();
    writeRoomToLocation(room);
    setRoomId(room);
    setNote("");
    setSeed(
      opts?.templateId
        ? getTemplateContent(opts.templateId)
        : STARTER_NOTE,
    );
    setChatOpen(false);
    setCollabStatus("connecting");
    setPeerCount(1);
    setVimMode("normal");
    requestAnimationFrame(() => editorRef.current?.focus());
  }, []);

  // Keep the recent-rooms list fresh (records the current room on entry and
  // on every room switch, including template/blank new sheets).
  useEffect(() => {
    if (!roomId) return;
    recordRecentRoom(roomId);
    setRecentRooms(loadRecentRooms());
  }, [roomId]);

  // Ctrl/Cmd+K opens the command palette.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const isSplit = viewMode === "split";
  const ready = hydrated && !!roomId && !!user && !needsName;
  const namePickerOpen = needsName || editingName;

  const { layout: paneLayout, resizePane, resizeMobileBottom, resetPane } =
    usePaneLayout({
      open: { left: false, right: chatOpen },
    });
  const {
    layout: splitLayout,
    resizePreviewWidth,
    resizePreviewMobileHeight,
    resetPreviewWidth,
    resetPreviewMobileHeight,
  } = useStudioSplitLayout(isSplit);

  const previewPaneStyle = {
    "--studio-preview-width": `${splitLayout.previewWidth}px`,
    "--studio-preview-mobile-height": `${splitLayout.previewMobileHeight}px`,
  } as CSSProperties;

  return (
    <div className="app-shell ui-studio flex h-dvh flex-col text-ink">
      <header className="flex min-h-[var(--header-h)] shrink-0 flex-col gap-2 border-b border-hairline px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-0">
        <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-start sm:gap-4">
          <span className="vt-brand text-ink">VimTex</span>
          <span className="vt-caption text-mute sm:hidden">
            {editorMode === "standard" ? "STANDARD" : vimModeLabel(vimMode)}
          </span>
          <span className="vt-caption hidden text-mute sm:inline">
            {editorMode === "standard" ? "STANDARD" : vimModeLabel(vimMode)}
          </span>
        </div>
        <div
          className="vt-toolbar sm:justify-end"
          role="toolbar"
          aria-label="Workspace tools"
        >
          {roomId ? <ShareRoom roomId={roomId} variant="studio" /> : null}
          <button
            type="button"
            aria-pressed={chatOpen}
            aria-label={chatOpen ? "Close chat" : "Open chat"}
            title="Room chat"
            disabled={!ready}
            onClick={() => setChatOpen((v) => !v)}
            className={
              chatOpen
                ? "vt-pill vt-pill--solid gap-1.5"
                : "vt-pill vt-pill--ghost gap-1.5"
            }
          >
            <ChatIcon />
            <span className="hidden sm:inline">Chat</span>
          </button>
          <ViewToggle value={viewMode} onChange={handleViewMode} />
          <StudioMenu
            note={note}
            disabled={!ready}
            editorMode={editorMode}
            onEditorModeChange={handleEditorMode}
            uiVariant={uiVariant}
            onUiVariantChange={onUiVariantChange}
            onNewRoom={handleNewRoom}
            recentRooms={recentRooms}
            onClearRecentRooms={() => {
              clearRecentRooms();
              setRecentRooms([]);
            }}
            relativeLineNumbers={relativeLineNumbers}
            onRelativeLineNumbersChange={setRelativeLineNumbers}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main
          className={
            isSplit
              ? "flex min-h-0 min-w-0 flex-1 flex-col md:flex-row"
              : "min-h-0 min-w-0 flex-1"
          }
        >
          <section
            className={
              isSplit
                ? "min-h-0 min-w-0 flex-1 border-b border-hairline md:border-b-0 md:border-r"
                : "h-full min-h-0"
            }
          >
            {ready && roomId && user ? (
              <VimEditor
                key={`${roomId}-${editorMode}`}
                ref={editorRef}
                roomId={roomId}
                user={user}
                collaborationEnabled
                vimEnabled={editorMode === "vim"}
                inlineMath={viewMode === "realtime"}
                relativeLineNumbers={relativeLineNumbers}
                emptyRoomSeed={seed}
                showPlaceholder={false}
                onChange={setNote}
                onVimModeChange={setVimMode}
                onCollabStatus={setCollabStatus}
                onPeerCount={setPeerCount}
              />
            ) : (
              <div className="flex h-full items-center px-4 font-mono text-xs uppercase tracking-[1.2px] text-mute sm:px-5">
                {namePickerOpen ? "Enter a display name…" : "Preparing room…"}
              </div>
            )}
          </section>

          {isSplit ? (
            <>
              <PaneResizeHandle
                orientation="horizontal"
                label="Resize preview panel height"
                className="md:hidden"
                onResize={(delta) => resizePreviewMobileHeight(-delta)}
                onReset={resetPreviewMobileHeight}
              />
              <PaneResizeHandle
                orientation="vertical"
                label="Resize preview panel"
                className="hidden md:flex"
                onResize={(delta) => resizePreviewWidth(-delta)}
                onReset={resetPreviewWidth}
              />
              <section
                className="vt-studio-preview-pane min-h-0 bg-transparent"
                style={previewPaneStyle}
              >
                <LatexPreview note={note} />
              </section>
            </>
          ) : null}
        </main>

        {user ? (
          <SidePanel
            side="right"
            open={chatOpen}
            width={paneLayout.right}
            mobileHeight={paneLayout.mobileBottomHeight}
            ariaLabel="Room chat"
            surfaceClassName="vt-chat-panel"
            onResize={(delta) => resizePane("right", delta)}
            onResizeMobile={(delta) => resizeMobileBottom(delta)}
            onReset={() => resetPane("right")}
            onResetMobile={() => resetPane("mobileBottomHeight")}
          >
            <StudioRoomChat
              embedded
              onClose={() => setChatOpen(false)}
              peerCount={peerCount}
              user={user}
              editorRef={editorRef}
              chatReady={ready}
            />
          </SidePanel>
        ) : null}
      </div>

      <StudioStatusBar
        vimMode={editorMode === "standard" ? "standard" : vimMode}
        collabStatus={collabStatus}
        peerCount={peerCount}
        userName={user?.name ?? "…"}
        onEditName={user ? openNameEdit : undefined}
        onOpenCheatsheet={
          editorMode === "vim" ? () => setCheatsheetOpen(true) : undefined
        }
      />

      <NamePicker
        open={namePickerOpen}
        initialName={needsName ? "" : (user?.name ?? "")}
        onSubmit={handleNameSubmit}
        allowSkip={editingName && !needsName}
        onCancel={
          editingName && !needsName
            ? () => setEditingName(false)
            : undefined
        }
      />

      <OnboardingDialog open={onboardingOpen} onClose={closeOnboarding} />
      <VimCheatsheetDialog
        open={cheatsheetOpen}
        onClose={() => setCheatsheetOpen(false)}
      />
      <StudioCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        roomId={roomId}
        note={note}
        viewMode={viewMode}
        editorMode={editorMode}
        uiVariant={uiVariant}
        chatOpen={chatOpen}
        cheatsheetAvailable={editorMode === "vim"}
        onNewRoom={handleNewRoom}
        onViewModeChange={handleViewMode}
        onEditorModeChange={handleEditorMode}
        onUiVariantChange={onUiVariantChange}
        onToggleChat={() => setChatOpen((v) => !v)}
        onOpenCheatsheet={() => setCheatsheetOpen(true)}
      />
    </div>
  );
}

function vimModeLabel(mode: VimMode): string {
  const m = mode.toLowerCase();
  if (m.startsWith("vis")) return "VISUAL";
  if (m.startsWith("ins")) return "INSERT";
  if (m.startsWith("rep")) return "REPLACE";
  return "NORMAL";
}

function ChatIcon() {
  return (
    <SafeSvg
      width={15}
      height={15}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M3.5 3.5h9a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H7l-2.5 2v-2h-1a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </SafeSvg>
  );
}
