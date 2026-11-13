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

## Before launch

1. **Formspree:** replace `YOUR_FORM_ID` in `index.html` and `contact/index.html` with the real form ID. Until then, the forms show "Preview only."
2. **Security headers:** set them on the host, including a Content-Security-Policy with `connect-src 'self' https://formspree.io`.
3. **Redirects:** send `/contact-us` and `/contact.html` to `/contact/`.
4. **Privacy policy:** live at `/privacy/`. Set the host to delete server logs after 90 days, as the policy promises.
5. **Permissions:** get each artist's approval for the Before/After audio before the site goes public.
