# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.4] - UNRELEASED
### Fixed
- Preventing showing up the commit message editor when merging using `npm version patch`
- Fixed failed [publish action](https://github.com/goodshort/homebridge-wled-preset/actions/runs/1585543103) `The workflow is not valid. .github/workflows/publish.yml (Line: 10, Col: 3): The workflow must contain at least one job with no dependencies.`

## [0.5.4] - 2021-12-16
### Changed
- Merging and publishing improvements

## [0.5.3] - 2021-12-16
### Added
- Can use hostname in config file
- Automation in [package.json](package.json) and [workflows](.github/workflows/)

## [0.5.0] - 2021-12-13
### Added
- Better cached accessories handling

### Fixed
- When a WLED device is not reachable, the plugin should ignore it

## [0.4.0] - 2021-12-03
### Added
- Supports multiple WLED devices
- Additional information in plugin **SETTINGS**

## [0.3.0] - 2021-12-03
### Added
- Get handler for Active Identifier characteristic

### Changed
- Fully reviewed and cleaned up [platformAccessory.ts](src/platformAccessory.ts)
- Plugin is now only using the Television Service Type

### Removed
- Users are now unable to create a second platform as it breaks the plugin 

### Fixed
- Plugin does not turn on the WLED device at Homebridge start up

## [0.2.0] - 2021-12-03

Displaying the plugin as a combination of Lightbulb and Television Service Types

Issues:
- *Lightbulb brightness slider* and *TV Active button* are not syncing with each others
- *TV Active button* does not get updated if WLED is activated from another utility (e.g. WLED web interface, postman...)