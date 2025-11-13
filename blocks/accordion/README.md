## Overview
The Accordion block provides collapsible sections for displaying grouped content interactively.

## Configuration Options
- **title**: String — Title of each accordion item.
- **content**: HTML/String — Content shown when expanded.
- **defaultOpen**: Boolean — Whether the accordion starts open.

## Integration Details
- **Events:**
  - `accordion:toggle` — Fired when a section is expanded or collapsed.
- **LocalStorage:** None by default.
- **URL Parameters:** None by default.

## Behavior
- Clicking the header toggles visibility of the content.
- Only one section can be open at a time (if configured).

## Error Handling
- If invalid configuration is passed, the block gracefully falls back to default behavior.