package web

import "testing"

func TestPage(t *testing.T) {
	d, err := Page.ReadDir("out")
	if err != nil {
		t.Fatal(err)
	}
	for _, v := range d {
		t.Log(v.Name())
	}
}
