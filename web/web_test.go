package web

import (
    "strings"
    "testing"
)

func TestEmbeddedViteBuild(t *testing.T) {
    index, err := Page.ReadFile("out/index.html")
    if err != nil { t.Fatal(err) }
    html := string(index)
    if !strings.Contains(html, `id="root"`) { t.Fatal("Vite root element missing") }
    if !strings.Contains(html, "/assets/") { t.Fatal("missing compiled Vite assets") }
    entries, err := Page.ReadDir("out/assets")
    if err != nil { t.Fatal(err) }
    if len(entries) == 0 { t.Fatal("assets directory is empty") }
}
