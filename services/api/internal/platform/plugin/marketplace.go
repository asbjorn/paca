package plugin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

var (
	// ErrMarketplacePluginNotFound indicates the plugin name was not found in the catalog.
	ErrMarketplacePluginNotFound = errors.New("marketplace plugin not found")
)

// MarketplaceCatalog is the root payload served by the marketplace repository.
type MarketplaceCatalog struct {
	SchemaVersion int                 `json:"schema_version"`
	Source        string              `json:"source,omitempty"`
	GeneratedAt   string              `json:"generated_at,omitempty"`
	Plugins       []MarketplacePlugin `json:"plugins"`
}

// MarketplacePlugin is one installable plugin entry from the catalog.
type MarketplacePlugin struct {
	Name          string                    `json:"name"`
	DisplayName   string                    `json:"display_name"`
	Description   string                    `json:"description"`
	Version       string                    `json:"version"`
	AvatarURL     string                    `json:"avatar_url,omitempty"`
	RepositoryURL string                    `json:"repository_url,omitempty"`
	Artifacts     MarketplacePluginArtifact `json:"artifacts"`
}

// MarketplacePluginArtifact contains downloadable plugin package URLs.
type MarketplacePluginArtifact struct {
	BackendTarGzURL    string `json:"backend_tar_gz_url"`
	FrontendTarGzURL   string `json:"frontend_tar_gz_url"`
	MigrationsTarGzURL string `json:"migrations_tar_gz_url"`
	ManifestTarGzURL   string `json:"manifest_tar_gz_url"`
}

// MarketplaceClient fetches the plugin catalog from a public URL.
type MarketplaceClient struct {
	catalogURL string
	httpClient *http.Client
}

// NewMarketplaceClient constructs a client for the given catalog URL.
func NewMarketplaceClient(catalogURL string, timeout time.Duration) *MarketplaceClient {
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	return &MarketplaceClient{
		catalogURL: catalogURL,
		httpClient: &http.Client{Timeout: timeout},
	}
}

// List returns the catalog with basic validation.
func (c *MarketplaceClient) List(ctx context.Context) (*MarketplaceCatalog, error) {
	if strings.TrimSpace(c.catalogURL) == "" {
		return nil, fmt.Errorf("marketplace catalog URL is not configured")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.catalogURL, http.NoBody)
	if err != nil {
		return nil, fmt.Errorf("marketplace: build request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("marketplace: fetch catalog: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("marketplace: catalog HTTP status %d", resp.StatusCode)
	}

	var catalog MarketplaceCatalog
	if err := json.NewDecoder(resp.Body).Decode(&catalog); err != nil {
		return nil, fmt.Errorf("marketplace: decode catalog: %w", err)
	}

	for i := range catalog.Plugins {
		if err := validateMarketplacePlugin(catalog.Plugins[i]); err != nil {
			return nil, fmt.Errorf("marketplace: invalid plugin entry %q: %w", catalog.Plugins[i].Name, err)
		}
	}

	return &catalog, nil
}

// FindPlugin returns a single plugin by reverse-DNS name.
func (c *MarketplaceClient) FindPlugin(ctx context.Context, name string) (*MarketplacePlugin, error) {
	catalog, err := c.List(ctx)
	if err != nil {
		return nil, err
	}
	for i := range catalog.Plugins {
		if catalog.Plugins[i].Name == name {
			p := catalog.Plugins[i]
			return &p, nil
		}
	}
	return nil, ErrMarketplacePluginNotFound
}

func validateMarketplacePlugin(p MarketplacePlugin) error {
	if strings.TrimSpace(p.Name) == "" {
		return fmt.Errorf("name is required")
	}
	if strings.TrimSpace(p.Version) == "" {
		return fmt.Errorf("version is required")
	}
	if strings.TrimSpace(p.Artifacts.BackendTarGzURL) == "" {
		return fmt.Errorf("artifacts.backend_tar_gz_url is required")
	}
	if strings.TrimSpace(p.Artifacts.FrontendTarGzURL) == "" {
		return fmt.Errorf("artifacts.frontend_tar_gz_url is required")
	}
	if strings.TrimSpace(p.Artifacts.MigrationsTarGz) == "" {
		return fmt.Errorf("artifacts.migrations_tar_gz_url is required")
	}
	if strings.TrimSpace(p.Artifacts.ManifestTarGzURL) == "" {
		return fmt.Errorf("artifacts.manifest_tar_gz_url is required")
	}
	return nil
}
