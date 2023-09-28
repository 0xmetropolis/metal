# Changelog

All notable changes to the Metropolis CLI will be listed in this file.

## [0.5.1] - 2023-09-28

- chore: Update url from `metropolish.sh` to `metal.build`
  [94](https://github.com/0xmetropolis/cli/pull/94)

## [0.5.0] - 2023-09-28

- chore: Update command from `metro` to `metal` [88](https://github.com/0xmetropolis/cli/pull/88)

## [0.4.1] - 2023-09-28

- chore: Update readme for Metal [93](https://github.com/0xmetropolis/cli/pull/93)

## [0.4.0] - 2023-09-26

- fix: make import paths relative by @colinnielsen in
  [83](https://github.com/0xmetropolis/cli/pull/83)
- feat: add $ metro auth by @colinnielsen in [84](https://github.com/0xmetropolis/cli/pull/84)
- feat: check user registration by @colinnielsen in
  [85](https://github.com/0xmetropolis/cli/pull/85)
- feat: put deployments into the user's default project by @colinnielsen in
  [86](https://github.com/0xmetropolis/cli/pull/86)

## [0.3.1] - 2023-09-18

- fix: allow remote-less origins by @colinnielsen in
  [81](https://github.com/0xmetropolis/cli/pull/81)
- fix: preview links on monorepos by @colinnielsen in
  [82](https://github.com/0xmetropolis/cli/pull/82)

## [0.3.0] - 2023-09-12

- Metro deploy command by @colinnielsen in [77](https://github.com/0xmetropolis/cli/pull/77)
- Heyitschun/update readme by @heyitschun in [79](https://github.com/0xmetropolis/cli/pull/79)
- Metro import command by @colinnielsen in [78](https://github.com/0xmetropolis/cli/pull/78)

## [0.2.3] - 2023-08-24

- feat: remove requirement for the `--broadcast` flag by @colinnielsen in
  [#75](https://github.com/0xmetropolis/cli/pull/75)

## [0.2.2] - 2023-08-22

- chore(dev-deps): bump @types/node from 18.17.4 to 18.17.5 by @dependabot in
  [#67](https://github.com/0xmetropolis/cli/pull/67)
- chore(dev-deps): bump eslint from 8.46.0 to 8.47.0 by @dependabot in
  [#66](https://github.com/0xmetropolis/cli/pull/66)
- fix: normalize git remotes by @colinnielsen in [#68](https://github.com/0xmetropolis/cli/pull/68)
- feat: walk out dir by @colinnielsen in [#71](https://github.com/0xmetropolis/cli/pull/71)
- chore: add log debugs by @colinnielsen in [#74](https://github.com/0xmetropolis/cli/pull/74)
- chore: kill dependabot by @colinnielsen in [#72](https://github.com/0xmetropolis/cli/pull/72)
- chore: remove unsafe-rpc-overide description by @colinnielsen in
  [#73](https://github.com/0xmetropolis/cli/pull/73)

## [0.1.5] - 2023-08-02

### Fixed

- bugfix: Use git --version instead of git -v by @kevinweaver in #52

## [0.1.4] - 2023-07-31

### Added

- Surface git repo information to the preview
- feat: ✨ Parse git repo by @colinnielsen in #43
- chore(dev-deps): bump eslint-config-prettier from 8.8.0 to 8.9.0 by @dependabot in #48
- chore(dev-deps): bump @types/node from 18.16.19 to 18.17.1 by @dependabot in #49
- chore(dev-deps): bump eslint from 8.45.0 to 8.46.0 by @dependabot in #50
- chore(dev-deps): bump jest from 29.6.1 to 29.6.2 by @dependabot in #51
- feat!: 0.1.4 Release by @colinnielsen in #47

### Fixed

- ci: 🔖 update dist files by @kevinweaver in #46

## [0.1.3] - 2023-07-26

### Fixed

- ci: 🔖 update dist files by @kevinweaver in #46

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
- feat: :sparkles: point txs to fork by @colinnielsen in
  [#27](https://github.com/0xmetropolis/cli/pull/27)
- chore(dev-deps): bump @types/jest from 29.5.2 to 29.5.3 by @dependabot in
  [#28](https://github.com/0xmetropolis/cli/pull/28)
- chore(dev-deps): bump @typescript-eslint/eslint-plugin from 5.61.0 to 5.62.0 by @dependabot in
  [#29](https://github.com/0xmetropolis/cli/pull/29)
- chore(dev-deps): bump eslint from 8.44.0 to 8.45.0 by @dependabot in
  [#31](https://github.com/0xmetropolis/cli/pull/31)
- Get Contract ABIs by @colinnielsen in [#33](https://github.com/0xmetropolis/cli/pull/33)
- 0.1.0 release by @colinnielsen in [#34](https://github.com/0xmetropolis/cli/pull/34)

### Removed

- `preview` no longer sends raw source code to metropolis to generate a preview URL.

## [0.0.1] - 2023-07-12

### Added

- Initial release with basic functionality and help menu.
- A `preview` command that takes a foundry deployment script and generates a static metropolis url.

### Fixed

- Broken window in ASCII art skyscraper.
