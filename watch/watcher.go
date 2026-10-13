package watch

import (
	"context"
	"path/filepath"
	"time"

	"github.com/fsnotify/fsnotify"
)

func WatchConfig(ctx context.Context, file string, do func()) error {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	defer watcher.Close()

	file, err = filepath.Abs(file)
	if err != nil {
		return err
	}

	err = watcher.Add(filepath.Dir(file))
	if err != nil {
		return err
	}

	first := true

	timer := time.AfterFunc(-1, func() {
		if first {
			first = false
			return
		}

		do()
	})

	defer timer.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case event, ok := <-watcher.Events:
			if !ok {
				return nil
			}

			if event.Name != file {
				continue
			}

			if event.Op&fsnotify.Remove == fsnotify.Remove {
				continue
			}

			timer.Reset(time.Second * 9)
		}
	}
}
