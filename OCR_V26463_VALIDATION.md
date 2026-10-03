# CROSS GPT OCR v2.64.63 validation

Base: main 10756b32eff54138a2306c2bbba44147bbcbb92d (v2.64.62).
Stable protected: release-v1.0-stable de757fd6726522b1e04be574a8da748779d0240e.

## Change
Expanded main-number crops now erase detected components that do not belong to
that main number. This prevents separated divider/count ink and neighboring rows
from re-entering the fallback crop. Original main component pixels and unassigned
recovery pixels are retained. Normal crops, shape classifier, row splitting,
confidence policy, rightSuspicious, calculation and storage are unchanged.

Opt-in developer diagnostics: ?ocr-debug=1, window.__croppyOCRDebugV26463.
The latest photo's row blobs, shape features, normal/expanded engine picks and
final decisions stay in browser memory only. No automatic upload or persistence.
No additional OCR dependencies or paid APIs were added.

## Executed checks
- Regression: 248 PASS / 0 FAIL.
- Endurance / fault injection: 12 PASS / 0 FAIL.
- OCR structure / behavior: 141 PASS / 0 FAIL.
- Total automated QA: 401 PASS / 0 FAIL.
- Local server /health: ok.
- Original IMG_4591.jpeg: native Canvas pixel pipeline at 1800px read main shapes
  160, 35, 53, 236, 215, 182. All six retained every main-number pixel.
- For 35, 898 detected non-main pixels were removed from the expanded source;
  neighboring-row components were also removed. The 236 row remained
  rightSuspicious=true; existing QA verifies 236×? review behavior.
- At 1200px and 2400px the original photo's 35 shape remained 35.
- Local CLI Tesseract --psm 7 (different runtime from the app): normal crop=3,
  old expanded crop=3, corrected expanded crop=3. This is NOT evidence of an
  end-to-end accuracy improvement. Engine disagreement remains reviewable.

## Limitations / remaining verification
Paddle and TrOCR real-model comparison, iPhone/Android tap and camera behavior,
memory usage, and new-photo generalization have NOT been verified.
Headless browser verification could not run because Chromium is absent.
A chart screenshot containing axes/grid is not equivalent to the original photo;
its segmentation was unreliable at some scales. Do not use it as a passing
benchmark or broaden digit rules to force that one chart to pass.
A trial component-cap joining rule increased misreads and was reverted.
GitHub Actions and Render live status must be verified after the single commit.
