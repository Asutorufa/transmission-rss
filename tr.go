package main

import (
	"context"
	"net/url"

	"github.com/hekmon/transmissionrpc/v3"
)

type Transmission struct {
	cli *transmissionrpc.Client
}

func NewTransmission(rpcUrl string) (*Transmission, error) {
	url, err := url.Parse(rpcUrl)
	if err != nil {
		return nil, err
	}

	cli, err := transmissionrpc.New(url, nil)
	if err != nil {
		return nil, err
	}

	return &Transmission{
		cli: cli,
	}, nil
}

type AddArgs struct {
	DownloadDir string
	Labels      []string
}

func (t *Transmission) Add(ctx context.Context, files *Torrent, args AddArgs) error {
	_, err := t.cli.TorrentAdd(ctx, files.ToAddPayload(args))
	return err
}
