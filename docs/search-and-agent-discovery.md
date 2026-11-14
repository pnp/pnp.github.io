# Search and agent discovery

The portal remains a Hugo site. Search and agent discovery use the same visible content, links, and publication data as the human experience. There are no hidden keywords, fabricated ratings, invented event dates, or ranking guarantees.

## Content and publishing

- The homepage is the canonical community directory. Its existing section anchors remain stable.
- The `content/home` pages are composition inputs, not separate public landing pages. Their build cascade retains local page lists while disabling standalone output.
- Demo posts, test calendars, temporary hiatus pages, and generated taxonomies use `noindex` and are excluded from the sitemap. Existing demo and test URLs remain available.
- Meaningful pages receive page-specific titles, descriptions, canonical URLs, one set of Open Graph and Twitter tags, and a raster social image.
- `content/_index.md` records the last significant editorial update. Update `lastmod` when changing the homepage's primary content. Blog snapshot timestamps advance only when the imported articles change, not on every build.

## Blog and calendar

`data/blog.json` records the authoritative RSS URL and four recent articles. The build refreshes this snapshot before rendering, so the article titles, links, authors, excerpts, and publication dates are present in the initial HTML.

The browser refreshes the same list from RSS and updates its structured data at the same time. A failed live refresh keeps the server-rendered articles and displays an explicit status message. A failed build refresh stops deployment rather than silently publishing a failed refresh.

The existing online calendar behavior is unchanged. `calendar.ics` and `ical/calendar.json` remain discoverable. Recurring calls are described as event series; no dated rich-result claims are invented from recurrence text or a stale local calendar.

## Structured data and agents

The homepage publishes linked `Organization`, `WebSite`, `CollectionPage`, resource `ItemList`, and blog records derived from the same content as the rendered page. Coordinator records use structured organizations for affiliations and do not turn MVP recognition into an employment title.

`llms.txt` is a build-generated navigation index for systems that choose to use it. It is optional discovery assistance, **not a Google ranking signal** and not a substitute for crawlable HTML. See [Google's AI optimization guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).

Production retains the existing open crawl policy, including search crawlers. Non-production builds are blocked in `robots.txt` and marked `noindex`. This does not introduce new training opt-ins or alter the existing production crawler policy. See [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots).

## Branding

`assets/images/parker.png` is the browser-tab artwork. Hugo creates fingerprinted PNG, touch, and app-icon variants. `static/favicon.ico` is the legacy fallback.

`assets/images/community-social.png` is the 1200-by-630 sharing preview. Refresh it when the hero presentation materially changes. Generated image caches under `resources/_gen/images` are not committed.

`assets/images/badge-contributor.png` is the supplied contributor-badge source. The recognition promo serves responsive, reduced-size PNGs and links to participation guidance and recognition criteria without promising automatic awards.

Resource screenshots under `assets/images/samples`, `guidance`, `sdks`, `tools`, `extensions`, and `forums` use one responsive preview partial. A shared clockwise CSS angle and close crop match the existing Forums previews while keeping card text, human portraits, and badge art undistorted. The crop is intentional and remains static for reduced-motion users; older Forums artwork directly under `static/images` already contains its angle and is not transformed again.

Resource previews were captured from their public destinations on 2026-11-14. Marketplace captures focus on product content without cookie banners. The Microsoft Graph SDK and PowerShell references use their current Microsoft Learn overviews; PnP PowerShell uses its documentation site.

The Fluent UI SDK card links to its GitHub repository, with a preview from the React Storybook. The existing Microsoft 365 Agents Toolkit extension card links to its official overview rather than introducing a duplicate product card. Work IQ Dev Tools is explicitly described as preview tooling with an alpha plugin interface.

Samples and Extensions use editorial weights through the shared resource-pages partial. CAT Agent Skills stays last in Samples; SharePoint Framework Toolkit is first in Extensions. Other categories remain alphabetical.

## Local validation

From the repository root in PowerShell:

```powershell
Push-Location .github\scripts
npm ci
npm run refresh:blog
Pop-Location
hugo --environment production --cleanDestinationDir
Push-Location .github\scripts
npm run test:site
Pop-Location
```

To validate an isolated build, set `HUGO_OUTPUT_DIR` to its absolute output path before running `npm run test:site`.

If newly created resource cards are missing during local editing, restart the Hugo server and reload the browser. Incremental previews can retain stale collection lists; confirm that the fresh local preview matches the production build before requesting review.

The tests validate indexable HTML, canonical and social metadata, visible/schema consistency, retained anchors, server-rendered posts, sitemap exclusions, calendar discovery, icon dimensions, recognition links, resource lists, and responsive image budgets. RSS tests cover repeated descriptions, escaping, invalid publication dates, and unsafe links. The deployment workflow runs these checks before publishing.

## After publishing

Use Search Console and Bing Webmaster Tools to submit and inspect the sitemap, verify the homepage's rendered content, and monitor crawl/indexing and search performance. Google's Rich Results Test can check supported structured-data eligibility, but collection markup does not promise a special rich result. Measure genuine engagement and continue publishing original, useful community content.
