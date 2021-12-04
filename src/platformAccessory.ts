import {
  Service,
  PlatformAccessory,
  CharacteristicValue,
  CharacteristicSetCallback,
  CharacteristicGetCallback,
} from 'homebridge';

import { WledPresetPlatform } from './platform';

import { request, RequestOptions } from 'http';
import { parseString } from 'xml2js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class WledPresetAccessory {
  private presetService: Service;

  constructor(
    private readonly platform: WledPresetPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly ip: string,
    private readonly presetsNb: number,
  ) {
    // Set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'AirCookie')
      .setCharacteristic(this.platform.Characteristic.Model, 'WLED')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    /* ------------------------------------------------------------------------------------------------------------------------------- */

    // Get the Television service if it exists, otherwise create a new Television service
    this.presetService = 
    this.accessory.getService(this.platform.Service.Television) || this.accessory.addService(this.platform.Service.Television);

    /**
     * Implementing Required Characteristics for Television
     * see https://developers.homebridge.io/#/service/Television
     */

    // Register handlers for Active characteristic
    this.presetService
      .getCharacteristic(this.platform.Characteristic.Active)
      .on('set', this.setOn.bind(this)) // SET - bind to the `setOn` method below
      .on('get', this.getOn.bind(this)); // GET - bind to the `getOn` method below

    // Register handlers for Active Identifier Characteristic
    this.presetService
      .getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
      .on('set', this.setActiveIdentifier.bind(this)) // SET - bind to the 'setActiveIdentifier` method below
      .on('get', this.getActiveIdentifier.bind(this)); // GET - bind to the 'getActiveIdentifier` method below

    // Register Configured Name Characteristic
    this.presetService.setCharacteristic(this.platform.Characteristic.ConfiguredName, accessory.context.device.displayName);

    // Register Sleep Discovery Mode Characteristic
    this.presetService.setCharacteristic(
      this.platform.Characteristic.SleepDiscoveryMode, this.platform.Characteristic.SleepDiscoveryMode.NOT_DISCOVERABLE);

    /* ------------------------------------------------------------------------------------------------------------------------------- */

    /**
     * Generate existing presets from the WLED interface as inputs
     * If value returned from GET request is different than the one used, the preset ID does not exists
     * The value cannot be higher than 250 based on documentation https://kno.wled.ge/interfaces/http-api/
     */
    for (let i = 1; i <= this.presetsNb; i++) {
      this.platform.log.debug('Looking for preset ' + i);
      this.performRequestPreset({
        host: this.ip,
        path: '/win&PL=' + i,
        method: 'GET',
      })
        .then((response) => {
          if (typeof response === 'string') {
            const stringValue = response.replace(/\W/gi, '');
            const value: number = +stringValue;

            if (value === i) {
              // TO-DO move to a method
              this.platform.log.debug('Creating preset ' + i);
              const serviceName: string = 'p' + i;
              const presetName: string = 'Preset ' + i;

              this['effectInputSource' + i] =
                this.accessory.getService(serviceName) ||
                this.accessory.addService(this.platform.Service.InputSource, serviceName, presetName);
              this['effectInputSource' + i]
                .setCharacteristic(this.platform.Characteristic.Identifier, i)
                .setCharacteristic(this.platform.Characteristic.ConfiguredName, presetName)
                .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
                .setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.HDMI);
              this.presetService.addLinkedService(this['effectInputSource' + i]);
            } else {
              this.platform.log.debug('Preset ' + i + ' does not exists');
            }
          }
        })
        .catch((error) => {
          this.platform.log.debug(error);
        });
    }
  }

  /* ------------------------------------------------------------------------------------------------------------------------------- */
  /* METHODS */

  /**
   * Set handler for Active characteristic
   * TO-DO: Detail steps taken by method
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.performRequestBrightness({
      host: this.ip,
      path: '/win&T=' + value, // Master Off/On/Toggle - https://kno.wled.ge/interfaces/http-api/#led-control
      method: 'GET',
    })
      .then((response) => {
        if (typeof response === 'string') {
          if (response === '["0"]') {
            this.platform.log.info('Turning off WLED');
          } else {
            this.platform.log.info('Turning on WLED');
          }
          this.platform.log.debug('Set on -> Sending GET request: ' + this.ip + '/win&T=' + value);
          this.platform.log.debug('Set on -> response: ' + response);
          callback(null);
        }
      })
      .catch((error) => {
        callback(error);
        this.platform.log.debug(error);
      });
  }

  /**
   * Get handler for Active characteristic
   * TO-DO: Detail steps taken by method
   */
  getOn(callback: CharacteristicGetCallback) {
    this.performRequestBrightness({
      host: this.ip,
      path: '/win',
      method: 'GET',
    })
      .then((response) => {
        if (typeof response === 'string') {
          this.platform.log.debug('Get On -> Brightness:' + response);
          if (response === '["0"]') {
            callback(null, 0);
          } else {
            callback(null, 1);
          }
        }
      })
      .catch((error) => {
        callback(error);
        this.platform.log.debug(error);
      });
  }

  /**
   * Get handler for Active Identifier characteristic
   * TO-DO: Detail steps taken by method
   */
  getActiveIdentifier(callback: CharacteristicSetCallback) {
    this.performRequestPreset({
      host: this.ip,
      path: '/win',
      method: 'GET',
    })
      .then((response) => {
        if (typeof response === 'string') {
          const stringValue = response.replace(/\W/gi, '');
          const answerValue: number = +stringValue;
          this.platform.log.info('Preset is set to ' + answerValue.toString());
          callback(null, answerValue);
        }
      })
      .catch((error) => {
        callback(error);
        this.platform.log.debug(error);
      });
  }
   
  /**
   * Set handler for Active Identifier characteristic
   * TO-DO: Detail steps taken by method
   */
  setActiveIdentifier(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.performRequestPreset({
      host: this.ip,
      path: '/win&PL=' + value, // Applies entire preset - https://kno.wled.ge/interfaces/http-api/#presets
      method: 'GET',
    })
      .then((response) => {
        if (typeof response === 'string') {
          const stringValue = response.replace(/\W/gi, '');
          const answerValue: number = +stringValue;
          this.platform.log.debug('Set Active Identifier -> Trying to set Preset to: ' + value.toString());
          this.platform.log.debug('Set Active Identifier -> Sending GET request: ' + this.ip + '/win&PL=' + value);
          this.platform.log.info('Preset set to ' + answerValue.toString());
          // const keys = Object.keys(presets) as Array<string>;
          // // const keys = Object.keys(presets);
          // this.platform.log.debug(keys[1]);
          // this.platform.log.debug(keys[0]);
          // for (const k in presets) {
          //   const value = presets[k] as string;
          //   this.platform.log.debug(value);
          // }
          callback(null);
        }
      })
      .catch((error) => {
        callback(error);
        this.platform.log.debug(error);
      });
  }

  /* ------------------------------------------------------------------------------------------------------------------------------- */
  /* REQUEST METHODS */

  /**
   * Send a HTTP request and returns a promise with a JSON
   * workflow from: https://wanago.io/2019/03/18/node-js-typescript-6-sending-http-requests-understanding-multipart-form-data/
   * Response JSON mapping: https://github.com/Aircoookie/WLED/wiki/HTTP-request-API
   * @param options parameters to use for the HTTP request
   *
   * @example
   *  performRequest(
   *    {
   *      host: 'jsonplaceholder.typicode.com',
   *      path: '/todos1',
   *      method: 'GET',
   *     },
   *     )
   *     .then(response => {
   *       this.platform.log.debug(response);
   *     })
   *     .catch(error => {
   *       this.platform.log.debug(error);
   *     });
   */

  performRequestBrightness(options: RequestOptions) {
    return new Promise((resolve, reject) => {
      request(options, (response) => {
        const { statusCode } = response;
        if (statusCode) {
          if (statusCode >= 300) {
            reject(new Error(response.statusMessage));
          }
        }
        const chunks: Uint8Array[] = [];
        response.on('data', (chunk) => {
          chunks.push(chunk);
        });
        response.on('end', () => {
          const resultXML = Buffer.concat(chunks).toString();
          parseString(resultXML, (err, result) => {
            if (err) {
              throw err;
            }
            const json = JSON.stringify(result.vs.ac);
            resolve(json);
          });
        });
      }).end();
    });
  }

  performRequestPreset(options: RequestOptions) {
    return new Promise((resolve, reject) => {
      request(options, (response) => {
        const { statusCode } = response;
        if (statusCode) {
          if (statusCode >= 300) {
            reject(new Error(response.statusMessage));
          }
        }
        const chunks: Uint8Array[] = [];
        response.on('data', (chunk) => {
          chunks.push(chunk);
        });
        response.on('end', () => {
          const resultXML = Buffer.concat(chunks).toString();
          parseString(resultXML, (err, result) => {
            if (err) {
              throw err;
            }
            const json = JSON.stringify(result.vs.ps);
            resolve(json);
          });
        });
      }).end();
    });
  }
}
