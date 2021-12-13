# Homebridge WLED Preset Plugin

<img src="https://github.com/goodshort/homebridge-wled-preset/blob/master/WIP.png" width="150">

## Description

This Plugin is designed to easily switch presets configured on your WLED appliances through HomeKit.

## Development

This is a plugin to easily switch between the different presets you have on your WLED. Development is happening on [development branch](https://github.com/goodshort/homebridge-wled-preset/tree/development).

This plugin is based on the [template Homebridge platform plugin](https://github.com/homebridge/homebridge-plugin-template/) and the [accessory example](https://github.com/homebridge/homebridge-examples/tree/master/accessory-example-typescript).

Got some inspiration from [Homebridge Simple WLED](https://github.com/jstrausd/homebridge-simple-wled).

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
                "ip": "192.168.1.30",
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

### Issues/Troubleshooting

### Open issues

If you face any issues with this plugin, please review [the open issues](https://github.com/goodshort/homebridge-wled-preset/issues).

### Troubleshooting

You might encounter issues with cached accessory or configuration not reloading, being updated properly. Feel free to mention this by [opening a new issue](https://github.com/goodshort/homebridge-wled-preset/issues/new/choose).

You can remove cached accessories directly from the Homebirdge UI with the "Remove Single Cached Accessory" feature or by editing/deleting the `~/.homebridge/accessories` folder.

### Opening a new issue

If the steps above or [the open issues](https://github.com/goodshort/homebridge-wled-preset/issues) did not help you to fix your problem, feel free to [open a new issue](https://github.com/goodshort/homebridge-wled-preset/issues/new/choose) providing as much information as possible.


## To-Do
- [ ] Get [verified](https://github.com/homebridge/verified)
- [ ] Auto discovery of accessories
- [ ] Possibility to use hostname (not only IP address)
- [ ] Implement `node-fetch` on in [platformAccessory.ts](src/platformAccessory.ts)
- [ ] Add more details in the configuration (README, config.schema.json)
- [ ] Can we use the brightness slider?
- [ ] Work on the [issues](https://github.com/goodshort/homebridge-wled-preset/issues)