const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { decodeHTML } = require('entities');
const { XMLParser } = require('fast-xml-parser');
const { HtmlValidate, Parser } = require('html-validate');

const output = path.resolve(process.env.HUGO_OUTPUT_DIR || path.join(__dirname, '../../public'));
const validator = new HtmlValidate({
    extends: ['html-validate:standard', 'html-validate:document'],
    rules: {
        // Same-origin theme assets do not need SRI for HTML or crawl conformance.
        'require-sri': 'off',
        'no-dup-id': 'error',
        'no-multiple-main': 'error',
        'element-permitted-content': 'error',
        'element-permitted-parent': 'error',
        'element-permitted-order': 'error',
        'element-permitted-occurrences': 'error',
        'element-required-content': 'error',
        'element-required-attributes': 'error'
    }
});

const attribute = (node, name) => {
    assert.ok(node, `Missing element for attribute ${name}`);
    const value = node.getAttributeValue(name);
    return value === null ? null : decodeHTML(value);
};
const text = node => decodeHTML(node.textContent).replace(/\s+/g, ' ').trim();
const read = filename => fs.readFileSync(path.join(output, filename), 'utf8');
const parse = async filename => {
    const config = await validator.getConfigFor(path.join(output, filename));
    return new Parser(config).parseHtml({ data: read(filename), filename });
};
const asset = url => {
    const pathname = decodeURIComponent(new URL(url, 'https://pnp.github.io/').pathname);
    const filename = path.resolve(output, `.${pathname}`);
    assert.ok(filename.startsWith(`${output}${path.sep}`), `Asset is outside the site: ${url}`);
    assert.ok(fs.existsSync(filename), `Published asset is missing: ${url}`);
    return fs.readFileSync(filename);
};
const pngSize = bytes => {
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
};
const sitemap = () => new XMLParser({
    isArray: (name, location) => location === 'urlset.url'
}).parse(read('sitemap.xml')).urlset.url;

test('indexable pages have valid HTML, unique metadata and matching canonical/social URLs', async () => {
    const pages = sitemap();
    assert.ok(pages.some(page => page.loc === 'https://pnp.github.io/'));
    for (const page of pages) {
        const pathname = new URL(page.loc).pathname;
        const filename = path.join(`.${pathname}`, 'index.html');
        const report = await validator.validateFile(path.join(output, filename));
        assert.equal(report.valid, true, JSON.stringify(report.results.map(result => ({
            filePath: result.filePath,
            messages: result.messages
        })), null, 2));
        const document = await parse(filename);
        assert.equal(document.querySelectorAll('html').length, 1);
        assert.equal(document.querySelectorAll('body').length, 1);
        assert.equal(document.querySelectorAll('main').length, 1);
        assert.equal(document.querySelectorAll('main h1').length, 1);
        assert.equal(document.querySelectorAll('meta[charset]').length, 1);
        assert.equal(attribute(document.querySelector('html'), 'lang'), 'en-us');
        assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1);
        assert.equal(attribute(document.querySelector('link[rel="canonical"]'), 'href'), page.loc);
        assert.equal(attribute(document.querySelector('meta[property="og:url"]'), 'content'), page.loc);
        for (const name of ['description', 'robots', 'viewport', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
            assert.equal(document.querySelectorAll(`meta[name="${name}"]`).length, 1, `${filename}: ${name}`);
        }
        for (const property of ['og:title', 'og:description', 'og:image', 'og:type', 'og:url']) {
            assert.equal(document.querySelectorAll(`meta[property="${property}"]`).length, 1, `${filename}: ${property}`);
        }
        const title = text(document.querySelector('title'));
        const description = attribute(document.querySelector('meta[name="description"]'), 'content');
        assert.ok(title && description.length > 20 && description.length <= 160);
        assert.equal(attribute(document.querySelector('meta[property="og:title"]'), 'content'), title);
        assert.equal(attribute(document.querySelector('meta[name="twitter:title"]'), 'content'), title);
        assert.equal(attribute(document.querySelector('meta[property="og:description"]'), 'content'), description);
        assert.equal(attribute(document.querySelector('meta[name="twitter:description"]'), 'content'), description);
        assert.ok(!attribute(document.querySelector('meta[name="robots"]'), 'content').includes('noindex'));
        assert.equal(pngSize(asset(attribute(document.querySelector('meta[property="og:image"]'), 'content'))), '1200x630');
        assert.equal(document.querySelectorAll('main menu').length, 0);
    }
});

test('structured collections and people match the visible HTML instead of inventing content', async () => {
    const document = await parse('index.html');
    const data = document.querySelectorAll('script[type="application/ld+json"]').map(script => JSON.parse(script.textContent));
    data.forEach(schema => assert.equal(schema['@context'], 'https://schema.org'));
    const graph = data.find(schema => schema['@graph'])['@graph'];
    const ids = graph.map(node => node['@id']);
    assert.equal(new Set(ids).size, ids.length);
    const organization = graph.find(node => node['@type'] === 'Organization');
    const website = graph.find(node => node['@type'] === 'WebSite');
    const page = graph.find(node => node['@type'] === 'CollectionPage');
    assert.equal(organization.url, 'https://pnp.github.io/');
    assert.equal(website.publisher['@id'], organization['@id']);
    assert.equal(page.isPartOf['@id'], website['@id']);
    assert.equal(pngSize(asset(organization.logo.url)), '512x512');
    for (const collection of graph.filter(node => node['@type'] === 'ItemList')) {
        const id = new URL(collection.url).hash.slice(1);
        const section = document.querySelector(`#${id}`);
        assert.ok(section, `No visible section for ${collection.url}`);
        const entries = section.querySelectorAll('.section-grid > li');
        assert.equal(collection.numberOfItems, entries.length);
        assert.equal(collection.itemListElement.length, entries.length);
        const links = section.querySelectorAll('a').map(link => attribute(link, 'href'));
        collection.itemListElement.forEach((entry, position) => {
            assert.equal(entry.position, position + 1);
            assert.ok(links.includes(entry.item.url), `Structured link is not visible: ${entry.item.url}`);
            assert.ok(!JSON.stringify(entry).includes('%!s'));
            if (id === 'blogs') {
                assert.equal(entry.item.headline, text(entries[position].querySelector('.blog-headline')));
                assert.equal(entry.item.datePublished, attribute(entries[position].querySelector('time'), 'datetime'));
            } else if (id !== 'events') {
                assert.equal(entry.item.name, text(entries[position].querySelector('.sample-headline')));
                assert.equal(entry.item.url, attribute(entries[position].querySelector('a.card-link'), 'href'));
            }
        });
    }
    page.mainEntity.forEach(reference => assert.ok(ids.includes(reference['@id'])));
    const people = data.filter(schema => schema['@type'] === 'Person');
    const cards = document.querySelectorAll('#team .card.people');
    assert.equal(people.length, cards.length);
    assert.ok(people.every(person => person.name !== 'Arjun Menon'));
    people.forEach((person, position) => {
        assert.equal(person.name, text(cards[position].querySelector('.profile-name h3')));
        if (person.worksFor) assert.equal(person.worksFor['@type'], 'Organization');
        assert.ok(!person.jobTitle, 'Profile recognition must not be invented as a job title.');
    });
});

test('blogs and resource discovery are available without JavaScript, with legacy anchors intact', async () => {
    const document = await parse('index.html');
    assert.ok(text(document.querySelector('title')).includes('Copilot'));
    assert.equal(document.querySelectorAll('#rss-section > li').length, 4);
    assert.ok(document.querySelector('#blog-feed-status').hasAttribute('hidden'));
    assert.equal(attribute(document.querySelector('.skip-link'), 'href'), '#main-content');
    assert.equal(attribute(document.querySelector('main'), 'id'), 'main-content');
    for (const id of ['hero', 'blogs', 'events', 'upcoming', 'guidance', 'samples', 'sdks', 'tools', 'extensions', 'forums', 'team']) {
        assert.equal(document.querySelectorAll(`#${id}`).length, 1);
    }
    const catalog = read('llms.txt');
    for (const id of ['guidance', 'samples', 'sdks', 'tools', 'extensions', 'forums']) {
        document.querySelectorAll(`#${id} .section-grid a.card-link`).forEach(link => {
            assert.ok(catalog.includes(attribute(link, 'href')), `Agent index omits ${attribute(link, 'href')}`);
        });
    }
    assert.ok(catalog.includes('https://pnp.github.io/ical/calendar.json'));
    assert.ok(read('robots.txt').includes('Allow: /'));
    assert.ok(read('robots.txt').includes('Sitemap: https://pnp.github.io/sitemap.xml'));
    assert.ok(fs.existsSync(path.join(output, 'calendar.ics')));
    assert.ok(fs.existsSync(path.join(output, 'ical/calendar.json')));
});

test('composition fragments are not published and demo/test/archive pages are not indexed', async () => {
    assert.equal(fs.existsSync(path.join(output, 'home/index.html')), false);
    assert.equal(fs.existsSync(path.join(output, 'home/hero/index.html')), false);
    const listed = sitemap().map(page => new URL(page.loc).pathname);
    assert.ok(listed.every(url => !/^\/(home|blog|posts|test-events|test-calendar|hiatus|categories|tags)(\/|$)/.test(url)));
    for (const filename of ['test-events/index.html', 'test-calendar/index.html', 'blog/sample/index.html', 'posts/my-first-post/index.html', 'hiatus/index.html']) {
        const document = await parse(filename);
        assert.ok(attribute(document.querySelector('meta[name="robots"]'), 'content').includes('noindex'), filename);
    }
});

test('Parker favicon, touch and app icons have the declared dimensions and published assets', async () => {
    const document = await parse('index.html');
    const icons = document.querySelectorAll('link[rel="icon"][type="image/png"]');
    assert.equal(icons.length, 3);
    icons.forEach(icon => {
        assert.equal(pngSize(asset(attribute(icon, 'href'))), attribute(icon, 'sizes'));
    });
    assert.equal(document.querySelectorAll('link[rel="icon"][type="image/svg+xml"]').length, 0);
    assert.equal(pngSize(asset(attribute(document.querySelector('link[rel="apple-touch-icon"]'), 'href'))), '180x180');
    const manifest = JSON.parse(asset(attribute(document.querySelector('link[rel="manifest"]'), 'href')).toString('utf8'));
    manifest.icons.forEach(icon => assert.equal(pngSize(asset(icon.src)), icon.sizes));
});

test('decorative human images are responsive, lazy where appropriate and within browser budgets', async () => {
    const document = await parse('index.html');
    const images = document.querySelectorAll('.human-image');
    assert.equal(images.length, 5);
    for (const image of images) {
        assert.equal(attribute(image, 'alt'), '');
        assert.equal(attribute(image, 'decoding'), 'async');
        assert.ok(Number(attribute(image, 'width')) > 0);
        assert.ok(Number(attribute(image, 'height')) > 0);
        assert.ok(attribute(image, 'sizes'));
        const candidates = attribute(image, 'srcset').split(',').map(value => value.trim().split(/\s+/));
        assert.equal(candidates.length, 3);
        for (const [url, width] of candidates) {
            assert.match(width, /^\d+w$/);
            const bytes = asset(url);
            assert.equal(bytes.readUInt16BE(0), 0xffd8);
            assert.ok(bytes.length <= 100 * 1024, `Human image exceeds 100 KB: ${url}`);
        }
    }
    assert.equal(attribute(document.querySelector('.hero-human img'), 'loading'), 'eager');
    document.querySelectorAll('.publishing-human img, .team-human img, .callout-human img').forEach(image => {
        assert.equal(attribute(image, 'loading'), 'lazy');
    });

    for (const filename of ['welcome.jpg', 'sharing.jpg', 'together.jpg', 'demo.jpg', 'meet.jpg']) {
        const bytes = fs.statSync(path.resolve(__dirname, '../../assets/images/humans', filename)).size;
        assert.ok(bytes <= 200 * 1024, `Human source image exceeds 200 KB: ${filename}`);
    }
});

test('Samples & Solutions contains the requested destinations in editorial order with fresh responsive previews', async () => {
    const expected = [
        ['Copilot Prompts', 'https://pnp.github.io/copilot-prompts/'],
        ['SharePoint Skills Gallery', 'https://pnp.github.io/sharepoint-skills/'],
        ['List Formatting', 'https://pnp.github.io/List-Formatting/'],
        ['SPFx', 'https://pnp.github.io/spfx/'],
        ['Copilot UX Components', 'https://pnp.github.io/spfx-copilot-components/'],
        ['Pro-code Copilot Agents', 'https://pnp.github.io/copilot-pro-dev-samples/'],
        ['Power Platform Samples', 'https://pnp.github.io/powerplatform-samples/'],
        ['Power Platform Snippets', 'https://pnp.github.io/powerplatform-snippets'],
        ['Script Samples', 'https://pnp.github.io/script-samples/'],
        ['Learning Pathways', 'https://github.com/pnp/custom-learning-office-365'],
        ['Office Add-in Samples', 'https://github.com/OfficeDev/Office-Add-in-samples'],
        ['PnP Modern Search', 'https://microsoft-search.github.io/pnp-modern-search/'],
        ['Teams Development Samples', 'https://pnp.github.io/teams-dev-samples/'],
        ['Microsoft 365 Advanced Analytics', 'https://github.com/pnp/Microsoft365-Analytics-Insights/wiki'],
        ['Copilot Studio Samples', 'https://github.com/microsoft/CopilotStudioSamples'],
        ['Microsoft 365 Agents Toolkit Samples', 'https://github.com/OfficeDev/microsoft-365-agents-toolkit-samples'],
        ['CAT Agent Skills', 'https://microsoft.github.io/cat-agent-skills/']
    ];
    const document = await parse('index.html');
    const cards = document.querySelectorAll('#samples .section-grid > li');
    assert.deepEqual(cards.map(card => [
        text(card.querySelector('.sample-headline')),
        attribute(card.querySelector('a.card-link'), 'href')
    ]), expected);
    for (const card of cards) {
        const image = card.querySelector('img');
        assert.equal(attribute(image, 'loading'), 'lazy');
        assert.equal(attribute(image, 'width'), '480');
        assert.equal(attribute(image, 'height'), '270');
        const candidates = attribute(image, 'srcset').split(',').map(value => value.trim().split(/\s+/));
        assert.deepEqual(candidates.map(([, width]) => width), ['480w', '960w']);
        for (const [url] of candidates) {
            assert.ok(asset(url).length <= 200 * 1024, `Sample preview exceeds 200 KB: ${url}`);
        }
    }
    const snippets = cards[7];
    assert.equal(snippets.querySelector('.resource-status'), null);
    assert.ok(!attribute(snippets.querySelector('a'), 'aria-label').includes('coming soon'));
    const graph = JSON.parse(document.querySelector('#site-schema').textContent)['@graph'];
    const sampleList = graph.find(node => node['@id'].endsWith('#samples-list'));
    assert.equal(sampleList.itemListElement[7].item.creativeWorkStatus, undefined);
    assert.equal(sampleList.itemListElement.at(-1).item.url, 'https://microsoft.github.io/cat-agent-skills/');
    const catalog = read('llms.txt');
    assert.ok(!catalog.includes('Coming soon. Explore reusable Power Platform snippets'));
    const sampleCatalog = catalog.split(/## Samples & Solutions\r?\n/)[1].split(/\r?\n## /)[0];
    assert.ok(sampleCatalog.trim().split(/\r?\n/).at(-1).startsWith('- [CAT Agent Skills]'));
});

test('recognition is promoted near the top and Modern Search remains a normal resource only', async () => {
    const document = await parse('index.html');
    const promo = document.querySelector('#hero .recognition-promo');
    assert.ok(promo);
    assert.equal(text(promo.querySelector('h2')), 'Share a little. Make a difference.');
    const links = promo.querySelectorAll('a').map(link => attribute(link, 'href'));
    assert.ok(links.includes('https://aka.ms/sharing-is-caring'));
    assert.ok(links.includes('https://aka.ms/community/recognition'));
    const badge = promo.querySelector('img');
    assert.ok(attribute(badge, 'alt').includes('contributor badge'));
    const candidates = attribute(badge, 'srcset').split(',').map(value => value.trim().split(/\s+/));
    assert.equal(candidates.length, 3);
    candidates.forEach(([url]) => {
        const bytes = asset(url);
        assert.ok(bytes.length <= 200 * 1024, `Badge variant exceeds 200 KB: ${url}`);
        pngSize(bytes);
    });
    assert.equal(document.querySelectorAll('.community-spotlight').length, 0);
    assert.ok(document.querySelectorAll('#samples .sample-headline').some(heading => text(heading) === 'PnP Modern Search'));
});

test('inclusive Guidance and remaining resource sections have current responsive previews', async () => {
    const document = await parse('index.html');
    const guidance = document.querySelectorAll('#guidance .section-grid > li');
    assert.equal(guidance.length, 16);
    const urls = guidance.map(card => attribute(card.querySelector('a.card-link'), 'href'));
    assert.ok(urls.includes('https://learn.microsoft.com/microsoft-copilot-studio/'));
    assert.ok(urls.includes('https://learn.microsoft.com/microsoft-365-copilot/extensibility/overview'));
    assert.ok(urls.includes('https://learn.microsoft.com/power-platform/'));
    assert.ok(!urls.includes('https://pnp.github.io/community-docs/'));
    for (const [section, count] of [['guidance', 16], ['sdks', 11], ['tools', 6], ['extensions', 7]]) {
        const cards = document.querySelectorAll(`#${section} .section-grid > li`);
        assert.equal(cards.length, count);
        cards.forEach(card => {
            const image = card.querySelector('img');
            assert.ok(image.classList.contains('resource-screenshot'));
            assert.equal(attribute(image, 'loading'), 'lazy');
            assert.ok(attribute(image, 'srcset'));
            attribute(image, 'srcset').split(',').forEach(candidate => {
                const [url] = candidate.trim().split(/\s+/);
                assert.ok(asset(url).length <= 200 * 1024, `Resource preview exceeds 200 KB: ${url}`);
            });
        });
    }
    assert.ok(read('llms.txt').includes('https://aka.ms/community/recognition'));
});

test('requested resources are visible in the intended categories with editorial placement preserved', async () => {
    const document = await parse('index.html');
    const required = [
        ['guidance', 'https://microsoft.github.io/agent-academy/'],
        ['guidance', 'https://microsoft.github.io/copilot-camp/'],
        ['sdks', 'https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/'],
        ['sdks', 'https://github.com/microsoft/fluentui'],
        ['extensions', 'https://github.com/microsoft/SharePoint-Embedded-VS-Code-Extension'],
        ['extensions', 'https://learn.microsoft.com/en-us/microsoftteams/platform/toolkit/overview-agents-toolkit'],
        ['tools', 'https://microsoft.github.io/wiqd/getting-started/build-a-plugin/'],
        ['forums', 'https://techcommunity.microsoft.com/'],
        ['forums', 'https://community.dynamics.com/forums/'],
        ['forums', 'https://community.powerplatform.com/forums/thread/?groupid=db8f53c2-767d-47d6-a1ae-fe4c828a6553']
    ];
    for (const [section, url] of required) {
        const cards = document.querySelectorAll(`#${section} a.card-link`).filter(card => attribute(card, 'href') === url);
        assert.equal(cards.length, 1, `${section} must contain one card for ${url}`);
        assert.ok(cards[0].querySelector('img').classList.contains('resource-screenshot'));
    }
    const extensions = document.querySelectorAll('#extensions a.card-link');
    assert.equal(attribute(extensions[0], 'href'), 'https://pnp.github.io/vscode-viva/');
    const titles = extensions.slice(1).map(card => text(card.querySelector('.sample-headline')));
    assert.deepEqual(titles, [...titles].sort((a, b) => a.localeCompare(b)));
    const graph = JSON.parse(document.querySelector('#site-schema').textContent)['@graph'];
    const extensionList = graph.find(node => node['@id'].endsWith('#extensions-list'));
    assert.equal(extensionList.itemListElement[0].item.url, 'https://pnp.github.io/vscode-viva/');
    const extensionCatalog = read('llms.txt').split(/## Extensions\r?\n/)[1].split(/\r?\n## /)[0];
    assert.ok(extensionCatalog.trim().split(/\r?\n/).find(line => line.startsWith('- [')).startsWith('- [SharePoint Framework Toolkit]'));
    const pnp = document.querySelectorAll('#tools a.card-link').find(card => attribute(card, 'href') === 'https://pnp.github.io/powershell/');
    assert.ok(text(pnp.querySelector('.sample-desc')).startsWith('700+ PowerShell cmdlets'));
    const toolsList = graph.find(node => node['@id'].endsWith('#tools-list'));
    assert.ok(toolsList.itemListElement.find(entry => entry.item.url === 'https://pnp.github.io/powershell/').item.description.startsWith('700+ PowerShell cmdlets'));
    assert.ok(read('llms.txt').includes('[PnP PowerShell](https://pnp.github.io/powershell/): 700+ PowerShell cmdlets'));
});

test('expanded product forums keep original resources and deliver optimized new previews', async () => {
    const document = await parse('index.html');
    const cards = document.querySelectorAll('#forums .section-grid > li');
    assert.equal(cards.length, 13);
    const urls = cards.map(card => attribute(card.querySelector('a.card-link'), 'href'));
    for (const url of [
        'https://community.powerplatform.com/forums/thread/?groupid=b5652dc6-2c99-4e33-8b6f-45be4a896a40',
        'https://community.powerplatform.com/forums/thread/?groupid=46ce02a3-e1a7-4176-81fc-d93a4001d287',
        'https://community.powerplatform.com/forums/thread/?groupid=5499ddd0-dd7f-4c63-97e9-b2bba866b08f',
        'https://community.fabric.microsoft.com/category/powerbi',
        'https://techcommunity.microsoft.com/category/microsoft-copilot',
        'https://discord.com/invite/YtYrav2VGW',
        'https://github.com/SharePoint/sp-dev-docs/issues',
        'https://developer.microsoft.com/graph/support'
    ]) {
        assert.ok(urls.includes(url), `Missing forum resource: ${url}`);
    }
    const images = cards.map(card => card.querySelector('img'));
    assert.equal(images.filter(image => image.classList.contains('resource-screenshot')).length, 11);
    for (const image of images.filter(image => image.classList.contains('resource-screenshot'))) {
        assert.equal(attribute(image, 'loading'), 'lazy');
        assert.equal(attribute(image, 'width'), '480');
        assert.equal(attribute(image, 'height'), '270');
        attribute(image, 'srcset').split(',').forEach(candidate => {
            const [url] = candidate.trim().split(/\s+/);
            assert.ok(asset(url).length <= 200 * 1024, `Forum preview exceeds 200 KB: ${url}`);
        });
    }
});
