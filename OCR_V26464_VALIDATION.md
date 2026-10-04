# CROSS GPT OCR v2.64.64 validation

Base main: f124e2ea3c2998228e11b304c1f56c0a9412fbfd (v2.64.63).
Issue evidence: IMG_4623.jpeg screenshot, v2.64.63, two detected rows,
no editable measurement candidates, TrOCR unavailable, late 2/1 progress.
The screenshot is not the original source photo; no end-to-end recognition
benchmark against its thumbnail is claimed.

## Change
- Unresolved rows now serialize as explicit review placeholders (?×?).
- Parser retains one blank dimension/count row per unresolved source row.
- Conflicting numeric alternatives remain visible in the source text; none is
  chosen automatically. Review placeholders are unchecked and excluded from
  commit until the user supplies dimension/count and explicitly selects them.
- Review input edits clear stale values, maintain unknown-field flags, and
  refresh the commit button. Blank/invalid dimensions cannot be committed.
- Progress callbacks capture the current photo index and are closed after each
  photo. Late model loading events cannot replace the completed progress text.
- TrOCR failure messages are retained in opt-in developer diagnostics.
  No library/model version or confidence policy was changed.

## Executed verification
Regression: 248 PASS / 0 FAIL.
Endurance and fault injection: 12 PASS / 0 FAIL.
OCR: 149 PASS / 0 FAIL.
Total: 409 PASS / 0 FAIL.
Behavior cases include two unresolved rows, conflicting alternatives,
no invented row-index measurements, unchecked blank candidates, delayed
progress callbacks, stale input clearing, and TrOCR error retention.
Scriptable bundled HTML must byte-match the OCR page.

## Not verified
TrOCR failure root cause, recovery of that engine, real camera accuracy,
Paddle/TrOCR real models, new photo generalization, and iPhone/Android real
interaction remain unverified. Headless Chromium is not installed.
The actual dimension photo is required to reproduce the recognition failure.
This is a review/progress fix, not proof of improved OCR accuracy.
Actions and Render status require checking after the single publication commit.
