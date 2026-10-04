# CHANGELOG

## 2026-10-04 - Privacy-safe access analytics v1

- Added anonymous access telemetry for the CROSS GPT / クロッピー web app.
- Records only app open, coarse device class (iOS / Android / desktop / other), PWA vs browser, JST day, and a hashed random daily identifier.
- Does not send or log job-site names, room names, dimensions, product codes, memo contents, photos, precise location, IP address, or full user-agent in application analytics.
- Uses the existing Render service only. No paid or metered analytics provider was added.
- Added CORS/origin validation, payload size/allow-list validation, no-store responses, and QA coverage.
- Rollback point: branch `backup/pre-analytics-20261004-e234f5f`.

### QA workflow correction

- Restored the previously successful QA workflow after detecting YAML corruption in the first analytics commit.
- No calculation, OCR, saved-data, or UI behavior was changed by the correction.
