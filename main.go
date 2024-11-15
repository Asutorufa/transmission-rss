package main

import (
	"context"
	"encoding/json"
	"flag"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"

	"github.com/BurntSushi/toml"
)

var config atomic.Pointer[Config]
var configMu sync.RWMutex
var runJob atomic.Bool
var configFullPath string
var ch = make(chan func())

var unmarshalConfig = toml.Unmarshal
var marshalConfig = toml.Marshal

func main() {
	path := flag.String("path", "", "config dir path")
	configType := flag.String("config-type", "toml", "config type, json or toml")
	rpc := flag.String("rpc", "http://127.0.0.1:9091/transmission/rpc", "transmission rpc url")
	lishost := flag.String("host", ":9093", "listen host")
	flag.Parse()

	configFullPath = filepath.Join(*path, "config.toml")
	if *configType == "json" {
		configFullPath = filepath.Join(*path, "config.json")
		unmarshalConfig = json.Unmarshal
		marshalConfig = func(v any) ([]byte, error) { return json.MarshalIndent(v, "", "  ") }
	}

	updateConfig()

	cache, err := NewCacheByPath(filepath.Join(*path, "trss.db"))
	if err != nil {
		panic(err)
	}
	defer cache.Close()

	tr, err := NewTransmission(*rpc)
	if err != nil {
		panic(err)
	}

	job := NewJob(tr, cache)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		if err := job.Start(ctx, ch, config.Load); err != nil {
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

func updateConfig() {
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
