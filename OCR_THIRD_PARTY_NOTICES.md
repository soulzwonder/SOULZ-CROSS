# OCR third-party notices

## Guten OCR

CROSS GPT OCR v2.64.59 and later adapt a small part of the geometry strategy used by
Guten OCR for OCR fallback cropping: expanding a detected text region using an
area/perimeter-derived distance before re-recognition, plus a conservative
recognition-score gate.

Upstream project: Guten OCR
Repository: https://github.com/gutenye/ocr
Upstream commit reviewed: b00d56c95a268bafd719c39eb22fbfb2d2a92a35
Copyright © 2024 Guten Ye
License: MIT

The adapted CROSS GPT implementation is rewritten for the existing browser-only
CROPPY OCR pipeline and does not copy the full Guten OCR runtime or its models.

### MIT License

Copyright © 2024 Guten Ye

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Transformers.js / TrOCR runtime and model status

CROPPY OCR uses Transformers.js in the browser for the optional TrOCR fallback.
Transformers.js is distributed under the Apache License 2.0.

Runtime packages currently referenced by the OCR page:
- @xenova/transformers 2.15.1 on iOS compatibility path
- @huggingface/transformers 3.8.1 on the non-iOS path

Fallback model: Xenova/trocr-small-handwritten, an ONNX conversion of
microsoft/trocr-small-handwritten.

IMPORTANT COMMERCIAL-RELEASE NOTE:
As checked on 2026-10-05, the upstream microsoft/trocr-small-handwritten model
card does not state an explicit license, and a Hugging Face community discussion
specifically asks Microsoft/Hugging Face to clarify the missing license. Therefore
CROPPY must not treat this model as commercially cleared merely because the
Transformers.js runtime is Apache-2.0. Resolve or replace this model before a
commercial App Store release that depends on TrOCR.

Reference model with explicit MIT metadata considered for future evaluation:
microsoft/trocr-base-handwritten. Do not substitute it automatically because its
runtime size/performance characteristics differ and require iPhone memory testing.
