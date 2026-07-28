"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { BottomPanelTabs } from "@/components/BottomPanelTabs";
import { EditorTabBar } from "@/components/EditorTabBar";
import { LatexPreview } from "@/components/LatexPreview";
import { StatusBar } from "@/components/StatusBar";
import { NamePicker } from "@/components/NamePicker";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { VimCheatsheetDialog } from "@/components/VimCheatsheetDialog";
import { EditorModeToggle } from "@/components/EditorModeToggle";
import { ProblemReferencePanel } from "@/components/ProblemReferencePanel";
import { RoomChatSidebar } from "@/components/RoomChatSidebar";
import { SidePanel } from "@/components/SidePanel";
import { UiVariantToggle } from "@/components/UiVariantToggle";
import {
  ChatIcon,
  PreviewIcon,
  ReferenceIcon,
  SidePanelRail,
  SidePanelRailButton,
} from "@/components/SidePanelRail";
import type { VimEditorHandle } from "@/components/VimEditor";
import {
  createCollabUser,
  loadDisplayName,
  readRoomFromLocation,
  saveDisplayName,
} from "@/lib/collab";
import {
  loadRightPanelView,
  saveRightPanelView,
  type RightPanelView,
} from "@/lib/panel-storage";
import { saveNote } from "@/lib/storage";
import { loadOnboardingSeen, saveOnboardingSeen } from "@/lib/onboarding";
import {
  loadEditorMode,
  saveEditorMode,
  type EditorMode,
} from "@/lib/editor-mode";
import type { UiVariant } from "@/lib/ui-variant";
import { useEditorTabs } from "@/lib/use-editor-tabs";
import { usePaneLayout } from "@/lib/use-pane-layout";
import type { CollabStatus, CollabUser, VimMode } from "@/lib/types";

const VimEditor = dynamic(
  () => import("@/components/VimEditor").then((m) => m.VimEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center px-4 text-sm text-mute sm:px-5">
        Opening sheet…
      </div>
    ),
  },
);

type QuietCraftShellProps = {
  uiVariant: UiVariant;
  onUiVariantChange: (variant: UiVariant) => void;
};

export function QuietCraftShell({
  uiVariant,
  onUiVariantChange,
}: QuietCraftShellProps) {
  const [note, setNote] = useState("");
  const [vimMode, setVimMode] = useState<VimMode>("normal");
  const [editorMode, setEditorMode] = useState<EditorMode>("vim");
  const [localSeed, setLocalSeed] = useState<string | null>(null);
  const [collabStatus, setCollabStatus] =
    useState<CollabStatus>("connecting");
  const [peerCount, setPeerCount] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const [urlRoomId, setUrlRoomId] = useState<string | null>(null);
  const [user, setUser] = useState<CollabUser | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const [rightPanelView, setRightPanelView] =
    useState<RightPanelView | null>(null);
  const editorRef = useRef<VimEditorHandle>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateDerivedTitleRef = useRef<(roomId: string, note: string) => void>(
    () => {},
  );

  const problemOpen = rightPanelView === "problem";
  const previewOpen = rightPanelView === "preview";
  const chatOpen = rightPanelView === "chat";
  const rightPanelOpen = rightPanelView !== null;

  const { layout, resizePane, resizeMobileBottom, resetPane } = usePaneLayout({
    open: {
      left: false,
      right: rightPanelOpen,
    },
  });

  const focusEditor = useCallback(() => {
    requestAnimationFrame(() => editorRef.current?.focus());
  }, []);

  const flushSave = useCallback((roomId: string, content: string) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    saveNote(roomId, content);
  }, []);

  const handleBeforeSwitch = useCallback(
    (fromRoomId: string, content: string) => {
      flushSave(fromRoomId, content);
    },
    [flushSave],
  );

  const handleAfterSwitch = useCallback(
    (toRoomId: string, seed: string | null) => {
      setLocalSeed(seed);
      setNote(seed ?? "");
      updateDerivedTitleRef.current(toRoomId, seed ?? "");
      focusEditor();
    },
    [focusEditor],
  );

  const {
    tabs,
    activeRoomId,
    derivedTitles,
    canNewTab,
    selectTab,
    closeTab,
    newTab,
    renameTab,
    updateDerivedTitle,
  } = useEditorTabs({
    urlRoomId,
    hydrated,
    onBeforeSwitch: handleBeforeSwitch,
    onAfterSwitch: handleAfterSwitch,
  });

  useEffect(() => {
    updateDerivedTitleRef.current = updateDerivedTitle;
  }, [updateDerivedTitle]);

  const roomId = activeRoomId;

  useEffect(() => {
    try {
      setUrlRoomId(readRoomFromLocation());
      setRightPanelView(loadRightPanelView());
      setEditorMode(loadEditorMode());
      const storedName = loadDisplayName();
      setUser(
        createCollabUser(storedName ? { name: storedName } : undefined),
      );
      if (!loadOnboardingSeen()) setOnboardingOpen(true);
    } catch {
      setUser(createCollabUser());
    } finally {
      setHydrated(true);
    }
  }, []);

  const handleEditorMode = useCallback((mode: EditorMode) => {
    saveEditorMode(mode);
    setEditorMode(mode);
    requestAnimationFrame(() => editorRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveRightPanelView(rightPanelView);
  }, [rightPanelView, hydrated]);

  useEffect(() => {
    if (!hydrated || !roomId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveNote(roomId, note);
    }, 300);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [note, roomId, hydrated]);

  const handleNoteChange = useCallback(
    (value: string) => {
      setNote(value);
      if (roomId) updateDerivedTitle(roomId, value);
    },
    [roomId, updateDerivedTitle],
  );

  const handleNameSubmit = useCallback((name: string) => {
    saveDisplayName(name);
    setUser((prev) =>
      prev
        ? { ...prev, name }
        : createCollabUser({ name }),
    );
    setEditingName(false);
    requestAnimationFrame(() => editorRef.current?.focus());
  }, []);

  const openNameEdit = useCallback(() => {
    setEditingName(true);
  }, []);

  const closeOnboarding = useCallback(() => {
    saveOnboardingSeen();
    setOnboardingOpen(false);
    requestAnimationFrame(() => editorRef.current?.focus());
  }, []);

  const toggleProblem = useCallback(() => {
    setRightPanelView((view) => {
      if (view === "problem") {
        focusEditor();
        return null;
      }
      return "problem";
    });
  }, [focusEditor]);

  const togglePreview = useCallback(() => {
    setRightPanelView((view) => {
      if (view === "preview") {
        focusEditor();
        return null;
      }
      return "preview";
    });
  }, [focusEditor]);

  const toggleChat = useCallback(() => {
    setRightPanelView((view) => {
      if (view === "chat") {
        focusEditor();
        return null;
      }
      return "chat";
    });
  }, [focusEditor]);

  const closeRightPanel = useCallback(() => {
    setRightPanelView(null);
    focusEditor();
  }, [focusEditor]);

  const handleNewSheet = useCallback(() => {
    newTab(note);
  }, [newTab, note]);

  const handleSelectTab = useCallback(
    (targetRoomId: string) => {
      selectTab(targetRoomId, note);
    },
    [selectTab, note],
  );

  const handleCloseTab = useCallback(
    (targetRoomId: string) => {
      closeTab(targetRoomId, note);
    },
    [closeTab, note],
  );

  const ready = hydrated && !!roomId && !!user;

  return (
    <div className="app-shell ui-quiet-craft flex h-dvh flex-col text-ink">
      <AppHeader
        ready={ready}
        note={note}
        canNewSheet={canNewTab}
        onNewSheet={handleNewSheet}
        roomId={roomId}
        uiVariant={uiVariant}
        onUiVariantChange={onUiVariantChange}
        headerExtra={
          <div className="hidden items-center gap-1.5 sm:flex">
            <EditorModeToggle value={editorMode} onChange={handleEditorMode} />
            <UiVariantToggle value={uiVariant} onChange={onUiVariantChange} />
          </div>
        }
      />

      <div className="vt-workspace flex min-h-0 min-w-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
          <main className="min-h-0 min-w-0 flex-1">
            <section className="vt-pane flex h-full min-h-0 flex-col">
              {ready && roomId && user ? (
                <>
                  <EditorTabBar
                    tabs={tabs}
                    activeRoomId={roomId}
                    derivedTitles={derivedTitles}
                    canNewTab={canNewTab}
                    onSelect={handleSelectTab}
                    onClose={handleCloseTab}
                    onNew={handleNewSheet}
                    onRename={renameTab}
                  />
                  <div
                    className="min-h-0 flex-1"
                    role="tabpanel"
                    aria-label="Document editor"
                  >
                    <VimEditor
                      key={`${roomId}-${editorMode}`}
                      ref={editorRef}
                      roomId={roomId}
                      user={user}
                      collaborationEnabled
                      vimEnabled={editorMode === "vim"}
                      inlineMath
                      localSeed={localSeed}
                      onChange={handleNoteChange}
                      onVimModeChange={setVimMode}
                      onCollabStatus={setCollabStatus}
                      onPeerCount={setPeerCount}
                    />
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center px-4 text-sm text-mute sm:px-5">
                  Opening sheet…
                </div>
              )}
            </section>
          </main>

          <SidePanel
            side="right"
            open={rightPanelOpen}
            width={layout.right}
            mobileHeight={layout.mobileBottomHeight}
            ariaLabel={
              rightPanelView === "chat"
                ? "Room chat"
                : rightPanelView === "problem"
                  ? "Problem reference"
                  : "Rendered preview"
            }
            surfaceClassName={
              rightPanelView === "problem"
                ? "vt-pane-reference"
                : "vt-pane-preview"
            }
            onResize={(delta) => resizePane("right", delta)}
            onResizeMobile={(delta) => resizeMobileBottom(delta)}
            onReset={() => resetPane("right")}
            onResetMobile={() => resetPane("mobileBottomHeight")}
          >
            {roomId && problemOpen ? (
              <ProblemReferencePanel open={problemOpen} roomId={roomId} />
            ) : null}
            {previewOpen ? <LatexPreview note={note} /> : null}
            {user ? (
              <div
                className={
                  chatOpen ? "flex h-full min-h-0 flex-col" : "hidden"
                }
                aria-hidden={!chatOpen}
              >
                <RoomChatSidebar
                  open={rightPanelOpen}
                  onClose={closeRightPanel}
                  peerCount={peerCount}
                  user={user}
                  editorRef={editorRef}
                  chatReady={ready}
                />
              </div>
            ) : null}
          </SidePanel>
        </div>

        <SidePanelRail
          side="right"
          label="Right panels"
          disabled={!ready}
          className="hidden md:flex"
        >
          <SidePanelRailButton
            label="Problem"
            pressed={problemOpen}
            disabled={!ready}
            onClick={toggleProblem}
            icon={<ReferenceIcon />}
          />
          <SidePanelRailButton
            label="Preview"
            pressed={previewOpen}
            disabled={!ready}
            onClick={togglePreview}
            icon={<PreviewIcon />}
          />
          <SidePanelRailButton
            label="Chat"
            pressed={chatOpen}
            disabled={!ready}
            onClick={toggleChat}
            icon={<ChatIcon />}
          />
        </SidePanelRail>
      </div>

      <BottomPanelTabs
        problemOpen={problemOpen}
        previewOpen={previewOpen}
        chatOpen={chatOpen}
        disabled={!ready}
        onToggleProblem={toggleProblem}
        onTogglePreview={togglePreview}
        onToggleChat={toggleChat}
      />

      <StatusBar
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
        open={hydrated && editingName}
        initialName={user?.name ?? ""}
        onSubmit={handleNameSubmit}
        allowSkip
        onCancel={() => setEditingName(false)}
      />

      <OnboardingDialog open={onboardingOpen} onClose={closeOnboarding} />
      <VimCheatsheetDialog
        open={cheatsheetOpen}
        onClose={() => setCheatsheetOpen(false)}
      />
    </div>
  );
}
