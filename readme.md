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

![screentshot](https://raw.githubusercontent.com/Asutorufa/transmission-rss/refs/heads/main/assets/screenshot.png)

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
