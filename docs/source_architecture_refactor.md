# Source Architecture Refactor (Master + Per-Site Config)

This change introduces a shared **master polling processor** for DOM-based source integrations:

- Master module: `sources/source_common.js`
- Migrated sources: `sources/tango.js`, `sources/mage.js`, `sources/robotstreamer.js`, `sources/vaughn.js`, `sources/vpzone.js`, `sources/wtv.js`, and `sources/zora.js`

## Why

Instead of each `sources/*.js` re-implementing the same runtime loop (settings bridge, extension on/off state, polling, dedupe, focus handling, message push), sources can now:

1. Provide site configuration (selectors, poll interval, ignore lists, defaults)
2. Provide only site-specific parsing logic (`parseRow`)
3. Optionally add source-only custom behavior in that parser

## Master function contract

`window.SocialStreamSourceCommon.createPollingSource(config)`

### Required/Primary config keys
- `sourceType`
- `pollIntervalMs`
- `messageRowSelector`
- `parseRow(row, helpers)`

### Optional config keys
- `focusInputSelector`
- `ignoredEventMessages`
- `defaults`
- `maxSeenMessages`
- `keepSeenMessages`
- `normalizeMessage(message)`

### helpers passed to `parseRow`
- `escapeHtml()`
- `settings`
- `isIgnoredEventMessage()`
- `normalizeMessage()`
- `config`

## Migration pattern for other sources

For each `sources/<platform>.js` file:

1. Keep/define source constants and selectors
2. Call `createPollingSource({...})`
3. Move parser-specific code into `parseRow`
4. Remove duplicated runtime boilerplate from that file
5. Ensure `manifest.json` includes `./sources/source_common.js` before that source script

This provides a single place to improve common behavior while preserving per-site parsing flexibility.


## Original file backups

When a source file is recreated under the consolidated pattern, a copy of the pre-refactor file can be kept in `sources/orginal/` for reference.
