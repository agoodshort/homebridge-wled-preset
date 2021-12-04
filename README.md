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

**At the moment, the plugin is unable to support multiple WLED accessories.**

Configuration sample:

```json
"platforms": [
    {
        "name": "Office WLED",
        "ip": "192.168.1.30",
        "presetsNb": 5,
        "platform": "WledPreset"
    }
]
```

## To-Do
- [ ] Get [verified](https://github.com/homebridge/verified)
- [ ] Support multiple WLED accessories
- [ ] Auto discovery of accessories
- [ ] Can use hostname
- [ ] Complete CHANGELOG.md and publish to version v0.3.0
- [ ] Add more details in the configuration section