# drford.com

The website of Dr. Ford (Daniel Robert Ford), Nashville country record producer.

Plain static HTML, CSS and JavaScript. There is no build step and nothing to install, and there are no third-party scripts. Upload the folder as-is to any static host.

## What's here

| Path | What it is |
|---|---|
| `index.html` | Home page |
| `contact/` | **Permanent URL.** Printed on banners and QR codes (October 16, 2026). Never rename, move or remove it. |
| `country-song-production/`, `mixing-and-mastering/`, `gift-certificates/` | Service pages |
| `go/{instagram,facebook,google,youtube,tiktok}/` | Ad landing pages (noindex). Each one records which ad a visitor came from, and the forms send that along with the inquiry. |
| `audio/` | Before/After clips: AAC `.mp4`, with Opus `.webm` as a fallback |
| `css/`, `js/` | Styles and behavior. The file names carry a content hash, so browsers can cache them indefinitely. |
| `img/`, `fonts/` | Images (AVIF, WebP and JPEG) and self-hosted fonts (OFL licensed) |
| `robots.txt`, `llms.txt`, `sitemap.xml` | Search and AI visibility. Search and AI-answer bots are allowed everywhere. ChatGPT, Claude and Apple training crawlers may read text but not `/audio/` or `/img/`; other training crawlers are blocked. |
| `_headers`, `_redirects` | Security headers, caching and redirects. Netlify and Cloudflare Pages both read these automatically. |
| `4be1f8c6f36ab0d89e3d43a5abcd29f6.txt`, `.github/` | IndexNow key and the GitHub Action that tells Bing/Copilot which pages changed after each push |

## Before launch

1. **Formspree:** replace `YOUR_FORM_ID` in `index.html` and `contact/index.html` with the real form ID. Until then, the forms show "Preview only."
2. **Host:** on Cloudflare, open AI Crawl Control and make sure search and AI-answer crawlers aren't blocked, and turn off "managed robots.txt" so it doesn't rewrite ours. Netlify has no AI blocking by default.
3. **Log retention:** set the host to delete server logs after 90 days, as the privacy page promises.
4. **Permissions:** get each artist's approval for the Before/After audio before the site goes public.

## After launch

1. **IndexNow:** in GitHub, set the repository variable `SITE_LIVE` to `true` (Settings → Secrets and variables → Actions → Variables). From then on, every push pings Bing two minutes later.
2. **Register:** Google Search Console (confirm Settings → "Search generative AI" is Include), Bing Webmaster Tools (import from Search Console), and submit the home and service pages at Brave Search, the index behind Claude's web search.
3. **Check crawler access:** run
   ```
   for ua in OAI-SearchBot/1.4 ChatGPT-User/1.0 Claude-SearchBot/1.0 Claude-User/1.0 PerplexityBot/1.0 bingbot/2.0 Applebot/0.1; do
     curl -s -o /dev/null -w "$ua %{http_code}\n" -A "Mozilla/5.0 (compatible; $ua)" https://www.drford.com/
   done
   ```
   Every line should end in 200.
4. **Dates:** when a page's content changes, update its footer "Last updated" date, its `dateModified` and its `<lastmod>` in `sitemap.xml` together.

## Timeline photos: house color grade

Every timeline photo gets the same light "warm film" grade: 75% color, a 10% wash of brass (#CFA96B) and +10% contrast. To add one, save it as `img/tl-<id>-520.jpg` and `img/tl-<id>-1040.jpg` (the width in the name) and push. A GitHub Action grades it, makes the `.webp` and `.avif` versions, and records it in `.github/timeline-graded.txt` so it's never graded twice. To run it by hand: `python3 .github/scripts/timeline_grade.py`. Keep the ungraded originals in your own archive, not here.
