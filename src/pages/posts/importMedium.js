import Parser from 'rss-parser';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import sanitize from 'sanitize-filename';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const blogDir = path.join(__dirname, '../../content/blog');
const mediumDir = path.join(__dirname, '../../content/blog/medium');
const gifsDir = path.join(mediumDir, 'gifs');

// Ensure the output directories exist
[blogDir, mediumDir, gifsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const parser = new Parser();

async function downloadImage(url, filepath) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36',
                Referer: 'https://medium.com/',
                Accept:
                    'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            }
        });
        fs.writeFileSync(filepath, response.data);
    } catch (err) {
        console.warn(
            `Failed to download image: ${url} (${err.response?.status || err.message})`
        );
    }
}

function slugify(str) {
    return sanitize(
        str
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
    );
}

// Helper: remove HTML tags to analyze text
function stripHTML(html) {
    return html.replace(/<[^>]*>/g, ' ');
}

// Helper: get up to three auto-generated tags.
// It looks for "IIT Patna" and "Robotics" (added as phrases if present) and then fills the rest
// by counting the most recurring words (ignoring "iit", "patna" and "robotics").
function getAutoTags(text) {
    const autoTags = [];
    const lowerText = text.toLowerCase();

    // Check for phrases
    const iitPatnaRegex = /iit patna/gi;
    if (lowerText.match(iitPatnaRegex)) {
        autoTags.push('IIT Patna');
    }

    const roboticsRegex = /robotics/gi;
    if (lowerText.match(roboticsRegex)) {
        autoTags.push('Robotics');
    }

    // Remove the matched phrases to avoid double counting.
    let cleanedText = lowerText.replace(iitPatnaRegex, '');
    cleanedText = cleanedText.replace(roboticsRegex, '');

    // Tokenize words (ignoring short words)
    const words = cleanedText.split(/\W+/).filter((w) => w.length > 2);
    const freq = {};
    words.forEach((word) => {
        // Ignore these individual words
        if (word === 'iit' || word === 'patna' || word === 'robotics') return;
        freq[word] = (freq[word] || 0) + 1;
    });

    const needed = 3 - autoTags.length;
    if (needed > 0) {
        const sortedWords = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .map(([word]) => word);
        // Add unique words if not already in autoTags.
        sortedWords.forEach((word) => {
            if (autoTags.length < 3 && !autoTags.includes(word)) {
                autoTags.push(word);
            }
        });
    }

    return autoTags;
}

(async () => {
    const feed = await parser.parseURL('https://medium.com/feed/@praajarpit');
    for (const item of feed.items) {
        let content = item['content:encoded'] || item.content;

        // Find all image URLs in the content
        const imgRegex = /<img[^>]+src="([^">]+)"/g;
        let match;
        let coverImage = './blog-placeholder-5.jpg'; // default cover image
        let foundFirstImage = false;

        while ((match = imgRegex.exec(content)) !== null) {
            const imgUrl = match[1];
            const baseName = sanitize(path.basename(imgUrl.split('?')[0]));
            const isGif = /\.gif(\?|$)/i.test(imgUrl);

            // Set filepath and public path according to file type (gif vs. others)
            let localImgPath;
            let publicImgPath;
            if (isGif) {
                localImgPath = './medium/gifs/' + baseName;
                publicImgPath = path.join(gifsDir, baseName);
            } else {
                localImgPath = './medium/' + baseName;
                publicImgPath = path.join(mediumDir, baseName);
            }

            // Download the image if not already downloaded
            if (!fs.existsSync(publicImgPath)) {
                await downloadImage(imgUrl, publicImgPath);
            }

            // Set the first image (non-placeholder) as cover image if not already set
            if (!foundFirstImage) {
                coverImage = localImgPath;
                foundFirstImage = true;
            }

            // Replace the image URL (only the src, not the entire tag) in the content
            content = content.replace(imgUrl, localImgPath);
        }

        // Prepare frontmatter fields
        const title = item.title.replace(/"/g, '\\"');
        const slug = slugify(item.title);
        const description = (item.contentSnippet || '').replace(/"/g, '\\"');
        // Generate additional tags from content (auto-tags)
        const strippedContent = stripHTML(content);
        const autoTags = getAutoTags(strippedContent);
        // Combine fixed and auto-generated tags.
        const allTags = JSON.stringify(['Medium', ...autoTags]);
        const pubDate = item.pubDate;
        const author = 'Panav Arpit Raaj';

        // Write the markdown file with improved formatting
        const mdFileName = `${slug}.md`;
        const mdContent = `---
title: "${title}"
slug: "${slug}"
description: "${description}"
tags: ${allTags}
pubDate: "${pubDate}"
coverImage: "${coverImage}"
author: "${author}"
---

${content}
`;
        fs.writeFileSync(path.join(blogDir, mdFileName), mdContent);
    }
})();
