package main

import (
	"encoding/json"
	"errors"
	"io/fs"
	"log/slog"
	"net/http"

	"github.com/Asutorufa/transmission-rss/web"
)

func cross(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, PATCH, OPTIONS, HEAD")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Token")
	w.Header().Set("Access-Control-Expose-Headers", "Access-Control-Allow-Headers, Token")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
}

func HandleFront(mux *http.ServeMux) {
    ffs, err := fs.Sub(web.Page, "out")
    if err != nil {
        panic(err)
    }
    // "/" also serves Vite's /assets/* paths. No Next.js route map is needed.
    mux.Handle("GET /", http.FileServer(http.FS(ffs)))
}

func route() http.Handler {
	mux := http.NewServeMux()

	mux.Handle("OPTIONS /", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cross(w)
	}))

	ServerHTTP(mux, "GET /start_job", func(w http.ResponseWriter, r *http.Request) error {
		select {
		case ch <- struct{}{}:
			return nil
		case <-r.Context().Done():
			return r.Context().Err()
		}
	})

	ServerHTTP(mux, "GET /api/v1/status", func(w http.ResponseWriter, r *http.Request) error {
		return json.NewEncoder(w).Encode(map[string]any{"running": job.Running()})
	})

	ServerHTTP(mux, "GET /api/v1/config", func(w http.ResponseWriter, r *http.Request) error {
		return json.NewEncoder(w).Encode(config.Load().Rss)
	})

	type UpdateRequest struct {
		Index          int  `json:"index"`
		Config         *RSS `json:"config"`
		OriginalConfig *RSS `json:"original"`
	}

	ServerHTTP(mux, "DELETE /api/v1/config", func(w http.ResponseWriter, r *http.Request) error {
		var req UpdateRequest
		err := json.NewDecoder(r.Body).Decode(&req)
		if err != nil {
			return err
		}

		configMu.Lock()
		defer configMu.Unlock()

		cf := config.Load()

		if req.Index < 0 || req.Index >= len(cf.Rss) {
			return errors.New("invalid index")
		}

		oc := cf.Rss[req.Index]

		if req.Config.Name != oc.Name || req.Config.Url != oc.Url || req.Config.DownloadDir != oc.DownloadDir || req.Config.Disabled != oc.Disabled {
			return errors.New("original config name not match")
		}

		cf.Rss = append(cf.Rss[:req.Index], cf.Rss[req.Index+1:]...)
		return saveConfig(cf)
	})

	ServerHTTP(mux, "PATCH /api/v1/config", func(w http.ResponseWriter, r *http.Request) error {
		var req UpdateRequest
		err := json.NewDecoder(r.Body).Decode(&req)
		if err != nil {
			return err
		}

		if req.Config == nil || req.OriginalConfig == nil || req.Config.Name == "" || req.Config.Url == "" || req.Config.DownloadDir == "" {
			return errors.New("invalid config")
		}

		configMu.Lock()
		defer configMu.Unlock()

		cf := config.Load()

		if req.Index < 0 || req.Index >= len(cf.Rss) {
			return errors.New("invalid index")
		}

		oc := cf.Rss[req.Index]

		if req.OriginalConfig.Name != oc.Name || req.OriginalConfig.Url != oc.Url || req.OriginalConfig.DownloadDir != oc.DownloadDir || req.OriginalConfig.Disabled != oc.Disabled {
			return errors.New("original config name not match")
		}

		cf.Rss[req.Index] = req.Config

		return saveConfig(cf)
	})

	ServerHTTP(mux, "PUT /api/v1/config", func(w http.ResponseWriter, r *http.Request) error {
		req := new(RSS)
		err := json.NewDecoder(r.Body).Decode(req)
		if err != nil {
			return err
		}

		if req.Name == "" || req.Url == "" || req.DownloadDir == "" {
			return errors.New("invalid config")
		}

		configMu.Lock()
		defer configMu.Unlock()

		cf := config.Load()

		cf.Rss = append(cf.Rss, req)

		return saveConfig(cf)
	})

	ServerHTTP(mux, "PATCH /job/disabled", func(w http.ResponseWriter, r *http.Request) error {
		cross(w)
		name := r.URL.Query().Get("name")

		configMu.Lock()
		defer configMu.Unlock()

		cf := config.Load()

		for _, v := range cf.Rss {
			if v.Name == name {
				v.Disabled = !v.Disabled
			}
		}

		return saveConfig(cf)
	})

	HandleFront(mux)

	return mux
}

func ServerHTTP(mux *http.ServeMux, pattern string, f func(w http.ResponseWriter, r *http.Request) error) {
	mux.Handle(pattern, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cross(w)
		err := f(w, r)
		if err != nil {
			slog.Error("handler failed", "pattern", pattern, "err", err)
			w.WriteHeader(500)
			_, _ = w.Write([]byte(err.Error()))
		}
	}))
}
