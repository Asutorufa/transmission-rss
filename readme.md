#

## build and run

The Web UI is a Vite + React single-page app using Radix UI, Wouter and Tailwind CSS 4.
The Go server serves the compiled `web/out` files via `go:embed`, so a frontend
build is required before compiling the Go binary.

```bash
cd web
npm install
npm run build
cd ..
go test ./...
```

For frontend development, run `npm run dev` from `web/`; the Vite dev server
proxies `/api` and `/start_job` to the Go backend on `127.0.0.1:9093`.


```bash
go build -o main -v .
# config type: json or toml, default toml
./main -path config/ -rpc http://127.0.0.1:9091/transmission/rpc -host :9093 -config-type json
```

immidiately run once

```bash
curl http://127.0.0.1:9093/start_job
```

The management UI is served on the configured `-host` address (default: `http://127.0.0.1:9093/`).

## config dir

### config

put config in config dir, config type can be json or toml, config file name:

- toml: config.toml
- json: config.json

#### config.toml

```toml
[telegram_bot]
token = "xxx:xxxxxx"
# chat_id or user_id
chat_id = 000000

[[rss]]
name = "rss1"
url = "https://example.com/RSS1"
download_dir = "/download/rss1"
regexp = ["\\(CR"]
exclude_regexp = ["\\(Baha"]
download_after = 1717077480
expire_time = 1717077480
disabled = true
fetch_interval = 1000 # units: ms
label = ["tv-sonarr"]

[[rss]]
name = "rss2"
url = "https://example.com/RSS2"
download_dir = "/download/rss2"
regexp = ["\\(CR,RSS2","RSS2"]
exclude_regexp = ["\\(Baha"]
```

#### config.json

```json
{  
    "telegram_bot": {
        "token": "xxx:xxxx",
        "chat_id": 0000
    },
    "rss": [
        {
            "name": "rss1",
            "url": "https://example.com/RSS1",
            "download_dir": "/download/rss1",
            "regexp": [
                "\\(CR"
            ],
            "exclude_regexp":  [
                "\\(Baha"
            ],
            "download_after": 1717077480,
            "fetch_interval": 1000,
            "label": [
                "tv-sonarr"
            ]
        },
        {
            "name": "rss2",
            "url": "https://example.com/RSS2",
            "download_dir": "/download/rss2",
            "regexp": [
                "\\(CR,RSS2",
                "RSS2"
            ],
            "exclude_regexp":  [
                "\\(Baha"
            ]
        }
    ]
}
```
