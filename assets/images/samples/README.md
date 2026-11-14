# Sample-gallery previews

These 1008-by-567 PNG sources were captured from the public destinations listed in `content/samples` on 2026-11-14. Captures are cropped to the browser's actual content area, excluding unused screenshot-canvas space. GitHub previews show public repository or wiki content, not account navigation.

The sample record's `image` points to its source here. The shared resource-image partial generates 480- and 960-pixel JPEG variants with explicit dimensions, responsive `sizes`, lazy loading, and asynchronous decoding. Source PNGs retain readable text for future processing; the originals are not sent as the card image.

Sample records use:

- `title`: the visible card heading.
- `description`: a short, outcome-focused summary.
- `externalLink`: the canonical destination requested for the card.
- `image`: the matching preview source.
- `weight`: editorial order within Samples & Solutions.
- `status: coming-soon`: an explicit availability label when requested.

Extensions also supports editorial weights, with SharePoint Framework Toolkit first. Other resource sections retain their alphabetical order. HTML, structured data, and the generated agent index share one ordering helper.

Power Platform Snippets is released and no longer has an availability label.

CAT Agent Skills is intentionally the last sample resource, with weight `1000`. Insert other additions before that weight so the final position stays consistent in HTML, structured data, and the agent index.
