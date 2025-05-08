package main

import (
	_ "embed"
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"testing"

	"github.com/BurntSushi/toml"
	"github.com/stretchr/testify/require"
)

//go:embed test.xml
var data []byte

func TestParse(t *testing.T) {

	chs, err := ParseString(string(data))
	require.NoError(t, err)

	rg := regexp.MustCompile(`\(CR`)

	for _, ch := range chs {
		for _, ch := range ch.Items {
			t.Logf("%+v", ch)
			if rg.MatchString(ch.Title) {
				t.Log(ch.Title)
			}
		}
	}

}

func TestConfig(t *testing.T) {
	cf := Config{
		TelegramBot: &TelegramBot{
			Token:  "token",
			ChatID: 123,
		},
		Rss: []*RSS{
			{
				Name:          "test",
				Url:           "https://example.com/rss",
				DownloadDir:   filepath.Join(os.TempDir(), "test"),
				Regexp:        []string{"^test$"},
				ExcludeRegexp: []string{"^test$"},
			},
			{
				Name:          "test",
				Url:           "https://example.com/rss",
				DownloadDir:   filepath.Join(os.TempDir(), "test"),
				Regexp:        []string{"^test$"},
				ExcludeRegexp: []string{"^test$"},
			},
		},
	}

	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	_ = encoder.Encode(cf)

	data, err := toml.Marshal(cf)
	require.NoError(t, err)

	t.Log(string(data))
}
