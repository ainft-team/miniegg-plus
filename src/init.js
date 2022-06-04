const { ST7735 } = require('st7735');

const Input = {
    L: 15, //TACT_01
    C: 14, //TACT_02
    R: 7, //TACT_03
};

const Speaker = {
    PIN1: 3,
    PIN2: -1,
};

class Gamejoy {
    constructor() {
        this.lcd = null;
        this.gc = null;
    }

    init() {
        pinMode(Input.L, INPUT_PULLUP);
        pinMode(Input.C, INPUT_PULLUP);
        pinMode(Input.R, INPUT_PULLUP);
        this.lcd = new ST7735();
        const options = {
            dc: 20,
            rst: 21,
            cs: 17,
        };
        this.lcd.setup(board.spi(0, { baudrate: 20000000 }), options);
        this.gc = this.lcd.getContext('buffer');
        this.screenWidth = this.gc.getWidth();
        this.screenHeight = this.gc.getHeight();
        this.gc.clearScreen();
        this.gc.display();
    }

    tone(freq, duration) {
        tone(Speaker.PIN1, freq, {
            duration: duration,
            inversion: Speaker.PIN2,
        });
    }
}

exports.Input = Input;
exports.Speaker = Speaker;
exports.Gamejoy = Gamejoy;