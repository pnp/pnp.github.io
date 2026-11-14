(() => {
    const section = document.getElementById('rss-section');
    const status = document.getElementById('blog-feed-status');

    const element = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    };

    const webURL = (value, base) => {
        const url = new URL(value, base);
        if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('The blog feed contains an unsupported link protocol.');
        }
        return url.href;
    };

    const parseFeed = (xml, url) => {
        const document = new DOMParser().parseFromString(xml, 'application/xml');
        if (document.querySelector('parsererror')) throw new Error('The blog RSS feed is not valid XML.');
        const entries = [...document.querySelectorAll('channel > item')].slice(0, 4);
        if (!entries.length) throw new Error('The blog RSS feed contains no articles.');
        return entries.map(entry => {
            const text = name => entry.getElementsByTagName(name)[0]?.textContent.trim() || '';
            const title = text('title');
            const link = text('link');
            const publication = text('pubDate');
            if (!title || !link || !publication || !Number.isFinite(Date.parse(publication))) {
                throw new Error('A blog article has an invalid title, link, or publication date.');
            }
            const image = [...entry.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')]
                .find(image => image.getAttribute('url') && (!image.getAttribute('type') || image.getAttribute('type').startsWith('image/')));
            const description = new DOMParser().parseFromString(text('description'), 'text/html').body.textContent;
            return {
                title,
                url: webURL(link, url),
                published: new Date(publication).toISOString(),
                description,
                image: image ? webURL(image.getAttribute('url'), url) : '',
                author: entry.getElementsByTagNameNS('*', 'creator')[0]?.textContent.trim() || '',
                category: text('category').split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
            };
        });
    };

    const createCard = item => {
        const link = element('a', 'card-link');
        link.href = item.url;
        const card = element('article', 'card blog');
        card.setAttribute('itemscope', '');
        card.setAttribute('itemtype', 'https://schema.org/BlogPosting');
        if (item.image) {
            const metadata = element('meta');
            metadata.setAttribute('itemprop', 'image');
            metadata.content = item.image;
            card.append(metadata);
            const figure = element('figure', 'blog-media');
            const image = element('img', 'blog-media-img');
            image.src = item.image;
            image.alt = '';
            image.loading = 'lazy';
            image.decoding = 'async';
            figure.append(image);
            card.append(figure);
        }
        const content = element('div', 'blog-content');
        const heading = element('h3', 'blog-headline', item.title);
        heading.setAttribute('itemprop', 'headline');
        content.append(heading, element('p', 'blog-excerpt', item.description));
        const metadata = element('div', 'blog-meta');
        const info = element('div', 'blog-info');
        const date = new Date(item.published);
        const time = element('time', 'blog-created', `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}, ${date.getFullYear()}`);
        time.dateTime = item.published;
        time.setAttribute('itemprop', 'datePublished');
        info.append(time);
        if (item.author) {
            const author = element('div', 'blog-author');
            author.setAttribute('itemprop', 'author');
            author.setAttribute('itemscope', '');
            author.setAttribute('itemtype', 'https://schema.org/Person');
            const name = element('span', '', item.author);
            name.setAttribute('itemprop', 'name');
            author.append('by ', name);
            info.append(author);
        }
        metadata.append(info);
        if (item.category) {
            const type = element('div', 'blog-type');
            type.append(element('div', 'blog-cat', item.category));
            metadata.append(type);
        }
        content.append(metadata);
        card.append(content);
        link.append(card);
        return link;
    };

    const schemaFor = item => {
        const schema = {
            '@type': 'BlogPosting',
            name: item.title,
            headline: item.title,
            url: item.url,
            description: item.description,
            datePublished: item.published
        };
        if (item.author) schema.author = { '@type': 'Person', name: item.author };
        if (item.image) schema.image = item.image;
        return schema;
    };

    const refresh = async () => {
        try {
            const url = webURL(section.dataset.feedUrl, location.href);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`The blog feed returned HTTP ${response.status}.`);
            const items = parseFeed(await response.text(), url);
            const fragment = document.createDocumentFragment();
            items.forEach(item => {
                const entry = element('li');
                entry.append(createCard(item));
                fragment.append(entry);
            });
            const schemaElement = document.getElementById('site-schema');
            const schema = JSON.parse(schemaElement.textContent);
            const list = schema['@graph'].find(node => node['@type'] === 'ItemList' && node['@id'].endsWith('#blogs-list'));
            if (!list) throw new Error('The blog structured-data collection is missing.');
            list.numberOfItems = items.length;
            list.itemListElement = items.map((item, position) => ({
                '@type': 'ListItem',
                position: position + 1,
                item: schemaFor(item)
            }));
            schemaElement.textContent = JSON.stringify(schema);
            section.replaceChildren(fragment);
            status.hidden = true;
            status.textContent = '';
        } catch (error) {
            console.error('Unable to refresh community blog articles.', error);
            status.hidden = false;
            status.textContent = 'Live blog updates are unavailable. Showing articles from the last site build; explore the blog for the latest posts.';
        }
    };

    document.addEventListener('DOMContentLoaded', refresh, { once: true });
})();
