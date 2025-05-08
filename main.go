package main

import (
	"context"
	"encoding/json"
	"flag"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"sync/atomic"

	"github.com/BurntSushi/toml"
)

var config atomic.Pointer[Config]
var configMu sync.RWMutex
var configFullPath string
var ch = make(chan struct{})
var job *Job

var ENV_TELEGRAM_BOT_TOKEN = os.Getenv("TELEGRAM_BOT_TOKEN")
var ENV_TELEGRAM_BOT_CHAT_ID = func() int64 {
	str := os.Getenv("TELEGRAM_BOT_CHAT_ID")
	if str == "" {
		return 0
	}
	i, _ := strconv.ParseInt(str, 10, 64)
	return i
}()

var unmarshalConfig = toml.Unmarshal
var marshalConfig = toml.Marshal

func main() {
	path := flag.String("path", "", "config dir path")
	configType := flag.String("config-type", "toml", "config type, json or toml")
	rpc := flag.String("rpc", "http://127.0.0.1:9091/transmission/rpc", "transmission rpc url")
	lishost := flag.String("host", ":9093", "listen host")
	updateInterval := flag.Int("update", 60, "interval between updating rss in minutes")
	flag.Parse()

	configFullPath = filepath.Join(*path, "config.toml")
	if *configType == "json" {
		configFullPath = filepath.Join(*path, "config.json")
		unmarshalConfig = json.Unmarshal
		marshalConfig = func(v any) ([]byte, error) { return json.MarshalIndent(v, "", "  ") }
	}

	readConfig()

	cache, err := NewCacheByPath(filepath.Join(*path, "trss.db"))
	if err != nil {
		panic(err)
	}
	defer cache.Close()

	tr, err := NewTransmission(*rpc)
	if err != nil {
		panic(err)
	}

	job = NewJob(tr, cache)

	cf := config.Load()
	if cf.TelegramBot != nil {
		if ENV_TELEGRAM_BOT_TOKEN == "" {
			ENV_TELEGRAM_BOT_TOKEN = cf.TelegramBot.Token
		}
		if ENV_TELEGRAM_BOT_CHAT_ID == 0 {
			ENV_TELEGRAM_BOT_CHAT_ID = cf.TelegramBot.ChatID
		}
	}

	if ENV_TELEGRAM_BOT_TOKEN != "" {
		job.tgbot, err = newBot(ENV_TELEGRAM_BOT_TOKEN, ENV_TELEGRAM_BOT_CHAT_ID)
		if err != nil {
			slog.Error("new telegram bot failed", "err", err)
		} else {
			slog.Info("new telegram bot success")
			_ = job.tgbot.SendMessage("start run new transmission rss process")
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		if err := job.Start(ctx, ch, config.Load, *updateInterval); err != nil {
			slog.Error("job start failed", "err", err)
		}
	}()

	// go func() {
	// 	if err := WatchConfig(ctx, configFullPath, func() {
	// 		slog.Info("check config changed, reload config")
	// 		updateConfig()
	// 	}); err != nil {
	// 		slog.Error("watch config failed", "err", err)
	// 	}
	// }()

	if err := http.ListenAndServe(*lishost, route()); err != nil {
		panic(err)
	}
}

func readConfig() {
	configMu.Lock()
	defer configMu.Unlock()

	data, err := os.ReadFile(configFullPath)
	if err != nil {
		if os.IsNotExist(err) {
			cf := new(Config)
			config.Store(cf)

			if err := saveConfig(cf); err != nil {
				slog.Error("save config failed", "err", err)
				return
			}

			return
		}
		slog.Error("read config failed", "err", err)
		return
	}

	cf := new(Config)
	err = unmarshalConfig(data, cf)
	if err != nil {
		slog.Error("unmarshal config failed", "err", err)
		return
	}

	config.Store(cf)
}

func saveConfig(config *Config) error {
	data, err := marshalConfig(config)
	if err != nil {
		return err
	}

	err = os.WriteFile(configFullPath, data, 0644)
	if err != nil {
		return err
	}

	return nil
}
