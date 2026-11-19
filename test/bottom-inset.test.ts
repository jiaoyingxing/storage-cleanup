import assert from "node:assert/strict";
import test from "node:test";
import { computeBottomInset } from "../src/view/bottom-inset";

const scroll = { top: 100, bottom: 800, height: 700 };

test("computeBottomInset falls back to the safe area when no bar overlaps", () => {
  assert.equal(computeBottomInset(scroll, [], 34), 34);
  assert.equal(
    computeBottomInset(
      scroll,
      [{ top: 820, bottom: 880, height: 60 }],
      34
    ),
    34
  );
});

test("computeBottomInset uses the deepest visible bar overlap", () => {
  const toolbar = { top: 720, bottom: 790, height: 70 };
  const navbar = { top: 748, bottom: 800, height: 52 };
  assert.equal(computeBottomInset(scroll, [toolbar], 0), 80);
  assert.equal(computeBottomInset(scroll, [toolbar, navbar], 0), 80);
  assert.equal(computeBottomInset(scroll, [navbar], 0), 52);
});

test("computeBottomInset ignores zero-height bars and never goes negative", () => {
  assert.equal(
    computeBottomInset(scroll, [{ top: 0, bottom: 0, height: 0 }], 0),
    0
  );
  assert.equal(
    computeBottomInset(scroll, [{ top: 900, bottom: 960, height: 60 }], 0),
    0
  );
});

test("computeBottomInset prefers a safe area larger than the measured bar", () => {
  const smallBar = { top: 780, bottom: 800, height: 20 };
  assert.equal(computeBottomInset(scroll, [smallBar], 34), 34);
});
