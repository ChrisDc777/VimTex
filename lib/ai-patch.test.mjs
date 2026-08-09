import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyAiPatch,
  extractPatchBlock,
  parsePatchBody,
  PATCH_EDIT_END,
  PATCH_EDIT_START,
  PATCH_FIND,
  PATCH_THEN,
} from "./ai-patch.ts";

describe("ai-patch parse", () => {
  it("parses a single FIND/THEN hunk", () => {
    const body = `${PATCH_FIND}
alpha
${PATCH_THEN}
beta`;
    const proposal = parsePatchBody(body);
    assert.ok(proposal);
    assert.equal(proposal.hunks.length, 1);
    assert.equal(proposal.hunks[0].find, "alpha");
    assert.equal(proposal.hunks[0].then, "beta");
    assert.equal(proposal.hunks[0].id, "h0");
  });

  it("parses multi-hunk patches with multiline FIND", () => {
    const body = `${PATCH_FIND}
line one
line two
${PATCH_THEN}
ONE
TWO
${PATCH_FIND}
tail
${PATCH_THEN}
TAIL`;
    const proposal = parsePatchBody(body);
    assert.ok(proposal);
    assert.equal(proposal.hunks.length, 2);
    assert.equal(proposal.hunks[0].find, "line one\nline two");
    assert.equal(proposal.hunks[0].then, "ONE\nTWO");
    assert.equal(proposal.hunks[1].find, "tail");
    assert.equal(proposal.hunks[1].then, "TAIL");
  });

  it("rejects empty FIND", () => {
    const body = `${PATCH_FIND}
${PATCH_THEN}
x`;
    assert.equal(parsePatchBody(body), null);
  });

  it("extracts patch block from assistant text", () => {
    const raw = `Done.
${PATCH_EDIT_START}
${PATCH_FIND}
a
${PATCH_THEN}
b
${PATCH_EDIT_END}
`;
    const block = extractPatchBlock(raw);
    assert.ok(block);
    assert.equal(block.before.trim(), "Done.");
    assert.match(block.body, /@@@FIND/);
  });
});

describe("ai-patch apply", () => {
  it("applies a unique FIND replacement", () => {
    const doc = "hello world\n";
    const result = applyAiPatch(doc, {
      hunks: [{ id: "h0", find: "world", then: "VimTex" }],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.after, "hello VimTex\n");
      assert.equal(result.hunks[0].applied, true);
      assert.equal(result.hunks[0].startOffset, 6);
    }
  });

  it("applies multiple independent hunks", () => {
    const doc = "aaa\nbbb\nccc\n";
    const result = applyAiPatch(doc, {
      hunks: [
        { id: "h0", find: "aaa", then: "AAA" },
        { id: "h1", find: "ccc", then: "CCC" },
      ],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.after, "AAA\nbbb\nCCC\n");
      assert.equal(result.hunks.filter((h) => h.applied).length, 2);
    }
  });

  it("skips missing FIND but still applies later hunks", () => {
    const doc = "keep\nme\n";
    const result = applyAiPatch(doc, {
      hunks: [
        { id: "h0", find: "missing", then: "x" },
        { id: "h1", find: "me", then: "you" },
      ],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.after, "keep\nyou\n");
      assert.equal(result.hunks[0].applied, false);
      assert.equal(result.hunks[1].applied, true);
    }
  });

  it("rejects ambiguous FIND", () => {
    const doc = "xx xx";
    const result = applyAiPatch(doc, {
      hunks: [{ id: "h0", find: "xx", then: "y" }],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /more than once/);
    }
  });

  it("allows empty THEN (delete)", () => {
    const doc = "before\nDELETE ME\nafter";
    const result = applyAiPatch(doc, {
      hunks: [{ id: "h0", find: "\nDELETE ME", then: "" }],
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.after, "before\nafter");
  });

  it("end-to-end: extract + parse + apply multi-hunk", () => {
    const doc = "Title\nE = mc^2\nThanks\n";
    const raw = `Fixed notation.
${PATCH_EDIT_START}
${PATCH_FIND}
E = mc^2
${PATCH_THEN}
E = mc^{2}
${PATCH_FIND}
Thanks
${PATCH_THEN}
Thank you
${PATCH_EDIT_END}`;
    const block = extractPatchBlock(raw);
    assert.ok(block);
    const proposal = parsePatchBody(block.body);
    assert.ok(proposal);
    const result = applyAiPatch(doc, proposal);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.after, "Title\nE = mc^{2}\nThank you\n");
      assert.equal(result.hunks.length, 2);
    }
  });
});
