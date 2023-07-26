# Changelog

All notable changes to the Metropolis CLI will be listed in this file.

## [0.1.3] - 2023-07-26

### Fixed

- ci: 🔖 update dist files by @kevinweaver in #42

## [0.1.2] - 2023-07-26

### Added

- ci: 🔖 include dist with bundle by @colinnielsen in #41
- feat: 🔐 mock PK by default by @colinnielsen in #40
- build: 🔖 v0.1.2 🎉 by @colinnielsen in #42
- feat: 🔔s + 😙s by @colinnielsen in #44

## [0.1.1] - 2023-07-25

### Added

- `preview` command now runs with forge `--slow` flag.
- Adds `postinstall` script.

## [0.1.0] - 2023-07-25

### Added

- `preview` command now sends contract ABIs to metropolis to generate a preview URL.
- Adds `NO_PREVIEW_SERVICE` env var to skip making real requests for testing and CI.
- feat: :sparkles: point txs to fork by @colinnielsen in https://github.com/0xmetropolis/cli/pull/27
- chore(dev-deps): bump @types/jest from 29.5.2 to 29.5.3 by @dependabot in
  https://github.com/0xmetropolis/cli/pull/28
- chore(dev-deps): bump @typescript-eslint/eslint-plugin from 5.61.0 to 5.62.0 by @dependabot in
  https://github.com/0xmetropolis/cli/pull/29
- chore(dev-deps): bump eslint from 8.44.0 to 8.45.0 by @dependabot in
  https://github.com/0xmetropolis/cli/pull/31
- Get Contract ABIs by @colinnielsen in https://github.com/0xmetropolis/cli/pull/33
- 0.1.0 release by @colinnielsen in https://github.com/0xmetropolis/cli/pull/34

### Removed

- `preview` no longer sends raw source code to metropolis to generate a preview URL.

## [0.0.1] - 2023-07-12

### Added

- Initial release with basic functionality and help menu.
- A `preview` command that takes a foundry deployment script and generates a static metropolis url.

### Fixed

- Broken window in ASCII art skyscraper.
