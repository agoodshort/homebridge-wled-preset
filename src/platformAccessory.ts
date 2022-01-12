import {
  Service,
  PlatformAccessory,
  CharacteristicValue,
  CharacteristicSetCallback,
  CharacteristicGetCallback,
} from 'homebridge';

import { WledPresetPlatform } from './platform';

import fetch from 'node-fetch'; // https://www.npmjs.com/package/node-fetch
import { JSDOM } from 'jsdom';
const { window } = new JSDOM( '' );
// eslint-disable-next-line @typescript-eslint/no-var-requires
const $ = require( 'jquery' )( window );

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
    private readonly displayName: string,
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
    this.presetService.setCharacteristic( // To-DO: Should I change the DISCOVERABLE?
      this.platform.Characteristic.SleepDiscoveryMode, this.platform.Characteristic.SleepDiscoveryMode.NOT_DISCOVERABLE);

    /* ------------------------------------------------------------------------------------------------------------------------------- */

    /**
     * Generate existing presets from the WLED interface as inputs
     * If value returned from GET request is different than the one used, the preset ID does not exists
     * The value cannot be higher than 250 based on documentation https://kno.wled.ge/interfaces/http-api/
     */
    for (let i = 1; i <= this.presetsNb; i++) {
      this.platform.log.debug(this.displayName + ': Looking for preset ' + i);
      fetch('http://' + this.ip + '/win&PL=' + i)
        .then(response => response.text())
        .then(xmlString => $.parseXML(xmlString))
        .then(data => {
          const responseValue = data.childNodes.item(0).childNodes.item(19).textContent; // Current Preset
          const responseParam = data.childNodes.item(0).childNodes.item(19).nodeName;
          this.platform.log.debug(this.displayName + ': Preset is set to ' + responseValue + ' (Param: ' + responseParam + ')');

          if (Number(responseValue) === i) {
            // TO-DO move to a method
            this.platform.log.debug(this.displayName + ': Creating preset ' + i);
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
            this.platform.log.debug(this.displayName + ': Preset ' + i + ' does not exists');
          }
        })
        .catch(error => {
          this.platform.log.error(this.displayName + ': ' + error);
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
    fetch('http://' + this.ip + '/win&T=' + value)
      .then(response => response.text())
      .then(xmlString => $.parseXML(xmlString))
      .then(data => {
        const responseValue = data.childNodes.item(0).childNodes.item(0).textContent; // Master Brightness
        const responseParam = data.childNodes.item(0).childNodes.item(0).nodeName;
        this.platform.log.debug(this.displayName + ': Set on -> Sending GET request: ' + this.ip + '/win&T=' + value);
        this.platform.log.debug(this.displayName + ': Set On -> response: ' + responseValue + ' (Param: ' + responseParam + ')');
        if (responseValue > 0) {
          this.platform.log.info(this.displayName + ': Turning on');
        } else {
          this.platform.log.info(this.displayName + ': Turning off');
        }
        callback(null);
      })
      .catch(error => {
        callback(error);
        this.platform.log.error(this.displayName + ': ' + error);
      });
  }

  /**
   * Get handler for Active characteristic
   * TO-DO: Detail steps taken by method
   */
  getOn(callback: CharacteristicGetCallback) {
    fetch('http://' + this.ip + '/win')
      .then(response => response.text())
      .then(xmlString => $.parseXML(xmlString))
      .then(data => {
        const responseValue = data.childNodes.item(0).childNodes.item(0).textContent;
        const responseParam = data.childNodes.item(0).childNodes.item(0).nodeName;
        this.platform.log.debug(this.displayName + ': Get On -> Brightness: ' + responseValue + ' (Param: ' + responseParam + ')');
        if (responseValue > 0) {
          callback(null, 1);
        } else {
          callback(null, 0);
        }
      })
      .catch(error => {
        callback(error);
        this.platform.log.error(this.displayName + ': ' + error);
      });
  }

  /**
   * Get handler for Active Identifier characteristic
   * TO-DO: Detail steps taken by method
   */
  getActiveIdentifier(callback: CharacteristicSetCallback) {
    fetch('http://' + this.ip + '/win') // https://stackoverflow.com/questions/37693982/how-to-fetch-xml-with-fetch-api
      .then(response => response.text())
      .then(xmlString => $.parseXML(xmlString))
      .then(data => {
        // https://kno.wled.ge/interfaces/http-api/#xml-response
        const responseValue = data.childNodes.item(0).childNodes.item(19).textContent; // Current Preset
        const responseParam = data.childNodes.item(0).childNodes.item(19).nodeName;
        this.platform.log.debug(this.displayName + ': Preset is set to ' + responseValue + ' (Param: ' + responseParam + ')');
        callback(null, Number(responseValue));
      })
      .catch(error => {
        callback(error);
        this.platform.log.error(this.displayName + ': ' + error);
      });
  }

  /**
   * Set handler for Active Identifier characteristic
   * TO-DO: Detail steps taken by method
   */
  setActiveIdentifier(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    fetch('http://' + this.ip + '/win&PL=' + value) // https://stackoverflow.com/questions/37693982/how-to-fetch-xml-with-fetch-api
      .then(response => response.text())
      .then(xmlString => $.parseXML(xmlString))
      .then(data => {
        // https://kno.wled.ge/interfaces/http-api/#xml-response
        const responseValue = data.childNodes.item(0).childNodes.item(19).textContent;
        const responseParam = data.childNodes.item(0).childNodes.item(19).nodeName;
        this.platform.log.debug(this.displayName + ': Set Active Identifier -> Trying to set Preset to: ' + value.toString());
        this.platform.log.debug(this.displayName + ': Set Active Identifier -> Sending GET request: ' + this.ip + '/win&PL=' + value);
        this.platform.log.debug(this.displayName 
          + ': Set Active Identifier -> response: ' + responseValue + ' (Param: ' + responseParam + ')');
        this.platform.log.info(this.displayName + ': Preset set to ' + responseValue.toString());
        callback(null);
      })
      .catch(error => {
        callback(error);
        this.platform.log.error(this.displayName + ': ' + error);
      });
  }
}
