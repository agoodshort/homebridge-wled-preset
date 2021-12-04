# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2021-12-03
### Added
- Get handler for Active Identifier characteristic

### Changed
- Fully reviewed and cleaned up [platformAccessory.ts](platformAccessory.ts)
- Plugin is now only using the Television Service Type

### Removed
- Users are now unable to create a second platform as it breaks the plugin 

### Fixed
- Plugin does not turn on LED strip at Homebridge start up

## [0.2.0] - 2021-12-03

Displaying the plugin as a combination of Lightbulb and Television Service Types

Issues:
- *Lightbulb brightness slider* and *TV Active button* are not syncing with each others
- *TV Active button* does not get updated if WLED is activated from another utility (e.g. WLED web interface, postman...)