var graphics = require('graphics');

/**
 * ST7735 class
 */
class ST7735 {
    /**
     * Setup ST7735 for SPI connection
     * @param {SPI} spi
     * @param {Object} options
     *   .width {number=128}
     *   .height {number=128}
     *   .dc {number=-1}
     *   .rst {number=-1}
     *   .cs {number=-1}
     *   .rotation {number=0}
     */
    setup(spi, options) {
        this.spi = spi;
        options = Object.assign(
            {
                width: 128,
                height: 128,
                dc: -1,
                rst: -1,
                cs: -1,
                rotation: 0,
                xstart: 2,
                ystart: 3,
            },
            this.init,
            options
        );
        this.width = options.width;
        this.height = options.height;
        this.dc = options.dc;
        this.rst = options.rst;
        this.cs = options.cs;
        this.rotation = options.rotation;
        this.xstart = options.xstart;
        this.ystart = options.ystart;
        this.context = null;
        if (this.dc > -1) pinMode(this.dc, OUTPUT);
        if (this.rst > -1) pinMode(this.rst, OUTPUT);
        if (this.cs > -1) pinMode(this.cs, OUTPUT);
        // reset
        digitalWrite(this.cs, HIGH);
        digitalWrite(this.rst, LOW);
        delay(10);
        digitalWrite(this.rst, HIGH);
        delay(10);
        digitalWrite(this.cs, LOW);
        this.initR();
    }

    initR() {
        this.cmd(0x01); // Software reset
        delay(150);
        this.cmd(0x11); // Out of sleep mode
        delay(500);
        // 1st commands
        this.cmd(0xb1, [0x01, 0x2c, 0x2d]); // Framerate ctrl (normal mode): rate = fosc/(1x2+40) * (LINE+2C+2D)
        this.cmd(0xb2, [0x01, 0x2c, 0x2d]); // Framerate ctrl (idle mode): rate = fosc/(1x2+40) * (LINE+2C+2D)
        this.cmd(0xb3, [0x01, 0x2c, 0x2d, 0x01, 0x2c, 0x2d]); // Framerate ctrl (partial mode): [Dot inversion,,, Line inversion,,]
        this.cmd(0xb4, [0x07]); // Display inversion ctrl: [No inversion]
        this.cmd(0xc0, [0xa2, 0x02, 0x84]); // Power ctrl: [-4.6V,, Auto mode]
        this.cmd(0xc1, [0xc5]); // Power ctrl: [VGH25=2.4C VGSEL=-10 VGH=3 * AVDD]
        this.cmd(0xc2, [0x0a, 0x00]); // Power ctrl: [Opamp current small, Boost frequency]
        this.cmd(0xc3, [0x8a, 0x2a]); // Power ctrl: [BCLK/2, opamp current small & medium low]
        this.cmd(0xc4, [0x8a, 0xee]); // Power ctrl
        this.cmd(0xc5, [0x0e]); // Power ctrl
        this.cmd(0x20); // Don't invert display
        this.cmd(0x36, [0xc8]); // Mem access ctrl: [row/col addr bottom-top refresh]
        this.cmd(0x3a, [0x05]); // Set color mode: [16-bit color]
        // 2nd commands (init based on display types)
        // Init 7735R
        this.cmd(0x2a, [0x00, 0x00, 0x00, this.width - 1]); // Column addr set: XSTART=0, XEND=width
        this.cmd(0x2b, [0x00, 0x00, 0x00, this.height - 1]); // Row addr set: YSTART=0, YEND=height
        // 3rd commands
        this.cmd(
            0xe0, // Gamma adjustments (pos. polarity)
            [
                0x02, 0x1c, 0x07, 0x12, 0x37, 0x32, 0x29, 0x2d, 0x29, 0x25,
                0x2b, 0x39, 0x00, 0x01, 0x03, 0x10,
            ]
        );
        this.cmd(
            0xe1, // Gamma adjustments (neg. polarity)
            [
                0x03, 0x1d, 0x07, 0x06, 0x2e, 0x2c, 0x29, 0x2d, 0x2e, 0x2e,
                0x37, 0x3f, 0x00, 0x00, 0x02, 0x10,
            ]
        );
        this.cmd(0x13); // Normal display on
        delay(10);
        this.cmd(0x29); // Main screen turn on
        delay(100);
        // this.cmd(0x36, [0x40 | 0x80 | 0x08]); // Mem access ctrl: ST77XX_MADCTL_MX | ST77XX_MADCTL_MY | ST7735_MADCTL_BGR;
    }

    /**
     * Send command
     * @param {number} cmd
     * @param {Array<number>} data
     */
    cmd(cmd, data) {
        digitalWrite(this.dc, LOW); // command
        this.spi.send(new Uint8Array([cmd]));
        digitalWrite(this.dc, HIGH); // data
        if (data) this.spi.send(new Uint8Array(data));
    }

    /**
     * Get a graphic context
     * @param {string} type Type of graphic context.
     *     'buffer' or 'callback'. Default is 'callback'
     */
    getContext(type) {
        if (!this.context) {
            if (type === 'buffer') {
                this.context = new graphics.BufferedGraphicsContext(
                    this.width,
                    this.height,
                    {
                        rotation: this.rotation,
                        bpp: 16,
                        display: (buffer) => {
                            digitalWrite(this.cs, LOW); // select
                            this.cmd(0x2a, [
                                0,
                                this.xstart,
                                0,
                                this.width - 1 + this.xstart,
                            ]); // column addr set
                            this.cmd(0x2b, [
                                0,
                                this.ystart,
                                0,
                                this.height - 1 + this.ystart,
                            ]); // row addr set
                            this.cmd(0x2c, buffer); // write to RAM
                            digitalWrite(this.cs, HIGH); // deselect
                        },
                    }
                );
            }
        }
        return this.context;
    }
}

exports.ST7735 = ST7735;
