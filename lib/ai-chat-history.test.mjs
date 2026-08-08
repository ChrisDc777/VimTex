import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAiHistoryFromRoomChat,
  trimAiHistory,
} from "./ai-chat-history.ts";

test("trimAiHistory keeps newest within message budget", () => {
  const out = trimAiHistory(
    [
      { role: "user", content: "a" },
      { role: "assistant", content: "b" },
      { role: "user", content: "c" },
      { role: "assistant", content: "d" },
    ],
    { maxMessages: 2, maxChars: 10_000 },
  );
  assert.deepEqual(out, [
    { role: "user", content: "c" },
    { role: "assistant", content: "d" },
  ]);
});

test("trimAiHistory drops oldest to fit char budget", () => {
  const out = trimAiHistory(
    [
      { role: "user", content: "AAAA" },
      { role: "assistant", content: "BBBB" },
      { role: "user", content: "CC" },
    ],
    { maxMessages: 10, maxChars: 6 },
  );
  assert.deepEqual(out, [
    { role: "assistant", content: "BBBB" },
    { role: "user", content: "CC" },
  ]);
});

test("buildAiHistoryFromRoomChat skips peer chat and current turn", () => {
  const msgs = [
    {
      id: "1",
      clientId: 1,
      authorName: "A",
      authorColor: "#000",
      role: "user",
      text: "hey team",
      mentionAi: false,
      createdAt: 1,
    },
    {
      id: "2",
      clientId: 1,
      authorName: "A",
      authorColor: "#000",
      role: "user",
      text: "@vimothy what is pi?",
      mentionAi: true,
      createdAt: 2,
    },
    {
      id: "3",
      clientId: 1,
      authorName: "Vimothy",
      authorColor: "#000",
      role: "ai",
      text: "About 3.14",
      mentionAi: false,
      createdAt: 3,
    },
    {
      id: "4",
      clientId: 1,
      authorName: "A",
      authorColor: "#000",
      role: "user",
      text: "@vimothy make it shorter",
      mentionAi: true,
      createdAt: 4,
    },
  ];

  const hist = buildAiHistoryFromRoomChat(msgs, { beforeMessageId: "4" });
  assert.deepEqual(hist, [
    { role: "user", content: "what is pi?" },
    { role: "assistant", content: "About 3.14" },
  ]);
});
