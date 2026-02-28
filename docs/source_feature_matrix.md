# Source Feature Matrix

This matrix is a quick static scan of `sources/*.js` to show which logic blocks each source appears to implement.

## Column definitions
- `chat_read`: file contains a `chatmessage` payload field.
- `chat_respond`: file contains chat reply hooks such as `focusChat` or `sendChat` handling.
- `chatbadges`: file contains a `chatbadges` payload field.
- `profile_image`: file contains a `chatimg` payload field.
- `timestamp`: file contains a `timestamp` payload field.
- `donations`: file contains donation/tip/superchat-related payload fields or parsing.
- `viewer_counts`: file contains viewer/watch count-related logic markers.
- `consolidated_with_source_common`: `yes` when the platform script is loaded with `sources/source_common.js` in `manifest.json`.

## Notes
- This is heuristic/static detection, not runtime validation.
- Consolidation status is derived from `manifest.json` script ordering.
- Some files are utility scripts (for example `autoreload.js`) and are expected to show `no` across most columns.
