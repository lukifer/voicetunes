declare module "apa102-spi" {

  class Apa102spi {
    constructor(lightCount: number, brightness: number);
    sendLeds();
    setLedColor(n: number, b: number, r: number, g: number, b: number);
  }

  export = Apa102spi;
}
