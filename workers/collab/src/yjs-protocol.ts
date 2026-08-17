import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

export const MESSAGE_SYNC = 0;
export const MESSAGE_AWARENESS = 1;

export type SocketRole = "edit" | "view" | "legacy";

export type SocketAttachment = {
  role: SocketRole;
  awarenessIds: number[];
};

export function createRoomDoc(): Y.Doc {
  return new Y.Doc({ gc: true });
}

export function applyStoredState(doc: Y.Doc, stored: Uint8Array | null): void {
  if (stored && stored.byteLength > 0) {
    Y.applyUpdate(doc, stored);
  }
}

export function encodeDoc(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

export function restoreCodemirror(doc: Y.Doc, text: string): void {
  const ytext = doc.getText("codemirror");
  doc.transact(() => {
    const len = ytext.length;
    if (len > 0) ytext.delete(0, len);
    if (text.length > 0) ytext.insert(0, text);
  }, "snapshot-restore");
}

export function decodeCodemirror(update: Uint8Array): string {
  const doc = new Y.Doc();
  try {
    Y.applyUpdate(doc, update);
    return doc.getText("codemirror").toString();
  } finally {
    doc.destroy();
  }
}

export function encodeCodemirror(text: string): Uint8Array {
  const doc = new Y.Doc();
  try {
    if (text.length > 0) doc.getText("codemirror").insert(0, text);
    return Y.encodeStateAsUpdate(doc);
  } finally {
    doc.destroy();
  }
}

export function handleIncoming(
  doc: Y.Doc,
  awareness: awarenessProtocol.Awareness,
  message: Uint8Array,
  role: SocketRole,
): Uint8Array | null {
  const encoder = encoding.createEncoder();
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);
  switch (messageType) {
    case MESSAGE_SYNC: {
      if (role === "view") {
        const syncType = decoding.readVarUint(decoder);
        if (syncType === syncProtocol.messageYjsSyncStep1) {
          encoding.writeVarUint(encoder, MESSAGE_SYNC);
          syncProtocol.writeSyncStep2(
            encoder,
            doc,
            decoding.readVarUint8Array(decoder),
          );
          if (encoding.length(encoder) > 1) {
            return encoding.toUint8Array(encoder);
          }
        }
        return null;
      }
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.readSyncMessage(decoder, encoder, doc, null);
      if (encoding.length(encoder) > 1) {
        return encoding.toUint8Array(encoder);
      }
      return null;
    }
    case MESSAGE_AWARENESS: {
      awarenessProtocol.applyAwarenessUpdate(
        awareness,
        decoding.readVarUint8Array(decoder),
        null,
      );
      return null;
    }
    default:
      return null;
  }
}

export function encodeSyncStep1(doc: Y.Doc): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);
  return encoding.toUint8Array(encoder);
}

export function encodeAwarenessStates(
  awareness: awarenessProtocol.Awareness,
): Uint8Array | null {
  const ids = Array.from(awareness.getStates().keys());
  if (ids.length === 0) return null;
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(awareness, ids),
  );
  return encoding.toUint8Array(encoder);
}

export function encodeDocUpdate(update: Uint8Array): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeUpdate(encoder, update);
  return encoding.toUint8Array(encoder);
}

export function encodeAwarenessUpdate(
  awareness: awarenessProtocol.Awareness,
  changedClients: number[],
): Uint8Array {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
  );
  return encoding.toUint8Array(encoder);
}
