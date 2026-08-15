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
import { NoteImportHost } from "@/components/NoteImportHost";
import { TemplateVariablesDialog } from "@/components/TemplateVariablesDialog";
import { SaveTemplateDialog } from "@/components/SaveTemplateDialog";
import { NewSheetDialog } from "@/components/NewSheetDialog";
import { RoomChatSidebar } from "@/components/RoomChatSidebar";
import { RoomPasswordDialog } from "@/components/RoomPasswordDialog";
import { RoomSettingsDialog } from "@/components/RoomSettingsDialog";
import { RoomHistoryPanel } from "@/components/RoomHistoryPanel";
import { RoomAutosnapHost } from "@/components/RoomAutosnapHost";
import { RoomExpiredScreen } from "@/components/RoomExpiredScreen";
import { RoomAccessDenied } from "@/components/RoomAccessDenied";
import { SidePanel } from "@/components/SidePanel";
import { openPreferences } from "@/lib/ui-events";
import {
  ChatIcon,
  HistoryIcon,
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
import { AiReviewProvider, useAiReview } from "@/components/ai/AiReviewProvider";
import { AiPreviewReview } from "@/components/ai/AiPreviewReview";
import {
  createCollabUser,
  createRoomId,
  loadDisplayName,
  readRoomFromLocation,
  saveDisplayName,
  writeRoomToLocation,
} from "@/lib/collab";
import {
  loadEditSecret,
  readViewTokenFromLocation,
  resolveEditSecret,
  mintEditCapabilityForNewRoom,
} from "@/lib/room-auth";
import { useRoomGate } from "@/lib/use-room-gate";
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
import { useRecentRoomsTracker } from "@/lib/use-recent-rooms-tracker";
import { useShellShortcuts } from "@/lib/use-shell-shortcuts";
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
  const [viewToken, setViewToken] = useState<string | null>(null);
  const [viewRoomId, setViewRoomId] = useState<string | null>(null);
  const [editSecret, setEditSecret] = useState<string | null>(null);
  const [capabilityReady, setCapabilityReady] = useState(false);
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false);
  const editorRef = useRef<VimEditorHandle>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateDerivedTitleRef = useRef<(roomId: string, note: string) => void>(
    () => {},
  );

  const problemOpen = rightPanelView === "problem";
  const previewOpen = rightPanelView === "preview";
  const chatOpen = rightPanelView === "chat";
  const historyOpen = rightPanelView === "history";
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

  useShellShortcuts({
    onTogglePalette: useCallback(() => setPaletteOpen((v) => !v), []),
    onToggleCheatsheet: useCallback(() => setCheatsheetOpen((v) => !v), []),
  });

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

  const pendingMintRef = useRef<Set<string>>(new Set());

  const handleRoomCreated = useCallback((createdRoomId: string) => {
    pendingMintRef.current.add(createdRoomId);
  }, []);

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
    onRoomCreated: handleRoomCreated,
  });

  useEffect(() => {
    updateDerivedTitleRef.current = updateDerivedTitle;
  }, [updateDerivedTitle]);

  const roomId = activeRoomId;

  const { recentRooms, clear: clearTrackedRecentRooms } =
    useRecentRoomsTracker(roomId);

  useEffect(() => {
    let cancelled = false;
    try {
      const roomFromUrl = readRoomFromLocation();
      setUrlRoomId(roomFromUrl);
      const token = readViewTokenFromLocation();
      setViewToken(token);
      setViewRoomId(token ? roomFromUrl : null);
      setRightPanelView(loadRightPanelView());
      setEditorMode(loadEditorMode());
      setRelativeLineNumbers(loadRelativeLineNumbers());
      const storedName = loadDisplayName();
      setUser(
        createCollabUser(storedName ? { name: storedName } : undefined),
      );
      if (!loadOnboardingSeen()) setOnboardingOpen(true);

      const finish = (edit: string | null, capsReady: boolean) => {
        if (cancelled) return;
        setEditSecret(edit);
        setCapabilityReady(capsReady);
        setHydrated(true);
      };

      // Open existing URL room: never mint (strip-view must stay denied).
      // Bare `/` creates a room via tabs — mint happens in onRoomCreated.
      if (token) {
        finish(null, true);
      } else if (roomFromUrl) {
        finish(resolveEditSecret(roomFromUrl), true);
      } else {
        finish(null, false);
      }
    } catch {
      if (!cancelled) {
        setUser(createCollabUser());
        setCapabilityReady(true);
        setHydrated(true);
      }
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!roomId || !viewRoomId) return;
    if (roomId !== viewRoomId) {
      const edit = loadEditSecret(roomId);
      writeRoomToLocation(roomId, {
        clearViewToken: true,
        ...(edit ? { editSecret: edit } : { clearEditSecret: true }),
      });
      setViewToken(null);
      setViewRoomId(null);
      setEditSecret(edit);
    }
  }, [roomId, viewRoomId]);

  useEffect(() => {
    if (!roomId || viewToken) return;
    if (pendingMintRef.current.has(roomId)) {
      pendingMintRef.current.delete(roomId);
      setCapabilityReady(false);
      void mintEditCapabilityForNewRoom(roomId)
        .then(({ edit }) => {
          setEditSecret(edit);
          setCapabilityReady(true);
        })
        .catch(() => {
          setEditSecret(null);
          setCapabilityReady(true);
        });
      return;
    }
    setEditSecret(resolveEditSecret(roomId));
    setCapabilityReady(true);
  }, [roomId, viewToken]);

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

  const toggleHistory = useCallback(() => {
    setRightPanelView((view) => {
      if (view === "history") {
        focusEditor();
        return null;
      }
      return "history";
    });
  }, [focusEditor]);

  const openChatPanel = useCallback(() => {
    setRightPanelView("chat");
  }, []);

  const openHistoryPanel = useCallback(() => {
    setRightPanelView("history");
  }, []);

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
      handleRoomCreated(freshRoom);
      if (content) saveNote(freshRoom, content);
      openRoom(freshRoom, note);
    },
    [canNewTab, openRoom, note, handleRoomCreated],
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

  const nameReady = hydrated && capabilityReady && !!roomId && !!user;
  const effectiveViewToken =
    viewToken && roomId && roomId === viewRoomId ? viewToken : null;
  const gate = useRoomGate(roomId, nameReady, {
    editSecret: effectiveViewToken ? null : editSecret,
    viewToken: effectiveViewToken,
  });
  const ready =
    nameReady &&
    gate.checked &&
    !gate.expired &&
    !gate.needsPassword &&
    !gate.needsShareLink;

  const workspace = useWorkspaceController({
    enabled: ready,
    roomId,
    user,
    collaborationEnabled: true,
    viewToken: effectiveViewToken,
    editSecret: effectiveViewToken ? null : editSecret,
    authToken: gate.authToken,
    localSeed,
    onTextChange: handleNoteChange,
    onCollabStatus: setCollabStatus,
    onPeersChange: setPeers,
  });

  const selfClientId = workspace?.getClientId() ?? null;
  const readOnly = Boolean(effectiveViewToken);

  const openRoomIds = useMemo(
    () => new Set(tabs.map((tab) => tab.roomId)),
    [tabs],
  );

  if (gate.expired) {
    return <RoomExpiredScreen expiresAt={gate.meta?.expiresAt} />;
  }

  if (gate.needsShareLink && roomId) {
    return <RoomAccessDenied roomId={roomId} />;
  }

  return (
    <WorkspaceProvider value={workspace}>
    <AiReviewProvider>
    <NoteImportHost />
    <RoomAutosnapHost
      roomId={roomId}
      readOnly={readOnly}
      auth={{
        editSecret,
        viewToken: effectiveViewToken,
        authToken: gate.authToken,
      }}
    />
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
        onClearRecentRooms={clearTrackedRecentRooms}
        onOpenRoom={handleOpenRoom}
        openRoomIds={openRoomIds}
        canvasBlank={note.trim().length === 0}
        readOnly={readOnly}
        onOpenRoomSettings={
          readOnly ? undefined : () => setRoomSettingsOpen(true)
        }
        onEditSecret={setEditSecret}
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

      <ReconnectBanner status={collabStatus} localBuffer />

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
                  : rightPanelView === "history"
                    ? "Version history"
                    : "Rendered preview"
            }
            surfaceClassName={
              rightPanelView === "problem"
                ? "vt-pane-reference"
                : rightPanelView === "history"
                  ? "vt-pane-preview"
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
            {previewOpen ? <ForgePreviewPane note={note} /> : null}
            {roomId && user && (chatOpen || historyOpen) ? (
              <div
                key={chatOpen ? "chat" : "history"}
                className="vt-right-panel-content flex h-full min-h-0 flex-col"
              >
                {historyOpen ? (
                  <RoomHistoryPanel
                    roomId={roomId}
                    readOnly={readOnly}
                    onClose={closeRightPanel}
                    auth={{
                      editSecret,
                      viewToken: effectiveViewToken,
                      authToken: gate.authToken,
                    }}
                  />
                ) : (
                  <RoomChatSidebar
                    open={chatOpen}
                    onClose={closeRightPanel}
                    peers={peers}
                    selfClientId={selfClientId}
                    user={user}
                    chatReady={ready}
                    getEditorContext={() =>
                      editorRef.current?.getEditorContext() ?? null
                    }
                  />
                )}
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
            label="History"
            pressed={historyOpen}
            disabled={!ready || !roomId}
            onClick={toggleHistory}
            icon={<HistoryIcon />}
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
        historyOpen={historyOpen}
        disabled={!ready}
        onToggleProblem={toggleProblem}
        onTogglePreview={togglePreview}
        onToggleChat={toggleChat}
        onToggleHistory={toggleHistory}
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
      {gate.needsPassword && roomId ? (
        <RoomPasswordDialog
          roomId={roomId}
          busy={gate.unlocking}
          error={gate.unlockError}
          onSubmit={(password) => void gate.unlock(password)}
        />
      ) : null}
      {roomId ? (
        <RoomSettingsDialog
          open={roomSettingsOpen}
          roomId={roomId}
          onClose={() => setRoomSettingsOpen(false)}
          onSaved={gate.applyMeta}
        />
      ) : null}
      <VtToaster />
    </div>
    </AiReviewProvider>
    </WorkspaceProvider>
  );
}

function ForgePreviewPane({ note }: { note: string }) {
  const review = useAiReview();
  // Forge cannot mutate; still allow viewing a peer/chat proposal in preview.
  if (review.prefs.showInPreview && review.pending) {
    return (
      <AiPreviewReview
        before={review.pending.before}
        after={review.pending.after}
      />
    );
  }
  return <LatexPreview note={note} />;
}
