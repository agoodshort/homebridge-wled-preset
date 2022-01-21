[![wakatime](https://wakatime.com/badge/github/goodshort/homebridge-wled-preset.svg)](https://wakatime.com/badge/github/goodshort/homebridge-wled-preset)

# Homebridge WLED Preset Plugin

<img src="https://github.com/goodshort/homebridge-wled-preset/blob/master/WIP.png" width="150">

## Description

This Plugin is designed to easily switch presets configured on your WLED appliances through HomeKit.

### Expected behaviour

TODO

## Installation

### With Homebridge Config UI X

1. Login to the [Homebridge UI](https://github.com/oznu/homebridge-config-ui-x) web interface by going to `http://homebridge.local` or `http://<ip address of your server>:8581` 
2. In the *Plugin* tab, search for `Homebridge WLED Preset`
3. Click **INSTALL**
4. Once the installation is complete, open the **SETTINGS** of the plugin and fill out the required fields

### Through Command Line/SSH

1. SSH or open a Terminal on your Homebridge host
2. Run `npm install -g homebridge-wled-preset`
3. Update your configuration file using the sample [below](#configuration).

## Configuration

Configuration sample:

```json
"platforms": [
    {
        "wleds": [
            {
                "name": "Office Led Strip",
                "ip": "wled-office.local",
                "presetsNb": 5
            },
            {
                "name": "Bedroom Led Strip",
                "ip": "192.168.1.31",
                "presetsNb": 2
            }
        ],
        "platform": "WledPreset"
    }
]
```

## Issues/Troubleshooting

### Review open issues

If you face any issues with the plugin, please review [the open issues](https://github.com/goodshort/homebridge-wled-preset/issues). Your issue might have already been mentioned by another user.

### Troubleshooting

You might encounter issues with cached accessory or configuration not reloading, being updated properly. Feel free to mention this by [opening a new issue](https://github.com/goodshort/homebridge-wled-preset/issues/new/choose).

You can remove cached accessories directly from the Homebirdge UI with the "Remove Single Cached Accessory" feature or by editing/deleting the `~/.homebridge/accessories` folder.

### Opening a new issue

If the troubleshooting steps above or [the open issues](https://github.com/goodshort/homebridge-wled-preset/issues) did not help you to fix your problem. Please review briefly the [closed issues](https://github.com/goodshort/homebridge-wled-preset/issues?q=is%3Aissue+is%3Aclosed) to see if your problem is mentioned of them. If it is, feel free to post a comment on it and I will reopen the issue or create a new one.

Otherwise, feel free to [open a new issue](https://github.com/goodshort/homebridge-wled-preset/issues/new/choose) providing as much information as possible to reproduce your situation/error message.

## Development

Development is happening on [development branch](https://github.com/goodshort/homebridge-wled-preset/tree/development).

This plugin is based on the [template Homebridge platform plugin](https://github.com/homebridge/homebridge-plugin-template/) and the [accessory example](https://github.com/homebridge/homebridge-examples/tree/master/accessory-example-typescript).

Got some inspiration from [Homebridge Simple WLED](https://github.com/jstrausd/homebridge-simple-wled).

### When ready to merge to master and publish to npmjs

```bash
# major update / breaking changes
npm version major

# minor update / new features
npm version update

# patch / bugfixes
npm version patch
```

1. `npm version XXX` will run the command `git checkout master && git merge development && git push` from [package.json](package.json)
2. The push on master will trigger [build.yml](.github/workflows/build.yml) and then [publish.yml](.github/workflows/publish.yml)

### To-Do
- [ ] Get [verified](https://github.com/homebridge/verified)
- [ ] Finish mDNS discovery of accessories
- [ ] Add more details in the configuration (README, config.schema.json)
- [ ] Can we use the brightness slider?
- [ ] Work on the [issues](https://github.com/goodshort/homebridge-wled-preset/issues)
- [ ] Discover the amount of presets
- [ ] Use MAC address instead of IP address as unique identifier
- [ ] Does mDNS works constantly not only at start-up?
- [ ] Let user define a defaut preset?