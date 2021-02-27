import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service,
} from 'homebridge';

import { ACCESSORY_NAME, PLUGIN_NAME } from './settings';

import { request, RequestOptions } from 'http';
import { parseString } from 'xml2js';


/*
 * IMPORTANT NOTICE
 *
 * One thing you need to take care of is, that you never ever ever import anything directly from the "homebridge" module
 * (or the "hap-nodejs" module).
 * The above import block may seem like, that we do exactly that, but actually those imports are only used for types and interfaces
 * and will disappear once the code is compiled to Javascript.
 * In fact you can check that by running `npm run build` and opening the compiled Javascript file in the `dist` folder.
 * You will notice that the file does not contain a `... = require("homebridge");` statement anywhere in the code.
 *
 * The contents of the above import statement MUST ONLY be used for type annotation or accessing things like CONST ENUMS,
 * which is a special case as they get replaced by the actual value and do not remain as a reference in the compiled code.
 * Meaning normal enums are bad, const enums can be used.
 *
 * You MUST NOT import anything else which remains as a reference in the code, as this will result in
 * a `... = require("homebridge");` to be compiled into the final Javascript code.
 * This typically leads to unexpected behavior at runtime, as in many cases it won't be able to find the module
 * or will import another instance of homebridge causing collisions.
 *
 * To mitigate this the {@link API | Homebridge API} exposes the whole suite of HAP-NodeJS inside the `hap` property
 * of the api object, which can be acquired for example in the initializer function. This reference can be stored
 * like this for example and used to access all exported variables and classes from HAP-NodeJS.
 */
let hap: HAP;

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME, WledPreset);
};

class WledPreset implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;
  private readonly ip;
  private switchOn = false;
  private lastPlayedEffect = 0;


  private readonly lightService: Service;
  private readonly informationService: Service;
  private readonly presetService: Service;
  private readonly inputService: Service;

  private config: AccessoryConfig;
  hdmi1InputService: Service;
  hdmi2InputService: Service;

  constructor(log: Logging, config: AccessoryConfig) {
    this.log = log;
    this.name = config.name;
    this.ip = config.ip;
    this.config = config;

    if (!this.config.ip) {
      throw new Error('You must provide an ip address for ' + this.name);
    }

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.lightService = new hap.Service.Lightbulb(this.name);
    this.lightService.getCharacteristic(hap.Characteristic.On)
      .on('set', this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

    // register handlers for the Brightness Characteristic
    this.lightService.getCharacteristic(hap.Characteristic.Brightness)
      .on('set', this.setBrightness.bind(this))        // SET - bind to the 'setBrightness` method below
      .on('get', this.getBrightness.bind(this));       // GET - bind to the 'GetBrightness` method below

    // Add switches for presets
    this.presetService = new hap.Service.Television('Preset', '112233');
    // eslint-disable-next-line max-len
    this.presetService.setCharacteristic(hap.Characteristic.SleepDiscoveryMode, hap.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE); // Set sleep discovery characteristics

    // handle on / off events using the Active characteristic
    this.presetService.getCharacteristic(hap.Characteristic.Active)
      .on('set', (newValue, callback) => {
        this.setOn(newValue, callback);
      });

    this.presetService.setCharacteristic(hap.Characteristic.ActiveIdentifier, this.lastPlayedEffect);

    // handle input source changes
    this.presetService.getCharacteristic(hap.Characteristic.ActiveIdentifier)
      .on('set', (newValue, callback) => {

        // the value will be the value you set for the Identifier Characteristic
        // on the Input Source service that was selected - see input sources below.

        this.performRequestPreset(
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
              // callback(null, value/255*100);
              this.log.debug('Preset is ->', value.toString());
            }
          })
          .catch(error => {
            callback(error);
            this.log.debug(error);
          });

        this.log.info('set Active Identifier => setNewValue: ' + newValue);
        callback(null);
      });

    
    // InputSource
    this.inputService = new hap.Service.InputSource('Preset', '11223344');

    this.inputService.getCharacteristic(hap.Characteristic.ConfiguredName)
      .on('get', this.handleConfiguredNameGet.bind(this))
      .on('set', this.handleConfiguredNameSet.bind(this));

    this.inputService.getCharacteristic(hap.Characteristic.InputSourceType)
      .on('get', this.handleInputSourceTypeGet.bind(this));

    this.inputService.getCharacteristic(hap.Characteristic.IsConfigured)
      .on('get', this.handleIsConfiguredGet.bind(this))
      .on('set', this.handleIsConfiguredSet.bind(this));

    this.inputService.getCharacteristic(hap.Characteristic.Name)
      .on('get', this.handleNameGet.bind(this));

    this.inputService.getCharacteristic(hap.Characteristic.CurrentVisibilityState)
      .on('get', this.handleCurrentVisibilityStateGet.bind(this));

    this.hdmi1InputService = new hap.Service.InputSource('hdmi1', 'HDMI 1');
    this.hdmi1InputService
      .setCharacteristic(hap.Characteristic.Identifier, 1)
      .setCharacteristic(hap.Characteristic.ConfiguredName, 'HDMI 1')
      .setCharacteristic(hap.Characteristic.IsConfigured, hap.Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(hap.Characteristic.InputSourceType, hap.Characteristic.InputSourceType.HDMI);
    this.presetService.addLinkedService(this.hdmi1InputService); // link to tv service

    this.inputService.addLinkedService(this.hdmi1InputService);


    this.hdmi2InputService = new hap.Service.InputSource('hdmi2', 'HDMI 2');
    this.hdmi2InputService
      .setCharacteristic(hap.Characteristic.Identifier, 2)
      .setCharacteristic(hap.Characteristic.ConfiguredName, 'HDMI 2')
      .setCharacteristic(hap.Characteristic.IsConfigured, hap.Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(hap.Characteristic.InputSourceType, hap.Characteristic.InputSourceType.HDMI);
    this.presetService.addLinkedService(this.hdmi2InputService); // link to tv service

    this.inputService.addLinkedService(this.hdmi2InputService);

    // Information Service

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, 'Aircoookie')
      .setCharacteristic(hap.Characteristic.Model, 'WLED');

    log.info(ACCESSORY_NAME, 'finished initializing!');
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log('Identify is not doing anything at the moment...');
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.presetService,
      this.lightService,
      this.inputService,
      this.hdmi1InputService,
      this.hdmi2InputService,
    ];
  }

  /**
     * Handle "SET" requests from HomeKit
     * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
     */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.performRequestBrightness(
      {
        host: this.ip,
        path: '/win&T=' + (+!!value),
        method: 'GET',
      },
    )
      .then(response => {
        if (typeof response === 'string'){
          callback(null);
          this.log.debug('Set on to ', response);
        }
      })
      .catch(error => {
        callback(error);
        this.log.debug(error);
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

    // implement your own code to check if the device is on
    // const isOn = this.exampleStates.On;

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
            this.log.debug('WLED is off');
          } else {
            callback(null, true);
            this.log.debug('WLED is on');
          }
        }
      })
      .catch(error => {
        callback(error);
        this.log.debug(error);
      });
  }

  /**
         * Handle "SET" requests from HomeKit
         * These are sent when the user changes the state of an accessory, for example, changing the Brightness
         */
  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {

    // implement your own code to set the brightness
    // this.exampleStates.Brightness = value as number;

    this.performRequestBrightness(
      {
        host: this.ip,
        path: '/win&A=' + value,
        method: 'GET',
      },
    )
      .then(() => {
        callback(null);
        this.log.debug('Set Brightness -> ', value);
      })
      .catch(error => {
        callback(error);
        this.log.debug(error);
      });
  }

  /**
         * Get request for brightness
         *
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
          this.log.debug('Brightness level is ->', value.toString());
        }
      })
      .catch(error => {
        callback(error);
        this.log.debug(error);
      });
  }


  /**  
   * InputSource function
   */

  /**
   * Handle requests to get the current value of the "Configured Name" characteristic
   */
  handleConfiguredNameGet(callback) {
    this.log.debug('Triggered GET ConfiguredName');

    // set this to a valid value for ConfiguredName
    const currentValue = 1;

    callback(null, currentValue);
  }

  /**
   * Handle requests to set the "Configured Name" characteristic
   */
  handleConfiguredNameSet(value, callback) {
    this.log.debug('Triggered SET ConfiguredName:', value);

    callback(null);
  }

  /**
   * Handle requests to get the current value of the "Input Source Type" characteristic
   */
  handleInputSourceTypeGet(callback) {
    this.log.debug('Triggered GET InputSourceType');

    // set this to a valid value for InputSourceType
    const currentValue = 1;

    callback(null, currentValue);
  }

  /**
   * Handle requests to get the current value of the "Is Configured" characteristic
   */
  handleIsConfiguredGet(callback) {
    this.log.debug('Triggered GET IsConfigured');

    // set this to a valid value for IsConfigured
    const currentValue = 1;

    callback(null, currentValue);
  }

  /**
   * Handle requests to set the "Is Configured" characteristic
   */
  handleIsConfiguredSet(value, callback) {
    this.log.debug('Triggered SET IsConfigured:', value);

    callback(null);
  }

  /**
   * Handle requests to get the current value of the "Name" characteristic
   */
  handleNameGet(callback) {
    this.log.debug('Triggered GET Name');

    // set this to a valid value for Name
    const currentValue = 1;

    callback(null, currentValue);
  }


  /**
   * Handle requests to get the current value of the "Current Visibility State" characteristic
   */
  handleCurrentVisibilityStateGet(callback) {
    this.log.debug('Triggered GET CurrentVisibilityState');

    // set this to a valid value for CurrentVisibilityState
    const currentValue = 1;

    callback(null, currentValue);
  }


  // ============================================================================================================


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
