const { Input, Speaker, Gamejoy } = require('./init');
const utils = require('./utils');
const { constants } = require('./constants');
const rtc = require('rtc');
const font = require('font-minimal');
const { BuzzerMusic } = require('buzzer-music');
const fs = require('fs');

const { ESP8266HTTPClient } = require('esp8266-http-client');
const esp = new ESP8266HTTPClient();

const { ADC } = require('adc');

const EggTop = process.env.TEST
    ? require('./assets/eggTop.json')
    : {
          bpp: 16,
      };
const EggBottom = process.env.TEST
    ? require('./assets/eggBottom.json')
    : {
          bpp: 16,
      };

if (process.env.TEST) {
    EggTop.data = atob(EggTop.data);
    EggBottom.data = atob(EggBottom.data);
}

class GameScene extends Gamejoy {
    init() {
        super.init();
        this.gc.setFont(font);
        this.gc.setFontScale(1, 1);
        this.gc.setFontColor(this.gc.color16(0, 0, 0));
        this.pressed = 0;
        this.serial = storage.getItem('serial');
        this.key = atob(storage.getItem('key'));
        this.nonce = parseInt(storage.getItem('nonce'));
        setInterval(() => {
            if (this.showFunction) this.showFunction();
            if (this.pressed > 0) {
                if (--this.pressed === 0) {
                    this.pressedButton = null;
                    if (this.next) this.next();
                }
            }
            this.gc.display();
        }, Math.round(1000 / constants.MAX_FPS));
    }

    async keydownForWiFi(value) {
        if (this.scene === 'wifi-setting') {
            switch (value) {
                case Input.R:
                    if (this.selectedIndex > 0) {
                        this.selectedIndex--;
                    } else {
                        if (this.baseIndex > 0) {
                            this.baseIndex--;
                        }
                    }
                    break;
                case Input.L:
                    if (this.selectedIndex + this.baseIndex > this.ssidList.length - 2) {
                        return;
                    }
                    if (this.selectedIndex < 3) {
                        this.selectedIndex++;
                    } else {
                        this.baseIndex++;
                    }
                    break;
                case Input.C:
                    storage.setItem('ssid', this.ssidList[this.baseIndex + this.selectedIndex]);
                    this.wifiPwdScene();
                    break;
                default:
                    break;
            }
        } else if (this.scene === 'wifi-pwd') {
            switch (value) {
                case Input.L:
                    if (this.keyboardY < constants.KEYBOARD.length + 1) {
                        this.keyboardY++;
                    } else {
                        this.keyboardY = 0;
                    }
                    break;
                case Input.R:
                    if (this.keyboardX < constants.KEYBOARD[0].length - 1) {
                        this.keyboardX++;
                    } else {
                        this.keyboardX = 0;
                    }
                    break;
                case Input.C:
                    switch (this.keyboardY) {
                        case constants.KEYBOARD.length + 1:
                            storage.setItem('pwd', this.input);
                            clearWatch(this.buttonL);
                            clearWatch(this.buttonC);
                            clearWatch(this.buttonR);
                            this.buttonL = this.buttonC = this.buttonR = null;
                            delay(1000);
                            await this.start();
                            break;
                        case constants.KEYBOARD.length:
                            this.input = this.input.slice(0, -1);
                            break;
                        default:
                            this.input += constants.KEYBOARD[this.keyboardY][this.keyboardX];
                    }
                default:
                    break;
            }
        }
    }

    keyL() {
        if (this.pressed > 0) {
            return;
        }
        this.pressedButton = Input.L;
        this.pressed = 1;
        this.next = null;
        if (this.scene === 'home') {
            this.menuScene();
        } else if (this.scene === 'menu') {
            this.selectedIndex = (this.selectedIndex + 1) % 3;
        } else if (this.scene === 'dream-select') {
            this.pressed = 3;
            const index = this.dreamList.indexOf(this.dream);
            if (index === this.dreamList.length - 1) {
                this.dream = this.dreamList[0];
            } else {
                this.dream = this.dreamList[index + 1];
            }
            this.next = this.updateAssets;
        } else if (this.scene === 'error') {
            this.menuScene();
        }
    }

    async keyC() {
        if (this.pressed > 0) {
            return;
        }
        this.pressedButton = Input.C;
        this.pressed = 1;
        this.next = null;
        if (this.scene === 'home') {
            if (this.angry) return;
            if (this.frame > -1 && this.frame < 5) {
                this.stack++;
            }
            if (this.stack > 5) {
                this.angry = true;
                this.tone(87, 50);
            } else this.tone(250, 100);
            this.frame = 0;
        } else if (this.scene === 'menu') {
            switch (this.selectedIndex) {
                case 0:
                    this.heartScene();
                    break;
                case 1:
                    if (this.dream === null) {
                        this.dreamList = fs.readdir('/dream');
                        this.dream = this.dreamList[0];
                        this.updateAssets();
                        this.dreamSelectScene();
                    } else {
                        this.updateAssets();
                        this.startedAt =
                            this.startedAt ||
                            (storage.getItem('dreamStartedAt') &&
                                parseInt(storage.getItem('dreamStartedAt')));
                        if (
                            rtc.getTime() / 1000 - this.startedAt <
                            (process.env.TEST ? constants.DREAM_TIME / 1000 : constants.DREAM_TIME)
                        ) {
                            this.dreamProgressScene();
                        } else {
                            this.dreamCompleteScene();
                        }
                    }
                    break;
                case 2:
                    this.infoScene();
                    break;
                default:
                    break;
            }
        } else if (this.scene === 'info') {
            this.pressed = 3;
            this.next = this.otpScene;
        } else if (this.scene === 'heart') {
            if (this.frame > 0) return;
            this.nextNext = this.heartScene;
            this.error = null;
            if (this.useHeart()){
                await this.updateStat(2, 2, 2, 2);
            }
            this.next = this.error || null;
        } else if (this.scene === 'dream-select') {
            this.pressed = 3;
            const currentTime = rtc.getTime() / 1000; // Use time in sec, because BigInt requires more memory
            this.startedAt = currentTime;
            if (!process.env.TEST) {
                storage.setItem('dreamStartedAt', currentTime.toString());
                storage.setItem('dream', this.dream);
            }
            this.next = this.dreamProgressScene;
        } else if (this.scene === 'dream-complete') {
            this.pressed = 3;
            this.next = this.dreamResultScene;
            this.nextNext = this.menuScene;
            this.error = null;
            const exp = this.statR + this.statA + this.statS + this.statK;
            if (exp < constants.EXP) {
                const weight = Math.floor(Math.random() * 5 + 1);
                const score = fs.readFile(`/dream/${this.dream}/effect`).map((num) => num * weight);
                this.score = score.reduce((accumulator, curr) => accumulator + curr);
                await this.updateStat(...score);
                if (!process.env.TEST) {
                    storage.removeItem('dream');
                }
                this.startedAt = null;
                this.dream = null;
            }
        } else if (this.scene === 'error') {
            this.nextNext();
        }
    }

    keyR() {
        if (this.pressed > 0) {
            return;
        }
        this.pressedButton = Input.R;
        this.pressed = 1;
        this.next = null;
        if (this.scene === 'menu') {
            this.homeScene();
        } else if (this.scene === 'heart') {
            this.pressed = 3;
            this.next = this.menuScene;
        } else if (this.scene === 'info') {
            this.pressed = 3;
            this.next = () => {
                this.menuScene();
                this.gc.setFont(font);
            };
        } else if (this.scene === 'otp') {
            this.pressed = 3;
            this.next = this.infoScene;
        } else if (this.scene === 'dream-select') {
            this.dream = null;
            this.menuScene();
        } else if (this.scene === 'dream-progress') {
            this.music.stop();
            this.menuScene();
        } else if (this.scene === 'dream-complete') {
            this.pressed = 3;
            this.next = this.menuScene;
        } else if (this.scene === 'dream-result') {
            if (this.frame < 10) return;
            this.pressed = 3;
            this.next = this.error || this.nextNext;
        } else if (this.scene === 'error') {
            this.nextNext();
        }
    }

    // Wifi
    sendEncryptedRequest = async (url, data) => {
        const iv = utils.randomBytes(16);
        storage.setItem('nonce', (this.nonce + 1).toString());
        const res = await esp.http(url, {
            method: 'POST',
            body: JSON.stringify({
                auth: {
                    serialNumber: this.serial,
                    iv: btoa(iv),
                    nonce: this.nonce,
                    encryptedMessage: aesEncrypt(
                        JSON.stringify({
                            serialNumber: this.serial,
                            nonce: this.nonce,
                        }),
                        this.key,
                        iv
                    ),
                },
                data,
            }),
            headers: { 'content-type': 'application/json' },
        });
        this.nonce++;
        if (res.status !== constants.STATUS_CODE.SUCCESS) {
            throw res.status;
        }
        return res.body;
    };

    connectWifi = async () => {
        this.frame = 0;
        this.showFunction = () => this.loading('WIFI CONNECTING...');
        try {
            await esp.reset();
            await esp.wifi();
            return true;
        } catch (err) {
            this.errorScene('Wi-Fi connection failed\n Searching other Wi-Fi...');
            const result = await esp.scan();
            this.ssidList = result.reduce((pre, value) => {
                if (value.ssid) {
                    pre.push(value.ssid);
                }
                return pre;
            }, []);
            this.wifiSettingScene();
            return false;
        }
    };

    getNFTList = async () => {
        delay(500);
        this.showFunction = () => this.loading('LOADING YOUR NFT... (1/2)');
        const ids = JSON.parse(
            await this.sendEncryptedRequest(`http://${process.env.API_SERVER}/egg/getIds`)
        ).ids;
        delay(500);
        if (!ids || ids.length === 0) {
            throw constants.STATUS_CODE.NOT_EXIST;
        }
        this.eggNum = ids[0];
    };

    loadNFT = async () => {
        delay(500);
        this.showFunction = () => this.loading('LOADING YOUR NFT... (2/2)');

        const eggInfo = JSON.parse(
            await this.sendEncryptedRequest(`http://${process.env.API_SERVER}/egg/getInfo`, {
                id: this.eggNum,
            })
        ).eggInfo;
        delay(500);
        this.eggData = eggInfo.image.compressBase64;
        EggTop.width = EggBottom.width = eggInfo.image.width;
        EggTop.height = Math.floor((eggInfo.image.height * 16) / 29);
        EggBottom.height = Math.ceil((eggInfo.image.height * 13) / 29);

        if (
            !fs.exists(`/egg/${this.eggNum}/stat/updatedAt`) ||
            eggInfo.spec.updatedAt >=
                utils.arrayToInt(fs.readFile(`/egg/${this.eggNum}/stat/updatedAt`))
        ) {
            this.statR = eggInfo.spec.round;
            this.statA = eggInfo.spec.angled;
            this.statS = eggInfo.spec.square;
            this.statK = eggInfo.spec.spark;
        } else {
            this.statR = utils.arrayToInt(fs.readFile(`/egg/${this.eggNum}/stat/R`));
            this.statA = utils.arrayToInt(fs.readFile(`/egg/${this.eggNum}/stat/A`));
            this.statS = utils.arrayToInt(fs.readFile(`/egg/${this.eggNum}/stat/S`));
            this.statK = utils.arrayToInt(fs.readFile(`/egg/${this.eggNum}/stat/K`));
        }
    };

    setRealTime = async () => {
        delay(1000);
        this.showFunction = () => this.loading('SETTING REAL TIME...');
        const res = await esp.http(`http://${process.env.API_SERVER}/getTime`);
        delay(500);
        rtc.setTime(parseInt(JSON.parse(res.body).currentTimeUtcStr));
    };

    getNonce = async () => {
        const res = await esp.http(`http://${process.env.API_SERVER}/getNonce`, {
            method: 'POST',
            body: JSON.stringify({
                data: {
                    serialNumber: this.serial,
                },
            }),
            headers: { 'content-type': 'application/json' },
        });
        return parseInt(JSON.parse(res.body).nonce) + 1;
    };

    initDevice = async () => {
        this.wifiConnected = await this.connectWifi();
        if (!this.wifiConnected) return false;
        try {
            delay(1000);
            if (!Number.isInteger(this.nonce)) {
                this.nonce = await this.getNonce();
                delay(1000);
            }
            await this.getNFTList();
            delay(1000);
            await this.loadNFT();
            delay(1000);
            await this.setRealTime();
            return true;
        } catch (err) {
            console.log(err);
            this.errorScene(err);
            return false;
        }
    };

    devideEggData() {
        this.eggData = atob(this.eggData);
        EggTop.data = this.eggData.slice(0, EggTop.width * EggTop.height * 2);
        EggBottom.data = this.eggData.slice(EggTop.width * EggTop.height * 2);
    }

    setComponents() {
        this.music = new BuzzerMusic(Speaker.PIN1, Speaker.PIN2);
        this.battery = new ADC(26);
        this.decoder = new TextDecoder();
        this.selectedIndex = 0;
        this.dreamMap = {
            width: 62,
            height: 32,
            bpp: 16,
        };

        this.effectMap = {
            width: 60,
            height: 66,
            bpp: 16,
        };

        if (!fs.exists(`/egg/${this.eggNum}`)) {
            fs.mkdir(`/egg/${this.eggNum}`);
        }
        if (!fs.exists(`/egg/${this.eggNum}/stat`)) {
            fs.mkdir(`/egg/${this.eggNum}/stat`);
        }

        if (process.env.TEST) {
            this.eggNum = 86;
            this.heart = 3;
            this.statR = 0;
            this.statA = 0;
            this.statS = 0;
            this.statK = 0;
            this.dream = null;
        } else {
            const heart = parseInt(storage.getItem('heart'));
            this.heart = isNaN(heart) ? 3 : heart;
            this.dream = storage.getItem('dream');
            this.spendedAt = parseInt(storage.getItem('spendedAt')) || 0;
        }

        setWatch(
            () => {
                this.keyL();
            },
            Input.L,
            FALLING
        );
        setWatch(
            async () => {
                await this.keyC();
            },
            Input.C,
            FALLING
        );
        setWatch(
            () => {
                this.keyR();
            },
            Input.R,
            FALLING
        );
    }

    loading(text) {
        this.frame += 1;
        if (this.frame % 10 !== 1) {
            return;
        }
        this.gc.fillScreen(this.gc.color16(255, 255, 255));
        const m = this.gc.measureText(text);
        this.gc.drawText(Math.round((128 - m.width) / 2), 85, text);
        const pos = (this.frame / 10) % 3;
        this.gc.setFillColor(this.gc.color16(0, 0, 0));
        this.gc.fillCircle(48 + 16 * pos, 64, 4);
    }

    errorScene(err, height = 85, enableButton = false) {
        this.scene = enableButton ? 'error' : null;
        this.showFunction = null;
        this.gc.setFontColor(this.gc.color16(0, 0, 0));
        this.gc.fillScreen(this.gc.color16(255, 255, 255));
        const text = utils.convertErrorCodeToMessage(err);
        this.drawLongText(text, 106, this.screenWidth / 2, height);
        this.gc.display();
    }

    wifiSettingScene() {
        this.scene = 'wifi-setting';
        this.buttonL = setWatch(
            async () => {
                await this.keydownForWiFi(Input.L);
            },
            Input.L,
            FALLING,
            constants.DEBOUNCE_TIME
        );
        this.buttonC = setWatch(
            async () => {
                await this.keydownForWiFi(Input.C);
            },
            Input.C,
            FALLING,
            constants.DEBOUNCE_TIME
        );
        this.buttonR = setWatch(
            async () => {
                await this.keydownForWiFi(Input.R);
            },
            Input.R,
            FALLING,
            constants.DEBOUNCE_TIME
        );
        this.showFunction = this.showWifis;
        this.baseIndex = 0;
        this.selectedIndex = 0;
        this.gc.setFontColor(this.gc.color16(0, 0, 0));
    }

    wifiPwdScene() {
        this.scene = 'wifi-pwd';
        this.showFunction = () => this.showKeyboard('pwd');
        this.gc.setFontColor(this.gc.color16(0, 0, 0));
        this.keyboardX = 0;
        this.keyboardY = 0;
        this.input = '';
    }
    //------------------------------------------------------------------------------

    copyRightScene() {
        this.scene = 'copyright';
        this.showFunction = () => this.drawCopyRight(12, 110);
        this.frame = 0;
        this.gc.setFont(null);
    }

    drawCopyRight(x, y) {
        this.frame++;
        if (this.frame === 111) {
            this.homeScene();
            return;
        }
        this.gc.fillScreen(this.gc.color16(255, 255, 255));
        let R = 0;
        if (this.frame < 50) {
            R = 255 - (255 * this.frame) / 50;
        } else if (this.frame > 60) {
            R = Math.min((255 * (this.frame - 60)) / 50, 255);
        }
        this.gc.setFontColor(this.gc.color16(R, R, R));
        this.gc.setColor(this.gc.color16(R, R, R));
        this.gc.drawCircle(x + 5, y + 3, 4);
        this.gc.drawText(x + 3, y - 1, 'c');
        const text = '  Common Computer';
        this.gc.drawText(x, y, text);
    }

    homeScene() {
        this.scene = 'home';
        this.showFunction = this.drawHomeScene;
        this.angry = false;
        this.stack = 0;
        this.frame = -1;
        this.gc.setFont(font);
    }

    drawHomeScene() {
        const updatedAni = utils.updateAnimation(this.frame);
        this.frame = updatedAni[0];
        if (updatedAni[1]) {
            this.angry = false;
            this.stack = 0;
        }
        this.gc.fillScreen(utils.convertStringToColor16(constants.COLOR[0]));
        this.drawShadow(64, 89, 50, 22);
        this.drawEgg(64, 62, this.frame, this.angry);

        this.showBattery(4, 4);
    }

    menuScene() {
        this.scene = 'menu';
        this.showFunction = this.drawMenuScene;
        this.dreamMap.data = null;
        this.effectMap.data = null;
        this.frame = 0;
    }

    drawMenuScene() {
        this.gc.fillScreen(utils.convertStringToColor16(constants.COLOR[0]));
        this.drawShadow(64, 89, 50, 22);
        this.drawEgg(64, 62);
        this.drawMenu(this.screenHeight - 14);
    }

    // Menu 1 - Heart
    heartScene() {
        this.scene = 'heart';
        this.showFunction = this.drawHeartScene;
        this.effectMap.data = fs.readFile(`/effect/heart`);
    }

    drawHeartScene() {
        this.gc.fillScreen(utils.convertStringToColor16(constants.COLOR[0]));
        this.drawShadow(64, 89, 50, 22);
        if (this.frame > 0) {
            this.frame -= 11;
            this.drawBitmapAt(this.effectMap, 64, 62);
        }
        this.drawHeartEffect();
        const remainedTime = this.updateHeart();
        this.gc.setFontColor(this.gc.color16(255, 255, 255));
        const text = `${this.heart}/${constants.HEART_MAX}  ${
            this.heart === constants.HEART_MAX ? '' : remainedTime
        }`;
        this.gc.drawText(29, 8, text);
        this.drawHeart(20, 11, utils.convertStringToColor16('F0003B'));
        this.drawEgg(64, 62, 0, false);
        this.drawBackButton(Input.R, this.screenWidth - 11, 11);
    }

    drawHeartEffect() {
        if (this.frame <= 0) return;
        const color = utils.convertStringToColor16('FE74B0');
        this.drawHeart(32, -79 + this.frame, color, 2);
        this.drawHeart(89, -90 + this.frame, color, 1);
        this.drawHeart(108, -53 + this.frame, color, 2);
        this.drawHeart(27, -34 + this.frame, color, 1);
        this.drawHeart(18, -3 + this.frame, color, 2);
        this.drawHeart(99, -10 + this.frame, color, 2);
    }
    //------------------------------------------------------------------------------

    // Menu 2 - Dream
    dreamSelectScene() {
        this.scene = 'dream-select';
        this.showFunction = this.drawDreamSelectScene;
    }

    drawDreamSelectScene() {
        this.drawBackground(this.dreamMap, 4);
        this.drawEgg(64, 62, 0, false);
        this.drawSelectPopup();
    }

    dreamProgressScene() {
        const music = fs.readFile(`/dream/${this.dream}/music`);
        const score = this.decoder.decode(music.slice(2));
        this.music.play(score, music[0], music[1], true);
        this.scene = 'dream-progress';
        this.showFunction = this.drawDreamProgressScene;
    }

    drawDreamProgressScene() {
        const progress = rtc.getTime() / 1000 - this.startedAt;
        if (progress > (process.env.TEST ? constants.DREAM_TIME / 1000 : constants.DREAM_TIME)) {
            this.music.stop();
            this.dreamCompleteScene();
            return;
        }
        this.drawBackground(this.dreamMap, 4);
        this.drawEgg(64, 62, 0, false);
        this.drawProgressBar(
            64,
            106,
            process.env.TEST ? constants.DREAM_TIME / 1000 : constants.DREAM_TIME,
            progress
        );
    }

    dreamCompleteScene() {
        this.scene = 'dream-complete';
        this.showFunction = this.drawDreamCompleteScene;
        this.dreamMap.data = null;
    }

    drawDreamCompleteScene() {
        this.gc.fillScreen(utils.convertStringToColor16(constants.COLOR[0]));
        this.drawEgg(64, 62, 0, false);
        this.gc.setFillColor(this.gc.color16(255, 255, 255));
        this.gc.fillRoundRect(14, 54, 100, 60, 2);
        this.gc.setFontColor(this.gc.color16(0, 0, 0));
        this.drawLongText('The egg woke up from a dream', 80, 64, 64);
        this.drawButton(Input.C, 'CHECK THE RESULT', 64, 100);
        this.drawBackButton(Input.R, this.screenWidth - 11, 11);
    }

    dreamResultScene() {
        this.scene = 'dream-result';
        this.showFunction = this.drawDreamResultScene;
        this.effectMap.data = fs.readFile(`/effect/dream`);
        this.frame = 0;
    }

    drawDreamResultScene() {
        this.gc.fillScreen(utils.convertStringToColor16(constants.COLOR[0]));
        this.drawShadow(64, 89, 50, 22);
        if (this.frame < 10) {
            this.frame++;
        }
        this.drawBitmapAt(this.effectMap, 64, 62);
        const color = this.gc.color16(
            (255 / 10) * this.frame,
            (255 / 10) * this.frame,
            (255 / 10) * this.frame
        );
        this.gc.setFontColor(color);
        const text = `+ ${this.score}`;
        const m = this.gc.measureText(text);
        this.gc.drawText(
            (this.screenWidth - m.width) / 2,
            (this.screenHeight - m.height) / 2,
            text
        );
        this.drawBackButton(Input.R, this.screenWidth - 11, 11);
    }
    //------------------------------------------------------------------------------

    // Menu 3 - Info
    infoScene() {
        this.scene = 'info';
        this.showFunction = this.drawInfoScene;
        this.gc.setFont(null);
    }

    drawInfoScene() {
        this.gc.fillScreen(utils.convertStringToColor16(constants.COLOR[0]));
        this.gc.setFillColor(this.gc.color16(255, 255, 255));
        this.gc.setFontColor(this.gc.color16(255, 255, 255));
        const exp = this.statR + this.statA + this.statS + this.statK;
        const text = `PROFILE\n  EGG: No.${this.eggNum}\n  EXP: ${exp}\n  H/W SERIAL:`;
        for (let i = 0; i < 3; i += 1) {
            this.gc.fillCircle(14, 41 + i * 16, 1);
        }
        this.drawLongText(text, 102, this.screenWidth / 2, 22, 8);
        this.gc.drawText(21, 82, `${this.serial}`);
        this.drawBackButton(Input.R, this.screenWidth - 11, 11);
        this.drawButton(Input.C, 'GENERATE OTP', this.screenWidth / 2, this.screenHeight - 16);
    }

    otpScene() {
        this.scene = 'otp';
        this.showFunction = this.drawOtpScene;
        this.keyString = btoa(this.key);
    }

    drawOtpScene() {
        const currentMinute = Math.floor(rtc.getTime() / 60000);
        if (currentMinute!==this.generatedAt) {
            this.hash = utils.getHashCode(`${currentMinute}:${this.keyString}`);
            this.generatedAt = currentMinute;
        }
        this.gc.fillScreen(utils.convertStringToColor16(constants.COLOR[0]));
        this.gc.setFillColor(utils.convertStringToColor16(constants.COLOR[2]));
        this.gc.fillRoundRect(
            (this.screenWidth - 112) / 2,
            (this.screenHeight - 36) / 2 + 6,
            112,
            36,
            1
        );
        this.gc.setFontColor(this.gc.color16(255, 255, 255));
        this.drawLongText(this.hash, 102, this.screenWidth / 2, 62, 4);
        this.gc.setFontColor(this.gc.color16(255, 0, 0));
        this.drawLongText(`${60 - Math.floor(rtc.getTime() / 1000) + this.generatedAt * 60}`, 102, this.screenWidth / 2, 74, 4);
        this.drawBackButton(Input.R, this.screenWidth - 11, 11);
    }

    //------------------------------------------------------------------------------

    // Graphic Utils
    showKeyboard(placeholder) {
        this.gc.fillScreen(this.gc.color16(255, 255, 255));
        for (let i = 0; i < constants.KEYBOARD.length; i++) {
            const text = constants.KEYBOARD[i].split('').join(' ');
            this.gc.drawText(16, 10 + 10 * i, text);
        }
        if (this.keyboardY === constants.KEYBOARD.length + 1) {
            this.gc.drawRect(100, 93, 23, 10);
        } else if (this.keyboardY === constants.KEYBOARD.length) {
            this.gc.drawRect(100, 85, 14, 10);
        } else {
            this.gc.drawRect(14 + 8 * this.keyboardX, 8 + 10 * this.keyboardY, 7, 9);
        }
        this.gc.drawText(6, 95, `${placeholder}:`);
        this.drawLongText('Del\n Enter', 20, 112, 87);
        this.gc.drawText(this.gc.measureText(placeholder).width + 16, 95, this.input);
        this.gc.drawText(21, 110, 'Press B button to erase');
    }

    showWifis() {
        this.gc.fillScreen(this.gc.color16(255, 255, 255));
        for (let i = 0; i < 4; i++) {
            if (this.ssidList.length < i + this.baseIndex + 1) break;
            if (i === this.selectedIndex) {
                const m = this.gc.measureText(this.ssidList[i + this.baseIndex]);
                this.gc.drawRect(10, 14 + 16 * i, m.width + 12, 16);
            }
            this.gc.drawText(16, 20 + 16 * i, this.ssidList[i + this.baseIndex]);
        }
        const text = 'Select Wi-Fi to connect';
        const m = this.gc.measureText(text);
        this.gc.drawText(Math.round((128 - m.width) / 2), 110, text);
    }

    drawShadow = (x, y, w, h, startColor, endColor) => {
        startColor = startColor || [46, 49, 80];
        endColor = endColor || [32, 35, 54];

        for (let i = 0; i < h; i += 2) {
            const newR = Math.ceil(startColor[0] + ((endColor[0] - startColor[0]) * i) / h);
            const newG = Math.ceil(startColor[1] + ((endColor[1] - startColor[1]) * i) / h);
            const newB = Math.ceil(startColor[2] + ((endColor[2] - startColor[2]) * i) / h);
            const newW = Math.floor((w / h) * (h - i));
            const newH = Math.floor(h - i);
            this.drawEllipse(x, y, newW, newH, this.gc.color16(newR, newG, newB));
        }
    };

    drawEllipse = (x, y, w, h, color) => {
        this.gc.setColor(color);
        for (let i = 0; i < h; i++) {
            const halfH = Math.floor(h / 2);
            const Y = y - halfH + i;
            const delX = Math.round(
                (Math.sqrt(1 - Math.pow(Y - y, 2) / Math.pow(halfH, 2)) * w) / 2
            );
            this.gc.drawLine(x + delX, Y, x - delX, Y);
        }
    };

    showBattery = (marginX, marginY) => {
        const color = utils.convertStringToColor16('D8D8D8');
        this.gc.setColor(color);
        this.gc.setFillColor(color);
        this.gc.setFontColor(color);
        this.gc.drawRoundRect(106 - marginX, marginY, 22, 10, 2);
        this.gc.fillRect(104 - marginX, 2 + marginY, 2, 6);
        const value = utils.convertVoltToPercent(this.battery.read() * 2 * 3.3) + '%';
        const m2 = this.gc.measureText(value);
        this.gc.drawText(126 - m2.width - marginX, 2 + marginY, value);
    };

    drawBitmapAt = (bitMap, x, y, options) => {
        const width = options && options.scaleX ? bitMap.width * options.scaleX : bitMap.width;
        const height = options && options.scaleY ? bitMap.height * options.scaleY : bitMap.height;
        this.gc.drawBitmap(x - width / 2, y - height / 2, bitMap, {
            ...options,
            transparent: this.gc.color16(247, 251, 247),
        });
    };

    drawBackground(bitMap, scale) {
        this.frame--;
        if (this.frame < -bitMap.width * scale + 1) {
            this.frame = 0;
        }
        this.gc.drawBitmap(this.frame, 0, bitMap, {
            scaleX: scale,
            scaleY: scale,
        });
        if (this.frame < -bitMap.width * scale + this.screenWidth) {
            this.gc.drawBitmap(this.frame + bitMap.width * scale, 0, bitMap, {
                scaleX: scale,
                scaleY: scale,
            });
        }
    }

    drawEgg = (x, y, frame = 0, angry = false) => {
        const bias = utils.getBias(frame, angry);
        if (this.angry) {
            this.gc.setFontColor(this.gc.color16(255, 255, 255));
            if (frame === 9 || frame === 11) this.tone(300, 100);
            if (frame > 8) {
                this.gc.drawText(x + 25, y - 27, 'Stop!');
            }
            if (frame > 10) {
                this.gc.drawText(x - 46, y - 20, 'Stop!');
            }
        }
        const diff = EggTop.height - EggBottom.height;
        this.drawBitmapAt(
            EggTop,
            x + bias[0],
            y - Math.floor(EggTop.height / 2) + diff / 2 + bias[1]
        );
        this.drawBitmapAt(EggBottom, x, y + Math.ceil(EggBottom.height / 2) + diff / 2);
    };

    drawButton(handler, content, x, y, width = 72, height = 16) {
        const m = this.gc.measureText(content);
        width = Math.max(m.width + 10, width);
        height = Math.max(m.height + 10, height);
        this.gc.setFillColor(
            utils.convertStringToColor16(
                this.pressedButton === handler ? constants.COLOR[4] : constants.COLOR[3]
            )
        );
        this.gc.setFontColor(this.gc.color16(255, 255, 255));
        this.gc.fillRoundRect(x - width / 2, y - height / 2, width, height, 1);
        this.gc.drawText(x - m.width / 2, y - m.height / 2, content);
    }

    drawBackButton(handler, x, y) {
        this.gc.setFillColor(
            utils.convertStringToColor16(
                this.pressedButton === handler ? constants.COLOR[2] : constants.COLOR[0]
            )
        );
        this.gc.fillRoundRect(x - 6, y - 6, 12, 11, 1);
        const contentColor = utils.convertStringToColor16(
            this.pressedButton === handler ? 'CCCED8' : '9A9DB1'
        );
        this.gc.setColor(contentColor);
        this.gc.drawRoundRect(x - 4, y - 4, 7, 5, 1);
        this.gc.fillRect(x - 4, y - 4, 3, 4);
        this.gc.drawLine(x - 4, y, x - 2, y - 2);
        this.gc.drawLine(x - 3, y + 1, x - 2, y + 2);
    }

    drawMenu = (y) => {
        this.gc.setFillColor(utils.convertStringToColor16(constants.COLOR[1]));
        this.gc.fillRect(0, y - 14, this.screenWidth, 28);

        for (let i = 0; i < 3; i++) {
            this.drawIcon(30 + 34 * i, y, i, this.selectedIndex === i);
        }
    };

    drawIcon(x, y, index, selected) {
        let color = utils.convertStringToColor16(constants.COLOR[5]);
        let backgroundColor = utils.convertStringToColor16(constants.COLOR[1]);
        if (selected) {
            this.gc.setFillColor(this.gc.color16(23, 25, 37));
            this.gc.fillRoundRect(x - 10, y - 10, 20, 20, 3);
            color = this.gc.color16(255, 255, 255);
            backgroundColor = this.gc.color16(23, 25, 37);
        }
        switch (index) {
            case 0:
                this.drawHeartIcon(x, y, color);
                break;
            case 1:
                this.drawDreamIcon(x, y, color, backgroundColor);
                break;
            case 2:
                this.drawInfoIcon(x, y, color, backgroundColor);
                break;
        }
    }

    drawInfoIcon(x, y, color, backgroundColor) {
        const halfLen = [2, 4, 5, 6, 6, 7, 7];

        this.gc.setColor(color);
        for (let i = 0; i < 14; i++) {
            const Y = y + 6 - i;
            const DelX = halfLen[Math.min(i, 13 - i)];
            this.gc.drawLine(x - DelX, Y, x - 1 + DelX, Y);
        }
        this.gc.setFillColor(backgroundColor);
        this.gc.fillRect(x - 1, y - 4, 2, 2);
        this.gc.fillRect(x - 1, y - 1, 2, 5);
    }
    drawHeartIcon(x, y, color) {
        this.gc.setFillColor(color);
        this.gc.setColor(color);
        this.gc.fillCircle(x - 4, y - 3, 3);
        this.gc.fillCircle(x + 3, y - 3, 3);
        for (let i = 0; i < 7; i++) {
            this.gc.drawLine(x - (i + 1), y + 5 - i, x + i, y + 5 - i);
        }
    }
    drawDreamIcon(x, y, color, backgroundColor) {
        const halfLen = [3, 5, 6, 6];

        this.gc.setColor(color);
        for (let i = 0; i < 13; i++) {
            const Y = y + 6 - i;
            if (i > 3 && i < 9) {
                this.gc.drawLine(x - 7, Y, x + 6, Y);
                continue;
            }
            const DelX = halfLen[Math.min(i, 12 - i)];
            this.gc.drawLine(x - DelX, Y, x - 1 + DelX, Y);
        }

        const h = [2, 1, 1, 2, -2];
        for (let i = 0; i < 10; i++) {
            this.gc.setPixel(x - 5 + i, y - h[Math.min(i, 9 - i)], backgroundColor);
        }
    }

    drawHeart(x, y, color, scale = 1) {
        this.gc.setFillColor(color);
        this.gc.setColor(color);
        this.gc.fillCircle(x - 2 * scale - 1, y - 2 * scale, 2 * scale);
        this.gc.fillCircle(x + 2 * scale, y - 2 * scale, 2 * scale);
        for (let i = 0; i < 4 * scale + 1; i++) {
            this.gc.drawLine(
                x - 4 * scale - 1 + i,
                y - scale + i,
                x + 4 * scale - i,
                y - scale + i
            );
        }
    }

    drawLongText(text, maxWidth, x, y, lineSpace = 2) {
        let currentWidth = 0;
        const fontHeight = this.gc.measureText('a').height;
        const textWidth = this.gc.measureText(text).width;
        maxWidth = Math.min(textWidth, maxWidth);
        text = text.split(' ');
        x -= maxWidth / 2;
        for (let i = 0; i < text.length; i++) {
            const width = this.gc.measureText(text[i]).width;
            if (currentWidth > 0 && currentWidth + width > maxWidth) {
                y += fontHeight + lineSpace;
                currentWidth = 0;
            }
            this.gc.drawText(x + currentWidth, y, text[i]);
            if (text[i].includes('\n')) {
                currentWidth = 0;
                y += fontHeight + lineSpace;
            } else {
                currentWidth += width + this.gc.measureText(' ').width;
            }
        }
    }

    drawArrow(handler, x, y) {
        if (this.pressedButton === handler) {
            this.gc.setFillColor(this.gc.color16(32, 35, 51));
            this.gc.fillRoundRect(x - 6, y - 6, 10, 11, 1);
        }
        const textColor =
            this.pressedButton === handler
                ? this.gc.color16(255, 255, 255)
                : utils.convertStringToColor16(constants.COLOR[5]);
        this.gc.setFontColor(textColor);
        this.gc.drawText(x - 2, y - 3, '>');
    }

    drawSelectPopup() {
        this.gc.setFillColor(utils.convertStringToColor16(constants.COLOR[2]));
        this.gc.fillRect(0, this.screenHeight - 48, this.screenWidth, 48);

        this.gc.setFontColor(this.gc.color16(255, 255, 255));
        const m = this.gc.measureText(this.dreamTitle);
        this.gc.drawText((this.screenWidth - m.width) / 2, this.screenHeight - 36, this.dreamTitle);
        this.gc.setFontColor(this.gc.color16(255, 255, 255));
        this.drawArrow(Input.L, this.screenWidth - 16, this.screenHeight - 36);
        this.drawButton(Input.C, 'DREAM START', this.screenWidth / 2, this.screenHeight - 16);
    }

    drawProgressBar(x, y, max, current) {
        let width = 62;
        let height = 8;
        this.gc.setFillColor(this.gc.color16(0, 0, 0));
        this.gc.fillRoundRect(x - width / 2, y - height / 2, width, height, 1);
        width -= 4;
        height -= 4;
        this.gc.setFillColor(this.gc.color16(255, 255, 255));
        this.gc.fillRect(x - width / 2, y - height / 2, width, height);
        this.gc.setFillColor(utils.convertStringToColor16(constants.COLOR[3]));
        this.gc.fillRect(
            x - width / 2,
            y - height / 2,
            Math.min(Math.floor((width / max) * current), width),
            height
        );
    }
    //------------------------------------------------------------------------------

    // ETC Functions
    updateAssets() {
        this.dreamMap.data = fs.readFile(`/dream/${this.dream}/map`);
        this.dreamTitle = this.decoder.decode(fs.readFile(`/dream/${this.dream}/title`));
    }

    async updateStat(round, angled, square, spark) {
        this.statR += round;
        this.statA += angled;
        this.statS += square;
        this.statK += spark;
        if (!process.env.TEST) {
            const currentTime = rtc.getTime() / 1000;
            fs.writeFile(`/egg/${this.eggNum}/stat/R`, utils.intToArray(this.statR));
            fs.writeFile(`/egg/${this.eggNum}/stat/S`, utils.intToArray(this.statS));
            fs.writeFile(`/egg/${this.eggNum}/stat/A`, utils.intToArray(this.statA));
            fs.writeFile(`/egg/${this.eggNum}/stat/K`, utils.intToArray(this.statK));
            fs.writeFile(`/egg/${this.eggNum}/stat/updatedAt`, utils.intToArray(currentTime));
            if (this.wifiConnected) {
                try {
                    await this.sendEncryptedRequest(
                        `http://${process.env.API_SERVER}/egg/setSpec`,
                        {
                            id: this.eggNum,
                            spec: {
                                round: this.statR,
                                angled: this.statA,
                                square: this.statS,
                                spark: this.statK,
                                updatedAt: currentTime,
                            },
                        }
                    );
                } catch (err) {
                    console.log(err);
                    if (err === 'Connection Error') {
                        this.wifiConnected = false;
                        this.error = () => {
                            this.errorScene(
                                'Internet connection was lost. Until rebooting, the records are stored only on the game console, not on the blockchain.\n \n \n Press any button to resume',
                                50,
                                true
                            );
                        };
                        return;
                    } else {
                        this.errorScene(err);
                    }
                }
            }
        }
    }

    updateHeart() {
        if (this.heart >= constants.HEART_MAX) return null;
        const currentTime = rtc.getTime() / 1000;
        const chargingTime = process.env.TEST
            ? constants.HEART_CHARGING_TIME / 1000
            : constants.HEART_CHARGING_TIME;
        if (currentTime - this.spendedAt > chargingTime) {
            const increase = Math.floor((currentTime - this.spendedAt) / chargingTime);
            this.heart = Math.min(this.heart + increase, constants.HEART_MAX);
            this.spendedAt += increase * chargingTime;
            if (!process.env.TEST) {
                storage.setItem('spendedAt', this.spendedAt.toString());
                storage.setItem('heart', this.heart.toString());
            }
        }
        return this.heart === constants.HEART_MAX
            ? null
            : utils.secToTime(chargingTime - (currentTime - this.spendedAt));
    }

    useHeart() {
        if (this.heart === 0) {
            this.tone(200, 100);
            return false;
        }
        this.frame = 220;
        this.pressed = 20;
        if (this.heart === constants.HEART_MAX) {
            const currentTime = rtc.getTime() / 1000;
            this.spendedAt = currentTime;
            if (!process.env.TEST) {
                storage.setItem('spendedAt', currentTime.toString());
            }
        }
        this.heart--;
        if (!process.env.TEST) {
            storage.setItem('heart', this.heart.toString());
        }
        return true;
    }
    //------------------------------------------------------------------------------

    start = async () => {
        if (process.env.TEST) {
            this.setComponents();
            this.copyRightScene();
        } else {
            const succeed = await this.initDevice();
            if (succeed) {
                delay(500);
                this.devideEggData();
                this.setComponents();
                delay(500);
                this.copyRightScene();
            }
        }
    };
}

const gameScene = new GameScene();
gameScene.init();
gameScene.start();

module.exports = GameScene;
