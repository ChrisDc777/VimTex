"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { BottomPanelTabs } from "@/components/BottomPanelTabs";
import { EditorTabBar } from "@/components/EditorTabBar";
import { LatexPreview } from "@/components/LatexPreview";
import { StatusBar } from "@/components/StatusBar";
import { NamePicker } from "@/components/NamePicker";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { VimCheatsheetDialog } from "@/components/VimCheatsheetDialog";
import { ProblemReferencePanel } from "@/components/ProblemReferencePanel";
import { ReconnectBanner } from "@/components/ReconnectBanner";
import { SnippetMenu } from "@/components/SnippetMenu";
import { VtToaster } from "@/components/VtToaster";
import { CommandPalette } from "@/components/CommandPalette";
import { TemplateVariablesDialog } from "@/components/TemplateVariablesDialog";
import { SaveTemplateDialog } from "@/components/SaveTemplateDialog";
import { NewSheetDialog } from "@/components/NewSheetDialog";
import { RoomChatSidebar } from "@/components/RoomChatSidebar";
import { SidePanel } from "@/components/SidePanel";
import { openPreferences } from "@/lib/ui-events";
import {
  ChatIcon,
  PreviewIcon,
  ReferenceIcon,
  SidePanelRail,
  SidePanelRailButton,
} from "@/components/SidePanelRail";
import type { VimEditorHandle } from "@/components/VimEditor";
import {
  WorkspaceProvider,
  useWorkspaceController,
} from "@/components/workspace/WorkspaceContext";
import {
  createCollabUser,
  createRoomId,
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
  buildTemplateDefaults,
  extractTemplateVariables,
  fillTemplateVariables,
  getTemplateById,
  makeTemplateId,
  saveCustomTemplate,
  type SessionTemplate,
} from "@/lib/templates";
import {
  loadEditorMode,
  saveEditorMode,
  type EditorMode,
} from "@/lib/editor-mode";
import {
  loadRelativeLineNumbers,
  saveRelativeLineNumbers,
} from "@/lib/editor-settings";
import {
  clearRecentRooms,
  loadRecentRooms,
  recordRecentRoom,
  type RecentRoom,
} from "@/lib/recent-rooms";
import type { UiVariant } from "@/lib/ui-variant";
import { useEditorTabs } from "@/lib/use-editor-tabs";
import { usePaneLayout } from "@/lib/use-pane-layout";
import type {
  CollabStatus,
  CollabUser,
  NewRoomOptions,
  PeerInfo,
  VimMode,
} from "@/lib/types";

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

type ForgeShellProps = {
  uiVariant: UiVariant;
  onUiVariantChange: (variant: UiVariant) => void;
};

export function ForgeShell({
  uiVariant,
  onUiVariantChange,
}: ForgeShellProps) {
  const [note, setNote] = useState("");
  const [vimMode, setVimMode] = useState<VimMode>("normal");
  const [editorMode, setEditorMode] = useState<EditorMode>("vim");
  const [localSeed, setLocalSeed] = useState<string | null>(null);
  const [collabStatus, setCollabStatus] =
    useState<CollabStatus>("connecting");
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [urlRoomId, setUrlRoomId] = useState<string | null>(null);
  const [user, setUser] = useState<CollabUser | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [templatePending, setTemplatePending] =
    useState<SessionTemplate | null>(null);
  const [templateDefaults, setTemplateDefaults] = useState<
    Record<string, string>
  >({});
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [sheetPickerOpen, setSheetPickerOpen] = useState(false);
  const [relativeLineNumbers, setRelativeLineNumbers] = useState(true);
  const [rightPanelView, setRightPanelView] =
    useState<RightPanelView | null>(null);
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
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

  // Global app shortcuts: ? toggles shortcuts & tips; Ctrl/Cmd+, opens preferences.
  useEffect(() => {
    const isEditable = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      if (!el || el === document.body) return false;
      return (
        el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.isContentEditable
      );
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key === ",") {
          event.preventDefault();
          openPreferences();
          return;
        }
        if (event.key.toLowerCase() === "k") {
          event.preventDefault();
          setPaletteOpen((v) => !v);
          return;
        }
        return;
      }
      if (event.key === "?") {
        if (isEditable(event.target)) return;
        event.preventDefault();
        setCheatsheetOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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
    openRoom,
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

  // Keep the recent-rooms list fresh (records the current room on entry and
  // on every tab/room switch).
  useEffect(() => {
    if (!roomId) return;
    recordRecentRoom(roomId);
    setRecentRooms(loadRecentRooms());
  }, [roomId]);

  useEffect(() => {
    try {
      setUrlRoomId(readRoomFromLocation());
      setRightPanelView(loadRightPanelView());
      setEditorMode(loadEditorMode());
      setRelativeLineNumbers(loadRelativeLineNumbers());
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
    if (!hydrated) return;
    saveRelativeLineNumbers(relativeLineNumbers);
  }, [relativeLineNumbers, hydrated]);

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

  const startRoomWithContent = useCallback(
    (content: string) => {
      if (!canNewTab) return;
      const freshRoom = createRoomId();
      if (content) saveNote(freshRoom, content);
      openRoom(freshRoom, note);
    },
    [canNewTab, openRoom, note],
  );

  const handleNewRoom = useCallback(
    (opts?: NewRoomOptions) => {
      if (!canNewTab) return;
      const template = opts?.templateId
        ? getTemplateById(opts.templateId)
        : undefined;
      const variables = template
        ? extractTemplateVariables(template.content)
        : [];
      if (template && variables.length > 0) {
        setTemplateDefaults(buildTemplateDefaults(variables, user?.name));
        setTemplatePending(template);
        return;
      }
      startRoomWithContent(template?.content ?? "");
    },
    [canNewTab, user?.name, startRoomWithContent],
  );

  const handleTemplateSubmit = useCallback(
    (values: Record<string, string>) => {
      if (!templatePending) return;
      startRoomWithContent(
        fillTemplateVariables(templatePending.content, values),
      );
      setTemplatePending(null);
    },
    [templatePending, startRoomWithContent],
  );

  const handleSaveTemplate = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      saveCustomTemplate({
        id: makeTemplateId(trimmed),
        label: trimmed,
        hint: "Custom",
        content: note,
      });
      setSaveTemplateOpen(false);
    },
    [note],
  );

  const handleSheetSelect = useCallback(
    (templateId: string) => {
      setSheetPickerOpen(false);
      handleNewRoom({ templateId });
    },
    [handleNewRoom],
  );

  const handleSelectTab = useCallback(
    (targetRoomId: string) => {
      selectTab(targetRoomId, note);
    },
    [selectTab, note],
  );

  const handleOpenRoom = useCallback(
    (targetRoomId: string) => {
      openRoom(targetRoomId, note);
    },
    [openRoom, note],
  );

  const handleCloseTab = useCallback(
    (targetRoomId: string) => {
      closeTab(targetRoomId, note);
    },
    [closeTab, note],
  );

  const ready = hydrated && !!roomId && !!user;

  const workspace = useWorkspaceController({
    enabled: ready,
    roomId,
    user,
    collaborationEnabled: true,
    localSeed,
    onTextChange: handleNoteChange,
    onCollabStatus: setCollabStatus,
    onPeersChange: setPeers,
  });

  const selfClientId = workspace?.getClientId() ?? null;

  const openRoomIds = useMemo(
    () => new Set(tabs.map((tab) => tab.roomId)),
    [tabs],
  );

  return (
    <WorkspaceProvider value={workspace}>
    <div className="app-shell ui-forge flex h-dvh flex-col text-ink">
      <AppHeader
        ready={ready}
        note={note}
        canNewSheet={canNewTab}
        onNewSheet={handleNewSheet}
        onOpenSheetPicker={() => setSheetPickerOpen(true)}
        roomId={roomId}
        uiVariant={uiVariant}
        onUiVariantChange={onUiVariantChange}
        relativeLineNumbers={relativeLineNumbers}
        onRelativeLineNumbersChange={setRelativeLineNumbers}
        editorMode={editorMode}
        onEditorModeChange={handleEditorMode}
        recentRooms={recentRooms}
        onClearRecentRooms={() => {
          clearRecentRooms();
          setRecentRooms([]);
        }}
        onOpenRoom={handleOpenRoom}
        openRoomIds={openRoomIds}
        canvasBlank={note.trim().length === 0}
        headerExtra={
          <SnippetMenu
            disabled={!ready}
            triggerClassName="vt-header-btn"
            labelClassName="hidden sm:inline"
            onInsert={(snippet) =>
              editorRef.current?.insertSnippet(snippet.snippet)
            }
          />
        }
      />

      <ReconnectBanner status={collabStatus} />

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
                      vimEnabled={editorMode === "vim"}
                      inlineMath
                      relativeLineNumbers={relativeLineNumbers}
                      onVimModeChange={setVimMode}
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
              <ProblemReferencePanel
                open={problemOpen}
                roomId={roomId}
                note={note}
              />
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
                  peers={peers}
                  selfClientId={selfClientId}
                  user={user}
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
        peers={peers}
        selfClientId={selfClientId}
        userName={user?.name ?? "…"}
        onEditName={user ? openNameEdit : undefined}
        onOpenCheatsheet={() => setCheatsheetOpen(true)}
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
        onOpenOnboarding={() => setOnboardingOpen(true)}
      />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        roomId={roomId}
        note={note}
        editorMode={editorMode}
        uiVariant={uiVariant}
        chatOpen={chatOpen}
        onNewRoom={handleNewRoom}
        onOpenSheetPicker={() => setSheetPickerOpen(true)}
        onEditorModeChange={handleEditorMode}
        onUiVariantChange={onUiVariantChange}
        onToggleChat={toggleChat}
        onTogglePreview={togglePreview}
        onOpenCheatsheet={() => setCheatsheetOpen(true)}
        onOpenPreferences={() => openPreferences()}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        onSaveAsTemplate={() => setSaveTemplateOpen(true)}
      />
      <TemplateVariablesDialog
        open={templatePending !== null}
        template={templatePending}
        defaults={templateDefaults}
        onClose={() => setTemplatePending(null)}
        onSubmit={handleTemplateSubmit}
      />
      <SaveTemplateDialog
        open={saveTemplateOpen}
        defaultName="My template"
        onClose={() => setSaveTemplateOpen(false)}
        onSave={handleSaveTemplate}
      />
      <NewSheetDialog
        open={sheetPickerOpen}
        onClose={() => setSheetPickerOpen(false)}
        onSelect={handleSheetSelect}
      />
      <VtToaster />
    </div>
    </WorkspaceProvider>
  );
}
