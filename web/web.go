package web

import "embed"

//go:embed all:out/*
var Page embed.FS
