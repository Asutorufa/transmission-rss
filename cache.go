package main

import (
	"bytes"
	"encoding/gob"
	"io"

	"go.etcd.io/bbolt"
)

type Cache interface {
	Load(rssUrl, torrentUrl string) (*Torrent, bool)
	Store(rssUrl, torrentUrl string, t *Torrent) error
	Exist(rssUrl, torrentUrl string) bool
	Close() error
}

type cache struct {
	b *bbolt.DB
}

func NewCacheByPath(path string) (Cache, error) {
	b, err := bbolt.Open(path, 0600, nil)
	if err != nil {
		return nil, err
	}

	return &cache{b}, nil
}

func (c *cache) Load(rssUrl, torrentUrl string) (*Torrent, bool) {
	var t *Torrent
	_ = c.b.View(func(tx *bbolt.Tx) error {
		bkt := tx.Bucket([]byte(rssUrl))
		if bkt == nil {
			return nil
		}

		data := bkt.Get([]byte(torrentUrl))
		if data == nil {
			return nil
		}

		tt, err := c.parseTorrent(data)
		if err != nil {
			return err
		}

		t = tt
		return nil
	})

	return t, t != nil
}

func (c *cache) Exist(rssUrl, torrentUrl string) bool {
	exist := false
	_ = c.b.View(func(tx *bbolt.Tx) error {
		bkt := tx.Bucket([]byte(rssUrl))
		if bkt == nil {
			return nil
		}

		data := bkt.Get([]byte(torrentUrl))
		if data == nil {
			return nil
		}

		exist = true
		return nil
	})

	return exist
}

func (c *cache) RangeRss(rssUrl string) func(f func(*Torrent) bool) {
	return func(f func(*Torrent) bool) {
		_ = c.b.View(func(tx *bbolt.Tx) error {
			bkt := tx.Bucket([]byte(rssUrl))
			if bkt == nil {
				return nil
			}

			return bkt.ForEach(func(k, v []byte) error {
				tt, err := c.parseTorrent(v)
				if err != nil {
					return err
				}

				if !f(tt) {
					return io.EOF
				}

				return nil
			})
		})
	}
}

func (c *cache) Store(rssUrl, torrentUrl string, t *Torrent) error {
	return c.b.Update(func(tx *bbolt.Tx) error {
		bkt, err := tx.CreateBucketIfNotExists([]byte(rssUrl))
		if err != nil {
			return err
		}

		buf := bytes.NewBuffer(nil)
		err = gob.NewEncoder(buf).Encode(t)
		if err != nil {
			return err
		}

		return bkt.Put([]byte(torrentUrl), buf.Bytes())
	})
}

func (c *cache) Close() error {
	return c.b.Close()
}

func (c *cache) parseTorrent(b []byte) (*Torrent, error) {
	tr := &Torrent{}
	err := gob.NewDecoder(bytes.NewReader(b)).Decode(tr)
	if err == nil {
		return tr, nil
	}

	// for backward compatibility
	// we store torrent file and torrent hash directly
	tf := &TorrentFile{}
	err = gob.NewDecoder(bytes.NewReader(b)).Decode(tf)
	if err == nil {
		return &Torrent{
			TorrentFile: tf,
		}, nil
	}

	var th TorrentHash
	err = gob.NewDecoder(bytes.NewReader(b)).Decode(&th)
	if err == nil {
		return &Torrent{
			TorrentHash: &th,
		}, nil
	}

	return nil, err
}
