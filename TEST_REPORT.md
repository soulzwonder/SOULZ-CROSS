# TEST_REPORT

## 2026-10-04 - Privacy-safe access analytics v1

Automated validation is defined in `.github/workflows/croppy-qa.yml` and runs on the exact main commit.

Required checks:
- Existing regression and behavior QA
- Existing endurance/fault-injection QA
- Existing OCR structure QA
- Existing API health smoke test
- Analytics endpoint returns HTTP 204 for an allowed CROSS GPT origin
- Analytics endpoint rejects an unapproved origin with HTTP 403
- Application analytics log contains the hashed record
- Application analytics log must not contain the raw daily identifier, user-agent text, or localhost IP from the QA payload

The GitHub Actions run attached to the commit is the authoritative PASS/FAIL result. No test is to be reported as PASS before that run completes.

## Correction note

- Commit `5176b58328ae48d91eb6e4337cefd025f4c6206c` did not start jobs because the generated workflow YAML was corrupted by replacement-string handling of shell `$` sequences.
- The application analytics implementation itself was not the failure point.
- This follow-up restores the last known-good workflow and inserts the analytics smoke test using a replacement method that preserves shell syntax verbatim.

## Owner device exclusion test

Required automated checks:
- Settings contains the per-device analytics exclusion control.
- Client exposes the opt-out controller used by the settings control.
- Allowed origin can submit an anonymous `exclude` marker and receives HTTP 204.
- Raw daily ID / user-agent / localhost IP remain absent from application analytics logs.
- Existing regression, endurance, OCR and packaging checks must still pass.
