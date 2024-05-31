#

## build and run

```bash
go build -o main -v .
# config type: json or toml, default toml
./main -path config/ -rpc http://127.0.0.1:9091/transmission/rpc -host :9093 -config-type json
```

immidiately run once

```bash
curl http://127.0.0.1:9093/start_job
```

## config

put config in config dir, config type can be json or toml, config file name:

- toml: config.toml
- json: config.json

### config.toml 

```toml
[[rss]]
name = "rss1"
url = "https://example.com/RSS1"
download_dir = "/download/rss1"
regexp = ["\\(CR"]
exclude_regexp = ["\\(Baha"]
download_after = 1717077480

[[rss]]
name = "rss2"
url = "https://example.com/RSS2"
download_dir = "/download/rss2"
regexp = ["\\(CR,RSS2","RSS2"]
exclude_regexp = ["\\(Baha"]
```

### config.json

```json
{
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
            "download_after": 1717077480
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