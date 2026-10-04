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
