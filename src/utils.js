const { constants } = require("./constants");

const convertVoltToPercent = (voltage) => {
    const boundary = [
        3.541, 3.676, 3.719, 3.738, 3.772, 3.81, 3.868, 3.95, 4.036,
    ];
    let i;
    for (i = 0; i < boundary.length; i++) {
        if (boundary[i] > voltage) break;
    }
    return 10 * (i + 1);
};

//return changedFrame and isReset(boolean)
const updateAnimation = (frame) => {
    if (frame < 0) return [frame, false];
    if (frame > 12) return [-1, true];
    return [++frame, false];
};

const getBias = (frame, angry) => {
    if (frame <= 0) return [0, 0];
    if (angry) {
        switch (frame) {
            case 8:
                return [0, 0];
            case 9:
            case 11:
                return [1, 0];
            case 10:
            case 12:
                return [-1, 0];
            default:
                return [0, 2];
        }
    }
    if (frame === 2 || frame > 7) return [0, 0];
    return [0, 2];
};

const convertStringToColor16 = (colorCode) => {
    const r = parseInt(colorCode.substr(0, 2), 16);
    const g = parseInt(colorCode.substr(2, 2), 16);
    const b = parseInt(colorCode.substr(4, 2), 16);
    return ((r & 0xf8) << 8) | ((g & 0xfc) << 3) | (b >> 3);
};

const secToTime = (duration) => {
    let seconds = Math.floor(duration % 60),
        minutes = Math.floor((duration / 60) % 60),
        hours = Math.floor((duration / (60 * 60)) % 24);

    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    return hours + ':' + minutes + ':' + seconds;
};

const randomBytes = (num) => {
    seed(millis());
    const array = new Uint8Array(num);
    for (let i = 0; i < num; i++) {
        array[i] = Math.floor(Math.random() * 256);
    }
    return array;
};

const intToArray = (n) => {
    if (!n) return new Uint8Array([0]);
    const a = [];
    a.unshift(n & 255);
    while (n >= 256) {
        n = n >>> 8;
        a.unshift(n & 255);
    }
    return new Uint8Array(a);
};

const arrayToInt = (array) => {
    if (!array) return 0;
    let sum = 0;
    for (let i = 0; i < array.length; i++) {
        sum += array[array.length - 1 - i] * 256 ** i;
    }
    return sum;
};

const convertErrorCodeToMessage = (code) => {
    if (isNaN(parseInt(code))) return code.toString();
    switch (code) {
        case constants.STATUS_CODE.NOT_EXIST:
            return 'Your Miniegg does not exist.\n Please register your Miniegg first.';
        case constants.STATUS_CODE.UNAUTHORIZED:
            return 'Your game console is unauthorized.'
        case constants.STATUS_CODE.INVALID_PARAMS:
            return 'Invalid parameters'
        default:
            return 'Server Error'
    }
}

function getHashCode(str) {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i += 1) {
        const chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return `${Math.abs(hash)}`.padStart(10, 0);
}

exports.convertVoltToPercent = convertVoltToPercent;
exports.updateAnimation = updateAnimation;
exports.getBias = getBias;
exports.convertStringToColor16 = convertStringToColor16;
exports.secToTime = secToTime;
exports.randomBytes = randomBytes;
exports.intToArray = intToArray;
exports.arrayToInt = arrayToInt;
exports.convertErrorCodeToMessage = convertErrorCodeToMessage;
exports.getHashCode = getHashCode;
