package main

import (
	"encoding/json"
	"os"
	"testing"

	gotorrentparser "github.com/j-muller/go-torrent-parser"
	"github.com/samber/lo"
	"github.com/stretchr/testify/require"
)

func TestCache(t *testing.T) {
	cache, err := NewCacheByPath("test.db")
	require.NoError(t, err)
	defer cache.Close()

	require.NoError(t, cache.Store("test://rss_url", "test://torrent_url", &Torrent{
		TorrentFile: &TorrentFile{
			Bytes: []byte("xxxx"),
			Torrent: &gotorrentparser.Torrent{
				Announce: []string{"test://announce"},
				InfoHash: "xsdsdsdsdsd",
				Comment:  "test comment",
				Files: []*gotorrentparser.File{
					{
						Path: []string{"test file"},
					},
				},
			},
		},
	}))

	tt, ok := cache.Load("test://rss_url", "test://torrent_url")
	require.True(t, ok)

	_ = json.NewEncoder(os.Stdout).Encode(tt)

	require.NoError(t, cache.Store("test://rss_url", "test://torrent_url_2", &Torrent{
		TorrentHash: lo.ToPtr(TorrentHash("test hash")),
	}))

	tt, ok = cache.Load("test://rss_url", "test://torrent_url_2")
	require.True(t, ok)

	_ = json.NewEncoder(os.Stdout).Encode(tt)
}
