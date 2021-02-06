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
  api.registerAccessory('ExampleSwitch', WledPreset);
};

class WledPreset implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;
  private switchOn = false;

  private readonly service: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig) {
    this.log = log;
    this.name = config.name;

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.service = new hap.Service.Lightbulb(this.name);
    this.service.getCharacteristic(hap.Characteristic.On)
      .on('set', this.setOn.bind(this))                // SET - bind to the `setOn` method below
      .on('get', this.getOn.bind(this));               // GET - bind to the `getOn` method below

    // register handlers for the Brightness Characteristic
    this.service.getCharacteristic(hap.Characteristic.Brightness)
      .on('set', this.setBrightness.bind(this))        // SET - bind to the 'setBrightness` method below
      .on('get', this.getBrightness.bind(this));       // GET - bind to the 'GetBrightness` method below


    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, 'Custom Manufacturer')
      .setCharacteristic(hap.Characteristic.Model, 'Custom Model');

    log.info('Switch finished initializing!');
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log('Identify!');
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.service,
    ];
  }

  /**
     * Handle "SET" requests from HomeKit
     * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
     */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.performRequestBrightness(
      {
        host: '192.168.1.123',
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
        host: '192.168.1.123',
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
        host: '192.168.1.123',
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
        host: '192.168.1.123',
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
         * Send a HTTP request and returns a promise with a JSON
         * https://wanago.io/2019/03/18/node-js-typescript-6-sending-http-requests-understanding-multipart-form-data/
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

