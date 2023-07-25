# Changelog

All notable changes to the Metropolis CLI will be listed in this file.

## [0.1.1] - 2023-07-25

### Added

- `preview` command now runs with forge `--slow` flag.

## [0.1.0] - 2023-07-25

### Added

- `preview` command now sends contract ABIs to metropolis to generate a preview URL.
- Adds `NO_PREVIEW_SERVICE` env var to skip making real requests for testing and CI.

### Removed

- `preview` no longer sends raw source code to metropolis to generate a preview URL.

## [0.0.1] - 2023-07-12

### Added

- Initial release with basic functionality and help menu.
- A `preview` command that takes a foundry deployment script and generates a static metropolis url.

### Fixed

- Broken window in ASCII art skyscraper.
