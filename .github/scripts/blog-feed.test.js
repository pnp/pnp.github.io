const assert = require('node:assert/strict');
const test = require('node:test');
const { parseBlogFeed } = require('./blog-feed');

const article = `
<item>
  <title>Build &amp; share "real" solutions</title>
  <link>post/build/</link>
  <pubDate>Thu, 12 Nov 2026 02:00:00 +0000</pubDate>
  <description><![CDATA[<p>Learn &amp; contribute.</p>]]></description>
  <dc:creator>Community "Author"</dc:creator>
  <category>community post</category>
  <category>copilot</category>
  <media:content url="/blog/images/example.png" type="image/png"/>
</item>`;

const feed = items => `<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
<channel><link>https://pnp.github.io/blog/</link>${items}</channel></rss>`;

test('RSS snapshot preserves entities, authors and publication dates and resolves relative links', () => {
    const result = parseBlogFeed(feed(article.repeat(5)));
    assert.equal(result.items.length, 4);
    assert.deepEqual(result.items[0], {
        title: 'Build & share "real" solutions',
        url: 'https://pnp.github.io/blog/post/build/',
        published: '2026-11-12T02:00:00.000Z',
        description: '<p>Learn &amp; contribute.</p>',
        author: 'Community "Author"',
        category: 'Community Post',
        image: 'https://pnp.github.io/blog/images/example.png'
    });
});

test('malformed, empty and unsafe feeds fail instead of overwriting the last snapshot', () => {
    assert.throws(() => parseBlogFeed('<rss>'), /Invalid blog RSS XML/);
    assert.throws(() => parseBlogFeed(feed('')), /contains no articles/);
    assert.throws(() => parseBlogFeed(feed(article.replace('Thu, 12 Nov 2026 02:00:00 +0000', 'not a date'))), /publication date/);
    assert.throws(() => parseBlogFeed(feed(article.replace('post/build/', 'javascript:alert(1)'))), /HTTP or HTTPS/);
});

test('feeds with a summary and a full-content description keep the first summary', () => {
    const result = parseBlogFeed(feed(article.replace('<description>', '<description>Short summary.</description><description>')));
    assert.equal(result.items[0].description, 'Short summary.');
});
