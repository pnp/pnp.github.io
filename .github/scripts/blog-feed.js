const fetch = require('node-fetch');
const fs = require('node:fs/promises');
const path = require('node:path');
const { XMLParser, XMLValidator } = require('fast-xml-parser');

function text(value, field) {
    if (value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (value && typeof value['#text'] === 'string') return value['#text'].trim();
    throw new Error(`Invalid RSS ${field}: expected text.`);
}

function webURL(value, base, field) {
    const result = new URL(value, base);
    if (!['http:', 'https:'].includes(result.protocol)) {
        throw new Error(`Invalid RSS ${field}: expected an HTTP or HTTPS URL.`);
    }
    return result.href;
}

function parseBlogFeed(xml) {
    const validation = XMLValidator.validate(xml);
    if (validation !== true) {
        throw new Error(`Invalid blog RSS XML: ${validation.err.msg}`);
    }
    const parser = new XMLParser({
        ignoreAttributes: false,
        parseTagValue: false,
        isArray: (name, location) => location === 'rss.channel.item' || name === 'category'
    });
    const channel = parser.parse(xml).rss?.channel;
    if (!channel || !Array.isArray(channel.item) || channel.item.length === 0) {
        throw new Error('The community blog RSS feed contains no articles.');
    }
    const blogURL = webURL(text(channel.link, 'channel link'), undefined, 'channel link');
    const items = channel.item.slice(0, 4).map(item => {
        const title = text(item.title, 'title');
        const link = text(item.link, 'article link');
        const published = text(item.pubDate, 'publication date');
        if (!title || !link || !published || !Number.isFinite(Date.parse(published))) {
            throw new Error('A community blog article is missing a valid title, link, or publication date.');
        }
        const media = item['media:content'];
        const images = Array.isArray(media) ? media : media ? [media] : [];
        const image = images.find(image => image['@_url'] && (!image['@_type'] || image['@_type'].startsWith('image/')));
        const category = text(item.category?.[0], 'category');
        return {
            title,
            url: webURL(link, blogURL, 'article link'),
            published: new Date(published).toISOString(),
            description: text(Array.isArray(item.description) ? item.description[0] : item.description, 'description'),
            author: text(item['dc:creator'], 'author'),
            category: category.split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            image: image ? webURL(text(image['@_url'], 'image URL'), blogURL, 'image URL') : ''
        };
    });
    return { blogURL, items };
}

async function refreshBlogFeed() {
    const filename = path.resolve(__dirname, '../../data/blog.json');
    const current = JSON.parse(await fs.readFile(filename, 'utf8'));
    const url = webURL(current.url, undefined, 'feed URL');
    const response = await fetch(url, { timeout: 15000, size: 2 * 1024 * 1024 });
    if (!response.ok) {
        throw new Error(`Unable to refresh the community blog feed: HTTP ${response.status}.`);
    }
    const feed = { url, ...parseBlogFeed(await response.text()) };
    if (JSON.stringify(feed) === JSON.stringify({
        url: current.url,
        blogURL: current.blogURL,
        items: current.items
    })) {
        console.log('The community blog snapshot is already current.');
        return;
    }
    await fs.writeFile(filename, `${JSON.stringify({ ...feed, updatedAt: new Date().toISOString() }, null, 2)}\n`);
    console.log(`Refreshed ${feed.items.length} community blog articles.`);
}

module.exports = { parseBlogFeed };

if (require.main === module) {
    refreshBlogFeed().catch(error => {
        console.error('Community blog refresh failed:', error);
        process.exitCode = 1;
    });
}
