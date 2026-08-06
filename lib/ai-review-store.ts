/**
 * Client-local source of truth for AI document proposals (#27 / review UX).
 * Not synced via Yjs — Accept is proposer-only until peer-aware apply lands.
 */

export type AiEditSource = "chat" | "selection" | "slash" | "diagnostics";

export type PendingAiEdit = {
  messageId: string;
  before: string;
  after: string;
  source: AiEditSource;
  createdAt: number;
};

export type AiEditOutcome = "accepted" | "rejected" | "auto";

export type AiReviewSnapshot = {
  pending: PendingAiEdit | null;
  outcomes: Record<string, AiEditOutcome>;
  /** Last auto-applied edit available for Undo. */
  lastAuto: PendingAiEdit | null;
};

type Listener = () => void;

export class AiReviewStore {
  private pending: PendingAiEdit | null = null;
  private outcomes: Record<string, AiEditOutcome> = {};
  private lastAuto: PendingAiEdit | null = null;
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): AiReviewSnapshot {
    return {
      pending: this.pending,
      outcomes: this.outcomes,
      lastAuto: this.lastAuto,
    };
  }

  getPending(): PendingAiEdit | null {
    return this.pending;
  }

  hasPending(): boolean {
    return this.pending != null;
  }

  setPending(edit: PendingAiEdit): void {
    this.pending = edit;
    this.emit();
  }

  clearPending(): void {
    if (this.pending == null) return;
    this.pending = null;
    this.emit();
  }

  markOutcome(messageId: string, outcome: AiEditOutcome): void {
    this.outcomes = { ...this.outcomes, [messageId]: outcome };
    this.emit();
  }

  /** After auto-apply: clear pending, record outcome, keep undo buffer. */
  commitAuto(edit: PendingAiEdit): void {
    this.pending = null;
    this.lastAuto = edit;
    this.outcomes = { ...this.outcomes, [edit.messageId]: "auto" };
    this.emit();
  }

  /** After confirm Accept. */
  commitAccepted(messageId: string): void {
    this.pending = null;
    this.lastAuto = null;
    this.outcomes = { ...this.outcomes, [messageId]: "accepted" };
    this.emit();
  }

  /** After Reject. */
  commitRejected(messageId: string): void {
    this.pending = null;
    this.outcomes = { ...this.outcomes, [messageId]: "rejected" };
    this.emit();
  }

  takeLastAuto(): PendingAiEdit | null {
    const edit = this.lastAuto;
    this.lastAuto = null;
    if (edit) this.emit();
    return edit;
  }

  clearLastAuto(): void {
    if (this.lastAuto == null) return;
    this.lastAuto = null;
    this.emit();
  }

  /** Reset when room / workspace changes. */
  reset(): void {
    this.pending = null;
    this.outcomes = {};
    this.lastAuto = null;
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
