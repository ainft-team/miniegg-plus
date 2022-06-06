const constants = {
  VERSION: '1.0.0',
  MAX_FPS: 16, // frame per second
  DEBOUNCE_TIME: 10, // debounce time for button
  HEART_CHARGING_TIME: 14400, //4 hours in sec
  HEART_MAX: 3,
  DREAM_TIME: 7200, //2 hours in sec
  KEYBOARD: [ // NOTE(doheun): It is stored as an array instead of an object because of memory.
      //for keyboard
      'ABCDEFGHIJKLM',
      'NOPQRSTUVWXYZ',
      'abcdefghijklm',
      'nopqrstuvwxyz',
      '0123456789!#$',
      '%&()*+,-_./:;',
      '<=>?@[]`^{|}~',
  ],
  COLOR: [
      '333a63', //background
      '202540', //menu bar
      '292d42', //popup
      '9731ff', //progress bar, button
      '6a22b3', //button_press
      '797c8c', //gray
  ],
  STATUS_CODE: {
      SUCCESS: 200,
      UNAUTHORIZED: 401,
      INVALID_PARAMS: 452,
      NOT_EXIST: 453,
      ALREADY_EXIST: 454,
      QUOTA_EXCEED: 457,
      UNEXPECTED: 500,
      NOT_IMPLEMENTED: 501
  },
  EXP: 100000,
  // TODO(ehgmsdk20): After analyzing how much experience people get per day, we will finalize the experience point table for each level.
  // [
  //     10, 20, 40, 80, 140, 220, 330, 420, 570, 810, 1070, 1350, 1670, 2120,
  //     2890, 3550, 4300, 5160, 6120, 7180, 8440, 9900, 10500, 13270, 15130,
  //     17090, 19750, 22840, 26220,
  // ],
};

exports.constants = constants;
