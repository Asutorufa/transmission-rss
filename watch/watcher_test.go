package watch

import (
    "context"
    "errors"
    "path/filepath"
    "testing"
    "time"
)

func TestWatchConfigStopsWhenContextExpires(t *testing.T) {
    ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
    defer cancel()

    file := filepath.Join(t.TempDir(), "config.toml")
    err := WatchConfig(ctx, file, func() {
        t.Error("unexpected callback without a file change")
    })
    if !errors.Is(err, context.DeadlineExceeded) {
        t.Fatalf("WatchConfig() = %v, want context deadline exceeded", err)
    }
}
