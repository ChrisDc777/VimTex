"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { PaneResizeHandle } from "@/components/PaneResizeHandle";
import { ReconnectBanner } from "@/components/ReconnectBanner";
import { SnippetMenu } from "@/components/SnippetMenu";
import { SidePanel } from "@/components/SidePanel";
import { ViewToggle } from "@/components/ViewToggle";
import { LatexPreview } from "@/components/LatexPreview";
import { StudioMenu } from "@/components/studio/StudioMenu";
import { NoteImportHost } from "@/components/NoteImportHost";
import { CommandPalette } from "@/components/CommandPalette";
import { TemplateVariablesDialog } from "@/components/TemplateVariablesDialog";
import { SaveTemplateDialog } from "@/components/SaveTemplateDialog";
import { NewSheetDialog } from "@/components/NewSheetDialog";
import { StudioStatusBar } from "@/components/studio/StudioStatusBar";
import { ShareRoom } from "@/components/ShareRoom";
import { RoomPasswordDialog } from "@/components/RoomPasswordDialog";
import { RoomSettingsDialog } from "@/components/RoomSettingsDialog";
import { RoomHistoryPanel } from "@/components/RoomHistoryPanel";
import { RoomAutosnapHost } from "@/components/RoomAutosnapHost";
import { RoomExpiredScreen } from "@/components/RoomExpiredScreen";
import { RoomAccessDenied } from "@/components/RoomAccessDenied";
import { VtToaster } from "@/components/VtToaster";
import { NamePicker } from "@/components/NamePicker";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { VimCheatsheetDialog } from "@/components/VimCheatsheetDialog";
import { StudioRoomChat, type StudioAiRunner } from "@/components/studio/StudioRoomChat";
import { StudioOutlinePanel } from "@/components/studio/StudioOutlinePanel";
import { StudioAiDiffBridge } from "@/components/studio/StudioAiDiffBridge";
import { SelectionActionBar } from "@/components/editor/SelectionActionBar";
import { StudioDiagnosticsBar } from "@/components/diagnostics/StudioDiagnosticsBar";
import { formatShortcut } from "@/components/ShortcutHint";
import { SafeSvg } from "@/components/SafeSvg";
import type { VimEditorHandle } from "@/components/VimEditor";
import {
  WorkspaceProvider,
  useWorkspaceController,
} from "@/components/workspace/WorkspaceContext";
import { AiReviewProvider } from "@/components/ai/AiReviewProvider";
import { AiPreviewReview } from "@/components/ai/AiPreviewReview";
import { useAiReview } from "@/components/ai/AiReviewProvider";
import { aiFeatureEnabled } from "@/lib/ai-features";
import { findEquationScope } from "@/lib/render-note";
import type { SelectionAiAction } from "@/lib/selection-ai-actions";
import { useAiChromePrefs } from "@/lib/use-ai-chrome-prefs";
import {
  createCollabUser,
  createRoomId,
  loadDisplayName,
  readRoomFromLocation,
  saveDisplayName,
  writeRoomToLocation,
} from "@/lib/collab";
import {
  readViewTokenFromLocation,
  resolveEditSecret,
  mintEditCapabilityForNewRoom,
} from "@/lib/room-auth";
import { useRoomGate } from "@/lib/use-room-gate";
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
import { openPreferences } from "@/lib/ui-events";
import { STARTER_NOTE } from "@/lib/starter-content";
import {
  buildTemplateDefaults,
  extractTemplateVariables,
  fillTemplateVariables,
  getTemplateById,
  makeTemplateId,
  saveCustomTemplate,
  type SessionTemplate,
} from "@/lib/templates";
import { useRecentRoomsTracker } from "@/lib/use-recent-rooms-tracker";
import { useShellShortcuts } from "@/lib/use-shell-shortcuts";
import type { UiVariant } from "@/lib/ui-variant";
import type {
  CollabStatus,
  CollabUser,
  NewRoomOptions,
  PeerInfo,
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
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<CollabUser | null>(null);
  const [needsName, setNeedsName] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [rightPanelView, setRightPanelView] = useState<"chat" | "history" | null>(
    null,
  );
  const [outlineOpen, setOutlineOpen] = useState(false);
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
  const [seed, setSeed] = useState<string | null>(STARTER_NOTE);
  const [relativeLineNumbers, setRelativeLineNumbers] = useState(true);
  const [viewToken, setViewToken] = useState<string | null>(null);
  const [editSecret, setEditSecret] = useState<string | null>(null);
  const [roomSettingsOpen, setRoomSettingsOpen] = useState(false);
  const [hasSelectionRange, setHasSelectionRange] = useState(false);
  const [hasEquationScope, setHasEquationScope] = useState(false);
  const editorRef = useRef<VimEditorHandle>(null);
  const aiRunnerRef = useRef<StudioAiRunner | null>(null);

  useEffect(() => {
    let cancelled = false;
    const existing = readRoomFromLocation();
    const room = existing ?? createRoomId();
    const createdHere = !existing;
    const view = readViewTokenFromLocation();
    setRoomId(room);
    setViewToken(view);

    const finish = (edit: string | null) => {
      if (cancelled) return;
      setEditSecret(edit);
      const storedMode = loadViewMode();
      if (storedMode != null) setViewMode(storedMode);

      const mode = loadEditorMode();
      setEditorMode(mode);

      const storedName = loadDisplayName();
      if (storedName) {
        setUser(createCollabUser({ name: storedName }));
        setNeedsName(false);
      } else if (mode === "standard") {
        setUser(createCollabUser());
        setNeedsName(false);
        if (!loadOnboardingSeen()) setOnboardingOpen(true);
      } else {
        setUser(createCollabUser());
        setNeedsName(true);
      }
      setRelativeLineNumbers(loadRelativeLineNumbers());
      setHydrated(true);
    };

    if (view) {
      writeRoomToLocation(room);
      finish(null);
    } else if (createdHere) {
      // Creator path: mint edit into the URL. Do not mint when opening an
      // existing bare ?room= (strip-view must stay denied).
      void mintEditCapabilityForNewRoom(room)
        .then(({ edit }) => finish(edit))
        .catch(() => {
          writeRoomToLocation(room);
          finish(null);
        });
    } else {
      writeRoomToLocation(room);
      finish(resolveEditSecret(room));
    }

    return () => {
      cancelled = true;
    };
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

  const startRoomWithContent = useCallback(
    (content: string, roomIdOverride?: string) => {
      const room = roomIdOverride ?? createRoomId();
      const createdHere = !roomIdOverride;
      writeRoomToLocation(room, { clearViewToken: true, clearEditSecret: true });
      setRoomId(room);
      setViewToken(null);
      setEditSecret(null);
      setNote("");
      setSeed(content || STARTER_NOTE);
      setRightPanelView(null);
      setCollabStatus("connecting");
      setPeers([]);
      setVimMode("normal");
      if (createdHere) {
        void mintEditCapabilityForNewRoom(room)
          .then(({ edit }) => setEditSecret(edit))
          .catch(() => setEditSecret(null));
      } else {
        setEditSecret(resolveEditSecret(room));
      }
      requestAnimationFrame(() => editorRef.current?.focus());
    },
    [],
  );

  const handleNewRoom = useCallback(
    (opts?: NewRoomOptions) => {
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
      startRoomWithContent(template?.content ?? "", opts?.roomId);
    },
    [user?.name, startRoomWithContent],
  );

  const handleTemplateSubmit = useCallback(
    (values: Record<string, string>) => {
      if (!templatePending) return;
      startRoomWithContent(fillTemplateVariables(templatePending.content, values));
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

  const { recentRooms, clear: clearTrackedRecentRooms } =
    useRecentRoomsTracker(roomId);

  const chatOpen = rightPanelView === "chat";
  const historyOpen = rightPanelView === "history";
  const rightPanelOpen = rightPanelView !== null;

  const closeRightPanel = useCallback(() => {
    setRightPanelView(null);
  }, []);

  const openChatPanel = useCallback(() => {
    setRightPanelView("chat");
  }, []);

  const openHistoryPanel = useCallback(() => {
    setRightPanelView("history");
  }, []);

  const toggleChat = useCallback(() => {
    setRightPanelView((view) => (view === "chat" ? null : "chat"));
  }, []);

  const toggleHistory = useCallback(() => {
    setRightPanelView((view) => (view === "history" ? null : "history"));
  }, []);

  useShellShortcuts({
    onTogglePalette: useCallback(() => setPaletteOpen((v) => !v), []),
    onToggleCheatsheet: useCallback(() => setCheatsheetOpen((v) => !v), []),
    onToggleChat: toggleChat,
    onToggleViewMode: useCallback(() => {
      setViewMode((prev) => (prev === "split" ? "realtime" : "split"));
    }, []),
  });

  const isSplit = viewMode === "split";
  const nameReady = hydrated && !!roomId && !!user && !needsName;
  const gate = useRoomGate(roomId, nameReady, {
    editSecret,
    viewToken,
  });
  const ready =
    nameReady &&
    gate.checked &&
    !gate.expired &&
    !gate.needsPassword &&
    !gate.needsShareLink;
  const namePickerOpen = needsName || editingName;

  const workspace = useWorkspaceController({
    enabled: ready,
    roomId,
    user,
    collaborationEnabled: true,
    viewToken,
    editSecret: viewToken ? null : editSecret,
    authToken: gate.authToken,
    emptyRoomSeed: seed,
    onTextChange: setNote,
    onCollabStatus: setCollabStatus,
    onPeersChange: setPeers,
  });

  const selfClientId = workspace?.getClientId() ?? null;
  const readOnly = Boolean(viewToken);
  const { prefs: chromePrefs } = useAiChromePrefs();

  const { layout: paneLayout, resizePane, resizeMobileBottom, resetPane } =
    usePaneLayout({
      open: {
        left: outlineOpen && aiFeatureEnabled("studio", "outlineTodo"),
        right: rightPanelOpen,
      },
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
        viewToken,
        authToken: gate.authToken,
      }}
    />
    <StudioAiDiffBridge editorRef={editorRef} />
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
          {roomId ? (
            <ShareRoom
              roomId={roomId}
              variant="studio"
              readOnly={readOnly}
              onEditSecret={setEditSecret}
              onOpenSettings={
                readOnly ? undefined : () => setRoomSettingsOpen(true)
              }
            />
          ) : null}
          {aiFeatureEnabled("studio", "outlineTodo") ? (
            <button
              type="button"
              aria-pressed={outlineOpen}
              aria-label={outlineOpen ? "Close outline" : "Open outline"}
              title={outlineOpen ? "Close outline" : "Document outline"}
              disabled={!ready}
              onClick={() => setOutlineOpen((v) => !v)}
              className={
                outlineOpen
                  ? "vt-pill vt-pill--solid vt-pill--icon"
                  : "vt-pill vt-pill--ghost vt-pill--icon"
              }
            >
              <OutlineIcon />
            </button>
          ) : null}
          <button
            type="button"
            aria-pressed={historyOpen}
            aria-label={historyOpen ? "Close version history" : "Open version history"}
            title={historyOpen ? "Close version history" : "Version history"}
            disabled={!ready || !roomId}
            onClick={toggleHistory}
            className={
              historyOpen
                ? "vt-pill vt-pill--solid vt-pill--icon"
                : "vt-pill vt-pill--ghost vt-pill--icon"
            }
          >
            <HistoryIcon />
          </button>
          <button
            type="button"
            aria-pressed={chatOpen}
            aria-label={chatOpen ? "Close chat" : "Open chat"}
            title={
              chatOpen
                ? `Close chat (${formatShortcut({ mod: true, shift: true, key: "C" })})`
                : `Room chat (${formatShortcut({ mod: true, shift: true, key: "C" })})`
            }
            disabled={!ready}
            onClick={toggleChat}
            className={
              chatOpen
                ? "vt-pill vt-pill--solid vt-pill--icon"
                : "vt-pill vt-pill--ghost vt-pill--icon"
            }
          >
            <ChatIcon />
          </button>
          <ViewToggle value={viewMode} onChange={handleViewMode} />
          <SnippetMenu
            disabled={!ready}
            triggerClassName="vt-pill vt-pill--ghost gap-1.5"
            labelClassName="hidden sm:inline"
            onInsert={(snippet) =>
              editorRef.current?.insertSnippet(snippet.snippet)
            }
          />
          <StudioMenu
            note={note}
            disabled={!ready}
            editorMode={editorMode}
            onEditorModeChange={handleEditorMode}
            uiVariant={uiVariant}
            onUiVariantChange={onUiVariantChange}
            onNewRoom={handleNewRoom}
            onOpenSheetPicker={() => setSheetPickerOpen(true)}
            recentRooms={recentRooms}
            onClearRecentRooms={clearTrackedRecentRooms}
            relativeLineNumbers={relativeLineNumbers}
            onRelativeLineNumbersChange={setRelativeLineNumbers}
          />
        </div>
      </header>

      <ReconnectBanner status={collabStatus} localBuffer={false} />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {aiFeatureEnabled("studio", "outlineTodo") ? (
          <SidePanel
            side="left"
            open={outlineOpen}
            width={paneLayout.left}
            ariaLabel="Document outline"
            surfaceClassName="vt-outline-pane"
            onResize={(delta) => resizePane("left", delta)}
            onReset={() => resetPane("left")}
          >
            <StudioOutlinePanel
              note={note}
              onClose={() => setOutlineOpen(false)}
              onJumpToLine={(line) => editorRef.current?.jumpToLine(line)}
            />
          </SidePanel>
        ) : null}

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
                ? "relative flex min-h-0 min-w-0 flex-1 flex-col border-b border-hairline md:border-b-0 md:border-r"
                : "relative flex h-full min-h-0 flex-col"
            }
          >
            <div className="relative min-h-0 min-w-0 flex-1">
              {ready && roomId && user ? (
                <VimEditor
                  key={`${roomId}-${editorMode}`}
                  ref={editorRef}
                  vimEnabled={editorMode === "vim"}
                  inlineMath={viewMode === "realtime"}
                  relativeLineNumbers={relativeLineNumbers}
                  showPlaceholder={false}
                ghostText={
                  !readOnly &&
                  aiFeatureEnabled("studio", "ghostText") &&
                  chromePrefs.ghostText
                }
                citeComplete={
                  !readOnly && aiFeatureEnabled("studio", "citeComplete")
                }
                aiDiff={
                  !readOnly && aiFeatureEnabled("studio", "diffAcceptReject")
                }
                onVimModeChange={setVimMode}
                  onSelectionRangeChange={({ hasRange, hasEquation }) => {
                    setHasSelectionRange(hasRange);
                    setHasEquationScope(hasEquation);
                  }}
                />
              ) : (
                <div className="flex h-full items-center px-4 font-mono text-xs uppercase tracking-[1.2px] text-mute sm:px-5">
                  {namePickerOpen ? "Enter a display name…" : "Preparing room…"}
                </div>
              )}
              {aiFeatureEnabled("studio", "selectionActions") &&
              !readOnly &&
              ready ? (
                <SelectionActionBar
                  visible={
                    hasSelectionRange ||
                    (aiFeatureEnabled("studio", "equationScopedAi") &&
                      hasEquationScope)
                  }
                  equationScoped={
                    aiFeatureEnabled("studio", "equationScopedAi") &&
                    hasEquationScope
                  }
                  showCoach={aiFeatureEnabled("studio", "derivationCoach")}
                  onAction={(action: SelectionAiAction) => {
                    const ctx = editorRef.current?.getEditorContext();
                    if (
                      aiFeatureEnabled("studio", "equationScopedAi") &&
                      (action.preferEquationScope || !ctx?.selection) &&
                      ctx
                    ) {
                      const scope = findEquationScope(
                        ctx.text,
                        ctx.selectionFrom,
                        ctx.selectionTo,
                      );
                      if (scope) {
                        editorRef.current?.selectRange(scope.from, scope.to);
                      }
                    }
                    openChatPanel();
                    // Let CM selection settle before packing AI context.
                    requestAnimationFrame(() => {
                      void aiRunnerRef.current?.runInstruction(
                        action.instruction,
                        {
                          // Short bubble label; full prompt stays in overrides.
                          chatText: action.label,
                          source: "selection",
                        },
                      );
                    });
                  }}
                />
              ) : null}
            </div>
            {ready && !readOnly ? (
              <StudioDiagnosticsBar
                note={note}
                canExplain={aiFeatureEnabled("studio", "diagnosticsExplain")}
                canFix={aiFeatureEnabled("studio", "diagnosticsFix")}
                onRun={(request) => {
                  openChatPanel();
                  void aiRunnerRef.current?.runInstruction(request.instruction, {
                    chatText: request.chatText,
                    attachment: request.attachment,
                    source: "diagnostics",
                  });
                }}
              />
            ) : null}
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
                <StudioPreviewPane note={note} />
              </section>
            </>
          ) : null}
        </main>

        {user ? (
          <SidePanel
            side="right"
            open={rightPanelOpen}
            keepMounted
            width={paneLayout.right}
            mobileHeight={paneLayout.mobileBottomHeight}
            ariaLabel={historyOpen ? "Version history" : "Room chat"}
            surfaceClassName="vt-chat-panel"
            onResize={(delta) => resizePane("right", delta)}
            onResizeMobile={(delta) => resizeMobileBottom(delta)}
            onReset={() => resetPane("right")}
            onResetMobile={() => resetPane("mobileBottomHeight")}
          >
            {rightPanelOpen && rightPanelView && roomId ? (
              <div
                key={rightPanelView}
                className="vt-right-panel-content flex h-full min-h-0 flex-col"
              >
                {rightPanelView === "history" ? (
                  <RoomHistoryPanel
                    roomId={roomId}
                    readOnly={readOnly}
                    onClose={closeRightPanel}
                    auth={{
                      editSecret,
                      viewToken,
                      authToken: gate.authToken,
                    }}
                  />
                ) : (
                  <StudioRoomChat
                    open
                    embedded
                    onClose={closeRightPanel}
                    peers={peers}
                    selfClientId={selfClientId}
                    user={user}
                    chatReady={ready}
                    getEditorContext={() =>
                      editorRef.current?.getEditorContext() ?? null
                    }
                    aiRunnerRef={aiRunnerRef}
                  />
                )}
              </div>
            ) : null}
          </SidePanel>
        ) : null}
      </div>

      <StudioStatusBar
        vimMode={editorMode === "standard" ? "standard" : vimMode}
        collabStatus={collabStatus}
        peers={peers}
        selfClientId={selfClientId}
        userName={user?.name ?? "…"}
        onEditName={user ? openNameEdit : undefined}
        onOpenCheatsheet={() => setCheatsheetOpen(true)}
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
        onOpenOnboarding={() => setOnboardingOpen(true)}
      />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        roomId={roomId}
        note={note}
        viewMode={viewMode}
        editorMode={editorMode}
        uiVariant={uiVariant}
        chatOpen={chatOpen}
        outlineOpen={outlineOpen}
        onNewRoom={handleNewRoom}
        onOpenSheetPicker={() => setSheetPickerOpen(true)}
        onViewModeChange={handleViewMode}
        onEditorModeChange={handleEditorMode}
        onUiVariantChange={onUiVariantChange}
        onToggleChat={toggleChat}
        onToggleOutline={() => setOutlineOpen((v) => !v)}
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

function StudioPreviewPane({ note }: { note: string }) {
  const review = useAiReview();
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

function vimModeLabel(mode: VimMode): string {
  const m = mode.toLowerCase();
  if (m.startsWith("vis")) return "VISUAL";
  if (m.startsWith("ins")) return "INSERT";
  if (m.startsWith("rep")) return "REPLACE";
  return "NORMAL";
}

function HistoryIcon() {
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
        d="M8 3.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M8 5.5V8l2 1.25M5.5 3 4 2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </SafeSvg>
  );
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

function OutlineIcon() {
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
        d="M3 4h10M3 8h7M3 12h8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </SafeSvg>
  );
}
