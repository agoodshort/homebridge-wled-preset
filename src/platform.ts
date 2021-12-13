import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { WledPresetAccessory } from './platformAccessory';

import fetch from 'node-fetch'; // https://www.npmjs.com/package/node-fetch


/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class WledPresetPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(public readonly log: Logger, public readonly config: PlatformConfig, public readonly api: API) {

    if (!this.config){
      return;
    }

    if (!this.config.wleds) {
      this.log.info('No WLEDs have been configured');
    }

    this.log.debug('Finished initializing platform:', this.config.name);

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      const wledDevices = this.retrieveDevicesFromConfig();
      this.registerDevices(wledDevices);
    });
  }

  /* ------------------------------------------------------------------------------------------------------------------------------- */
  /* METHODS */

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory); 
  }

  /**
   * Retrieve devices from the config.json file
   */
  retrieveDevicesFromConfig() {
    const wledsRecord = this.config.wleds as Record<string, Array<string>>;
    const wledDevices: { displayName: string; ip: string; presetsNb: number }[] = [];
        
    for (const k in wledsRecord) {
      this.log.info('Retrieving settings from config file:', wledsRecord[k]['name']);
      wledDevices.push({
        displayName: wledsRecord[k]['name'] as string,
        ip: wledsRecord[k]['ip'] as string,
        presetsNb: wledsRecord[k]['presetsNb'] as number,
      });
    }
    return wledDevices;
  }

  /**
   * Register an array of WLED devices as accessories in Homebridge
   * 
   * @param wledDevices array of WLED devices
   */
  registerDevices(wledDevices: { displayName: string; ip: string; presetsNb: number }[]) {

    // loop over the retrieved devices and register each one if it has not already been registered
    for (const device of wledDevices) {
      this.log.debug('Making sure ' + device.displayName + ' is reachable...');
      fetch('http://' + device.ip + '/win') // https://livecodestream.dev/post/5-ways-to-make-http-requests-in-javascript/#fetch
        .then(response => {
          if (!response.ok) {
            this.log.error('Request to ' + device.displayName + ' failed with status ${response.status}');
          } else {
            this.log.info(device.displayName + ' is reachable');

            // generate a unique id for the accessory from IP address
            const uuid = this.api.hap.uuid.generate(device.ip);

            // see if an accessory with the same uuid has already been registered and restored from
            // the cached devices we stored in the `configureAccessory` method above
            const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

            if (existingAccessory) {
            // the accessory already exists
              this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

              // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. eg.:
              existingAccessory.context.device = device;
              this.api.updatePlatformAccessories([existingAccessory]);

              // create the accessory handler for the restored accessory
              // this is imported from `platformAccessory.ts`
              new WledPresetAccessory(
                this,
                existingAccessory,
                device.displayName,
                device.ip,
                device.presetsNb,
              );

              // update accessory cache with any changes to the accessory details and information
              this.api.updatePlatformAccessories([existingAccessory]);

            } else {
            // the accessory does not yet exist, so we need to create it
              this.log.info('Adding new accessory:', device.displayName);

              // create a new accessory
              const accessory = new this.api.platformAccessory(
                device.displayName,
                uuid,
              );

              // store a copy of the device object in the `accessory.context`
              // the `context` property can be used to store any data about the accessory you may need
              accessory.context.device = device;

              // create the accessory handler for the newly create accessory
              // this is imported from `platformAccessory.ts`
              new WledPresetAccessory(this, accessory, device.displayName, device.ip, device.presetsNb);

              // link the accessory to your platform
              this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
            }
          }
        })
        .catch(error => {
          this.log.error(device.displayName + ': ' + error);
          const uuid = this.api.hap.uuid.generate(device.ip);
          const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

          // remove platform accessory when no longer present
          if (existingAccessory) {
            this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
            this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
          }
        });
    }
  }
}

