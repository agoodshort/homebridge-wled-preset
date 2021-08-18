import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback, CharacteristicGetCallback } from 'homebridge';

import { WledPresetPlatform } from './platform';

import { request, RequestOptions } from 'http';
import { parseString } from 'xml2js';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class WledPresetAccessory {
  private service: Service;
  private presetService: Service;
  private presetInUse: number | undefined;

  constructor(
    private readonly platform: WledPresetPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly ip: string,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'AirCookie')
      .setCharacteristic(this.platform.Characteristic.Model, 'WLED')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(this.platform.Characteristic.Name, accessory.context.device.exampleDisplayName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on('set', this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

    // register handlers for the Brightness Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .on('set', this.setBrightness.bind(this))        // SET - bind to the 'setBrightness` method below
      .on('get', this.getBrightness.bind(this));       // GET - bind to the 'GetBrightness` method below


    // Preset Television
    this.presetService = this.accessory.getService(this.platform.Service.Television) ||
    this.accessory.addService(this.platform.Service.Television);
    this.presetService.setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Effects');

    this.presetService.setCharacteristic(this.platform.Characteristic.SleepDiscoveryMode,
      this.platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE); // Set sleep discovery characteristics

    // handle on / off events using the Active characteristic
    // Allows to turn on / off with the TV button
    this.presetService.getCharacteristic(this.platform.Characteristic.Active)
      .on('set', (newValue, callback) => {
        this.setOn(newValue, callback);
      });

    // Used to set for the first time starting
    if (this.presetInUse === undefined) {
      this.presetInUse = 1;
    }
    this.presetService.setCharacteristic(this.platform.Characteristic.ActiveIdentifier, this.presetInUse);
    
    // handle input source changes
    this.presetService.getCharacteristic(this.platform.Characteristic.ActiveIdentifier)
      .on('set', (newValue, callback) => {

        // the value will be the value you set for the Identifier Characteristic
        // on the Input Source service that was selected - see input sources below.

        this.performRequestPreset(
          {
            host: this.ip,
            path: '/win&PL=' + newValue,
            method: 'GET',
          },
        )
          .then(response => {
            if (typeof response === 'string'){
              const stringValue = response.replace(/\W/gi, '');
              const value :number = +stringValue;
              this.platform.log.info('Trying to set Preset to -> ', newValue.toString());
              this.platform.log.debug('Preset is -> ', value.toString());
              this.presetInUse = value;
              callback(null);
            }
          })
          .catch(error => {
            callback(error);
            this.platform.log.debug(error);
          });

        // this.platform.log.debug('set Active Identifier -> ' + newValue);

        // this.performRequestPreset(
        //   {
        //     host: this.ip,
        //     path: '/win&PL=' + (+!!newValue),
        //     method: 'GET',
        //   },
        // )
        //   .then(response => {
        //     if (typeof response === 'string'){
        //       callback(null);
        //       this.platform.log.info('Trying to set Preset to -> ', newValue.toString());
        //       this.platform.log.info('Set Preset response -> ', response.toString());
        //     }
        //   })
        //   .catch(error => {
        //     callback(error);
        //     this.platform.log.debug(error);
        //   });
      });

    const effectInputSource = this.accessory.getService('p1') || 
    this.accessory.addService(this.platform.Service.InputSource, 'p1', 'Preset 1');
    effectInputSource
      .setCharacteristic(this.platform.Characteristic.Identifier, 1)
      .setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Preset 1')
      .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.HDMI);
    this.presetService.addLinkedService(effectInputSource);

    const effectInputSource2 = this.accessory.getService('p2') || 
    this.accessory.addService(this.platform.Service.InputSource, 'p2', 'Preset 2');
    effectInputSource2
      .setCharacteristic(this.platform.Characteristic.Identifier, 2)
      .setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Preset 2')
      .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.HDMI);
    this.presetService.addLinkedService(effectInputSource2); 

    const effectInputSource3 = this.accessory.getService('p3') || 
    this.accessory.addService(this.platform.Service.InputSource, 'p3', 'Preset 3');
    effectInputSource3
      .setCharacteristic(this.platform.Characteristic.Identifier, 3)
      .setCharacteristic(this.platform.Characteristic.ConfiguredName, 'Preset 3')
      .setCharacteristic(this.platform.Characteristic.IsConfigured, this.platform.Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(this.platform.Characteristic.InputSourceType, this.platform.Characteristic.InputSourceType.HDMI);
    this.presetService.addLinkedService(effectInputSource3); 

    /**
     * Updating characteristics values asynchronously.
     * 
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     * 
     */
    // let motionDetected = false;
    // setInterval(() => {
    //   // EXAMPLE - inverse the trigger
    //   motionDetected = !motionDetected;

    //   // push the new value to HomeKit
    //   motionSensorOneService.updateCharacteristic(this.platform.Characteristic.MotionDetected, motionDetected);
    //   motionSensorTwoService.updateCharacteristic(this.platform.Characteristic.MotionDetected, !motionDetected);

    //   this.platform.log.debug('Triggering motionSensorOneService:', motionDetected);
    //   this.platform.log.debug('Triggering motionSensorTwoService:', !motionDetected);
    // }, 10000);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    this.performRequestBrightness(
      {
        host: this.ip,
        path: '/win&T=' + (+!!value), // Why +!! 
        method: 'GET',
      },
    )
      .then(response => {
        if (typeof response === 'string'){
          callback(null);
          this.platform.log.info('Set on -> Brightness lvl: ', response);
        }
      })
      .catch(error => {
        callback(error);
        this.platform.log.debug(error);
      });
  }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   * 
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   * 
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  getOn(callback: CharacteristicGetCallback) {

    this.performRequestBrightness(
      {
        host: this.ip,
        path: '/win',
        method: 'GET',
      },
    )
      .then(response => {
        if (typeof response === 'string'){
          if (response === '["0"]') {
            callback(null, false);
            this.platform.log.debug('WLED is off');
          } else {
            callback(null, true);
            this.platform.log.debug('WLED is on');
          }
        }
      })
      .catch(error => {
        callback(error);
        this.platform.log.debug(error);
      });
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of the accessory (i.e. changing the Brightness)
   */
  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    this.performRequestBrightness(
      {
        host: this.ip,
        path: '/win&A=' + value,
        method: 'GET',
      },
    )
      .then(() => {
        callback(null);
        this.platform.log.info('Set Brightness -> ', value);
      })
      .catch(error => {
        callback(error);
        this.platform.log.debug(error);
      });
  }

  /**
   * Handle "GET" requests from HomeKit for Brightness
   */
  getBrightness(callback: CharacteristicSetCallback) {

    this.performRequestBrightness(
      {
        host: this.ip,
        path: '/win',
        method: 'GET',
      },
    )
      .then(response => {
        if (typeof response === 'string'){
          const stringValue = response.replace(/\W/gi, '');
          const value :number = +stringValue;
          callback(null, value/255*100);
          this.platform.log.debug('Brightness level is ->', value.toString());
        }
      })
      .catch(error => {
        callback(error);
        this.platform.log.debug(error);
      });
  }

  /**
   * ======================================================================
   * Request methods
   * ======================================================================
   */
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

  performRequestBrightness(options :RequestOptions) {
    return new Promise((resolve, reject) => {
      request(
        options,
        (response) => {
          const { statusCode } = response;
          if (statusCode) {
            if (statusCode >= 300) {
              reject(
                new Error(response.statusMessage),
              );
            }
          }
          const chunks :Uint8Array[] = [];
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
        },
      )
        .end();
    });
  }
      
  performRequestPreset(options :RequestOptions) {
    return new Promise((resolve, reject) => {
      request(
        options,
        (response) => {
          const { statusCode } = response;
          if (statusCode) {
            if (statusCode >= 300) {
              reject(
                new Error(response.statusMessage),
              );
            }
          }
          const chunks :Uint8Array[] = [];
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
        },
      )
        .end();
    });
  }
}
