package main

import (
	"net/http"
	"os"
	"testing"
)

func TestCheckOrigin(t *testing.T) {
	tests := []struct {
		name    string
		origin  string
		host    string
		envHost string
		want    bool
	}{
		{
			name:   "empty origin",
			origin: "",
			host:   "localhost:8080",
			want:   true,
		},
		{
			name:   "matching host and origin",
			origin: "http://localhost:5173",
			host:   "localhost:8080",
			want:   false,
		},
		{
			name:   "mismatched host and origin",
			origin: "http://evil.com",
			host:   "localhost:8080",
			want:   false,
		},
		{
			name:    "allowed via env",
			origin:  "http://example.com",
			host:    "localhost:8080",
			envHost: "http://example.com",
			want:    true,
		},
		{
			name:    "not allowed via env mismatch",
			origin:  "http://evil.com",
			host:    "localhost:8080",
			envHost: "http://example.com",
			want:    false,
		},
		{
			name:   "invalid origin URL",
			origin: ":",
			host:   "localhost:8080",
			want:   false,
		},
		{
			name:   "matching domain without port but mismatching on port",
			origin: "http://mygame.com:8080",
			host:   "mygame.com",
			want:   false,
		},
		{
			name:   "matching domain and matching port",
			origin: "http://mygame.com:8080",
			host:   "mygame.com:8080",
			want:   true,
		},
		{
			name:    "wildcard allowed",
			origin:  "http://evil.com",
			host:    "localhost:8080",
			envHost: "*",
			want:    true,
		},
		{
			name:    "multiple allowed via env",
			origin:  "http://example.com",
			host:    "localhost:8080",
			envHost: "http://other.com, http://example.com",
			want:    true,
		},
		{
			name:    "multiple allowed via env mismatch",
			origin:  "http://evil.com",
			host:    "localhost:8080",
			envHost: "http://other.com, http://example.com",
			want:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envHost != "" {
				os.Setenv("ALLOWED_ORIGIN", tt.envHost)
				defer os.Unsetenv("ALLOWED_ORIGIN")
			} else {
				os.Unsetenv("ALLOWED_ORIGIN")
			}

			req := &http.Request{
				Header: http.Header{},
				Host:   tt.host,
			}
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}

			if got := checkOrigin(req); got != tt.want {
				t.Errorf("checkOrigin() = %v, want %v (origin=%q, host=%q)", got, tt.want, tt.origin, tt.host)
			}
		})
	}
}
