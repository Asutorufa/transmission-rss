package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/url"
	"sync"
	"sync/atomic"
	"time"

	"github.com/samber/lo"
)

type Job struct {
	tr     *Transmission
	cache  Cache
	runJob atomic.Bool
	tgbot  *Bot
}

func NewJob(tr *Transmission, cache Cache) *Job {
	return &Job{
		tr:    tr,
		cache: cache,
	}
}

func (j *Job) Running() bool { return j.runJob.Load() }

func (j *Job) Start(ctx context.Context, notify chan struct{}, getConfig func() *Config, updateInterval int) error {
	ticker := time.NewTicker(time.Minute * time.Duration(updateInterval))
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			j.Do(getConfig)
		case <-notify:
			j.Do(getConfig)
			ticker.Reset(time.Minute * time.Duration(updateInterval))
		}
	}
}

func (j *Job) Do(getConfig func() *Config) {
	if !j.runJob.CompareAndSwap(false, true) {
		slog.Warn("job is already running")
		return
	}

	slog.Info("start job")

	defer j.runJob.Store(false)

	config := getConfig()

	m := splitConfigByHostname(config)

	wg := &sync.WaitGroup{}

	for _, v := range m {
		wg.Add(1)

		go func() {
			defer wg.Done()
			j.DoOne(v)
		}()
	}

	wg.Wait()

	slog.Info("job done")
}

func (j *Job) DoOne(config *Config) {
	type Result struct {
		channels []Channel
		rss      *RSS
	}

	ch := make(chan Result, 10)

	go func() {
		defer close(ch)
		for _, v := range config.Rss {
			if v.ExpiredOrDisabled() {
				continue
			}

			time.Sleep(time.Millisecond * time.Duration(v.FetchInterval))

			ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
			chs, err := ParseUrl(ctx, v.Url)
			cancel()
			if err != nil {
				slog.Error("parse rss failed", "err", err, "url", v.Url, "name", v.Name)
				return
			}

			slog.Info("parse rss url",
				"url", v.Url,
				"name", v.Name,
				"items", lo.Reduce(chs, func(sum int, ch Channel, _ int) int { return sum + len(ch.Items) }, 0),
			)

			ch <- Result{
				channels: chs,
				rss:      v,
			}
		}
	}()

	for r := range ch {
		chs := r.channels
		v := r.rss

		for _, ch := range chs {
			for _, item := range ch.Items {
				if err := j.Process(context.TODO(), v, item); err != nil {
					slog.Error("process item failed", "url", item.Url, "name", v.Name, "err", err)
				}
			}
		}
	}
}

func (j *Job) Process(ctx context.Context, v *RSS, item Item) error {
	if !v.MatchDate(item.PubDate) {
		return nil
	}

	if !v.Match(item.Title) {
		return nil
	}

	if ok := j.cache.Exist(v.Url, item.Url); ok {
		return nil
	}

	if v.FetchInterval > 0 {
		time.Sleep(time.Duration(v.FetchInterval) * time.Millisecond)
	}

	getctx, cancel := context.WithTimeout(ctx, 45*time.Second)
	tr, err := item.Get(getctx)
	cancel()
	if err != nil {
		return fmt.Errorf("get torrent failed: %w", err)
	}

	err = j.tr.Add(ctx, tr, AddArgs{
		DownloadDir: v.DownloadDir,
		Labels:      v.Label,
	})
	if err != nil {
		return fmt.Errorf("add torrent failed: %w", err)
	}

	slog.Info("add torrent", "url", item.Url, "name", item.Title)

	if j.tgbot != nil {
		err = j.tgbot.SendMessage(fmt.Sprintf("add new torrent:\n%s\n%s", item.Title, item.Url))
		if err != nil {
			slog.Error("send tgbot message failed", "err", err)
		}
	}

	err = j.cache.Store(v.Url, item.Url, tr)
	if err != nil {
		return fmt.Errorf("store torrent failed: %w", err)
	}

	return nil
}

func splitConfigByHostname(config *Config) map[string]*Config {
	m := make(map[string]*Config)
	for _, v := range config.Rss {
		if v.ExpiredOrDisabled() {
			continue
		}

		uri, err := url.Parse(v.Url)
		if err != nil {
			m["default"] = config
			continue
		}

		x := m[uri.Host]
		if x == nil {
			x = new(Config)
			m[uri.Host] = x
		}

		x.Rss = append(x.Rss, v)
	}
	return m
}
