"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { LatexPreview } from "@/components/LatexPreview";
import { StatusBar } from "@/components/StatusBar";
import { NamePicker } from "@/components/NamePicker";
import { ProblemReferencePanel } from "@/components/ProblemReferencePanel";
import { RoomChatSidebar } from "@/components/RoomChatSidebar";
import { SidePanel } from "@/components/SidePanel";
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
  createRoomId,
  loadDisplayName,
  readRoomFromLocation,
  saveDisplayName,
  writeRoomToLocation,
} from "@/lib/collab";
import { loadNote, saveNote } from "@/lib/storage";
import { usePaneLayout } from "@/lib/use-pane-layout";
import type { CollabStatus, CollabUser, VimMode } from "@/lib/types";

const VimEditor = dynamic(
  () => import("@/components/VimEditor").then((m) => m.VimEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center px-4 font-mono text-xs uppercase tracking-[1.2px] text-mute sm:px-5">
        Opening sheet…
      </div>
    ),
  },
);

type RightPanelView = "preview" | "chat";

export default function HomePage() {
  const [note, setNote] = useState("");
  const [vimMode, setVimMode] = useState<VimMode>("normal");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [localSeed, setLocalSeed] = useState<string | null>(null);
  const [collabStatus, setCollabStatus] =
    useState<CollabStatus>("connecting");
  const [peerCount, setPeerCount] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<CollabUser | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelView, setRightPanelView] =
    useState<RightPanelView | null>(null);
  const editorRef = useRef<VimEditorHandle>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const referenceOpen = leftPanelOpen;
  const previewOpen = rightPanelView === "preview";
  const chatOpen = rightPanelView === "chat";
  const rightPanelOpen = rightPanelView !== null;

  const { layout, resizePane, resizeMobileBottom, resetPane } = usePaneLayout({
    open: {
      left: leftPanelOpen,
      right: rightPanelOpen,
    },
  });

  useEffect(() => {
    try {
      const existing = readRoomFromLocation();
      const room = existing ?? createRoomId();
      writeRoomToLocation(room);
      setRoomId(room);
      setLocalSeed(loadNote(room));

      const storedName = loadDisplayName();
      setUser(
        createCollabUser(
          storedName ? { name: storedName } : undefined,
        ),
      );
    } catch {
      const room = createRoomId();
      setRoomId(room);
      setUser(createCollabUser());
    } finally {
      setHydrated(true);
    }
  }, []);

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

  const focusEditor = useCallback(() => {
    requestAnimationFrame(() => editorRef.current?.focus());
  }, []);

  const togglePreview = useCallback(() => {
    setRightPanelView((view) => {
      if (view === "preview") {
        focusEditor();
        return null;
      }
      return "preview";
    });
  }, [focusEditor]);

  const toggleReference = useCallback(() => {
    setLeftPanelOpen((open) => {
      const next = !open;
      if (!next) focusEditor();
      return next;
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
    const newRoom = createRoomId();
    writeRoomToLocation(newRoom);
    setNote("");
    setLocalSeed(null);
    setLeftPanelOpen(false);
    setRightPanelView(null);
    setRoomId(newRoom);
    focusEditor();
  }, [focusEditor]);

  const ready = hydrated && !!roomId && !!user;

  return (
    <div className="app-shell flex h-dvh flex-col text-ink">
      <AppHeader
        ready={ready}
        roomId={roomId}
        note={note}
        onNewSheet={handleNewSheet}
      />

      <div className="vt-workspace flex min-h-0 flex-1">
        <SidePanelRail side="left" label="Left panels" disabled={!ready}>
          <SidePanelRailButton
            label="Problem"
            pressed={referenceOpen}
            disabled={!ready}
            onClick={toggleReference}
            icon={<ReferenceIcon />}
          />
        </SidePanelRail>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
          <SidePanel
            side="left"
            open={leftPanelOpen}
            width={layout.left}
            ariaLabel="Problem reference"
            surfaceClassName="vt-pane-reference"
            onResize={(delta) => resizePane("left", delta)}
            onReset={() => resetPane("left")}
          >
            {roomId ? (
              <ProblemReferencePanel open={leftPanelOpen} roomId={roomId} />
            ) : null}
          </SidePanel>

          <main className="min-h-0 min-w-0 flex-1">
            <section className="vt-pane h-full min-h-0">
              {ready ? (
                <VimEditor
                  ref={editorRef}
                  roomId={roomId}
                  user={user}
                  localSeed={localSeed}
                  onChange={setNote}
                  onVimModeChange={setVimMode}
                  onCollabStatus={setCollabStatus}
                  onPeerCount={setPeerCount}
                />
              ) : (
                <div className="flex h-full items-center px-4 font-mono text-xs uppercase tracking-[1.2px] text-mute sm:px-5">
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
              rightPanelView === "chat" ? "Room chat" : "Rendered preview"
            }
            surfaceClassName={
              rightPanelView === "chat"
                ? "vt-chat-panel vt-chat-panel--desktop bg-canvas/95 backdrop-blur-sm"
                : "vt-pane-preview"
            }
            onResize={(delta) => resizePane("right", delta)}
            onResizeMobile={(delta) => resizeMobileBottom(delta)}
            onReset={() => resetPane("right")}
            onResetMobile={() => resetPane("mobileBottomHeight")}
          >
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

        <SidePanelRail side="right" label="Right panels" disabled={!ready}>
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

      <StatusBar
        vimMode={vimMode}
        collabStatus={collabStatus}
        peerCount={peerCount}
        userName={user?.name ?? "…"}
        onEditName={user ? openNameEdit : undefined}
      />

      <NamePicker
        open={hydrated && editingName}
        initialName={user?.name ?? ""}
        onSubmit={handleNameSubmit}
        allowSkip
        onCancel={() => setEditingName(false)}
      />
    </div>
  );
}
