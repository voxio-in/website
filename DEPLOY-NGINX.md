# Server settings the site cannot fix from inside the code

The last audit measured three things that live in nginx, not in this repo. Together
they were worth more than anything left to win in the application.

Server: nginx/1.24.0 (Ubuntu), 54.227.0.101, DNS at domaincontrol.com.

## 1. HTML is served uncompressed

The audit reported `HTML 0% compressed of 0.04MB` while CSS and JS came back at
76% and 68% — so compression is on for static assets and off for the documents
themselves. Every page on this site is server-rendered HTML, so this is the one
that costs on every single navigation.

```nginx
gzip              on;
gzip_vary         on;
gzip_comp_level   6;
gzip_min_length   256;
gzip_proxied      any;
gzip_types
    text/html
    text/plain
    text/css
    text/xml
    application/javascript
    application/json
    application/xml
    image/svg+xml;
```

`text/html` is compressed by nginx whether or not it appears in `gzip_types`, so
if HTML is still coming back uncompressed the likely cause is that the response
is proxied and `gzip_proxied` is at its default (`off`), which suppresses
compression for anything with a `Via` header. The line above fixes that case.

Brotli is better again if the build has `ngx_brotli`:

```nginx
brotli            on;
brotli_comp_level 5;
brotli_types      text/html text/css application/javascript application/json image/svg+xml;
```

Do not add `.mp4`, `.png`, `.webp` or `.woff2` to either list. They are already
compressed and re-compressing them costs CPU to make them slightly larger.

## 2. HTTP/1.1

The audit flagged `Your website is using an outdated HTTP Protocol`. The site
loads 29 objects, and on HTTP/1.1 the browser opens six connections and queues
the rest. HTTP/2 multiplexes them over one.

```nginx
listen 443 ssl;
http2 on;          # nginx >= 1.25.1
# on 1.24, which is what is deployed:  listen 443 ssl http2;
```

## 3. A redirect chain worth 0.63s on mobile

`Avoid multiple page redirects — 0.63s` means a request is being bounced more
than once, almost always `http://` -> `https://` -> `https://www` (or the
reverse). Collapse it to one hop by sending every variant straight to the final
host:

```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name www.voxio.in;
    return 301 https://voxio.in$request_uri;
}

server {
    listen 80;
    server_name voxio.in;
    return 301 https://voxio.in$request_uri;
}
```

The canonical host must match the one in `web/src/routes/__root.tsx` (`SITE`),
`public/robots.txt` and `public/sitemap.xml`, all of which currently say
`https://voxio.in` with no `www`.

## 4. Cache headers for the fingerprinted assets

Vite fingerprints everything in `/assets/`, so those files can be cached
permanently, while the HTML must never be.

```nginx
location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}

location = /index.html {
    add_header Cache-Control "no-cache";
}
```

## Not a server matter, but asked for and outstanding

* **DMARC and SPF** are DNS TXT records at domaincontrol.com, not nginx.
  SPF: `v=spf1 include:<whatever sends your mail> -all`.
  DMARC, at `_dmarc.voxio.in`: `v=DMARC1; p=none; rua=mailto:<an address you read>`.
  Start at `p=none` and only tighten once the reports come back clean.
* **Analytics and a Facebook pixel** need an account and a decision about
  consent. Neither is installed, deliberately.

## Security headers and the version banner

Three audit findings that are one block of config between them. HSTS and
`server_tokens` are flagged by every checker; the version banner is the
"web server version is sent within the HTTP header" error.

```nginx
# In the https server block.

# Stops nginx announcing "nginx/1.24.0 (Ubuntu)" in every response. Put this
# in the http {} block instead if you want it site-wide.
server_tokens off;

# HSTS. Start WITHOUT preload and with a short max-age, confirm nothing on the
# domain still needs plain http, then raise it. Once a browser has seen this
# header it will refuse http for the whole max-age, and there is no way to call
# that back — which is why includeSubDomains is the line to think hardest about
# if anything under voxio.in is not yet on https.
add_header Strict-Transport-Security "max-age=300" always;
# After a week of no surprises:
# add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

Note `interview.dashboard.voxio.in` shares the certificate with `voxio.in`, so
`includeSubDomains` will cover it. Confirm it is https-only before switching the
long header on.
