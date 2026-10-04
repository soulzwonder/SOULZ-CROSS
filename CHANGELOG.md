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

## 2026-10-04 - Owner device analytics exclusion

- Added a per-device "自分のアクセスを集計しない" switch under Settings > アプリ.
- When enabled, future opens from that browser/PWA storage are not sent to analytics.
- Enabling it also sends a privacy-safe `exclude` marker using the same anonymous daily ID so that today's earlier opens from that same storage can be ignored when reports are calculated.
- Other users remain counted normally.
- No IP-based, account-based, location-based, or fingerprint-based owner detection was added.
- Rollback point: `backup/pre-owner-analytics-exclusion-20261004-4f97433`.
