export interface InsetRect {
  top: number;
  bottom: number;
  height: number;
}

/**
 * Bottom reserve for content that must stay above the host's mobile bottom
 * bar(s). Measures how much of the scroll viewport each visible bar covers,
 * then falls back to the safe-area inset when no bar overlaps.
 */
export function computeBottomInset(
  scrollRect: InsetRect,
  barRects: InsetRect[],
  safeArea: number
): number {
  let overlap = 0;
  for (const rect of barRects) {
    if (rect.height <= 0) continue;
    overlap = Math.max(overlap, scrollRect.bottom - rect.top);
  }
  return Math.max(0, Math.round(Math.max(overlap, safeArea)));
}
