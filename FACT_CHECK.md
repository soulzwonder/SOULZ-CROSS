# FACT_CHECK

## 2026-10-04 - Access analytics

### Confirmed design facts

- Analytics provider: none. The existing `croppy-counter` Render service receives the event.
- Additional paid API/service: none.
- Event collected: `open` only.
- Device value: coarse class only (`ios`, `android`, `desktop`, `other`).
- Display mode: `pwa` or `browser`.
- User identifier: random daily browser identifier; the server logs only a SHA-256-derived 16-hex prefix.
- Identifier rotation: once per JST date on the client.
- Referrer: explicitly suppressed for the analytics request.
- Credentials/cookies: omitted by the analytics request.
- Payload cap: 4 KiB.
- Accepted web origins: only the existing CROSS GPT Render origins.
- Application analytics intentionally does not record user-entered work data, photos, exact location, names, product codes, IP address, or full user-agent.
- Render/infrastructure may still maintain its own platform-level operational metadata outside this application log. This change does not claim to alter Render's infrastructure logging.
- Analytics availability is best-effort. Offline launches are not transmitted until a future online page load; no offline event queue was added to avoid changing app data behavior.
