# miniegg-plus
MiniEgg is Comcomm's own NFT that can be hatched into other NFTs. MiniEgg Plus is a project that interacts with the Blockchain to allow this Miniegg NFT to grow through games.

## Prerequisite
- Node version: v14.17.6+
- NPM version: v6.14.15+

## Installation

1. Clone this repository and then go into the folder.
```bash
git clone git@github.com:ainft-team/miniegg-plus.git
cd miniegg-plus
```
2. Install dependencies.
```bash
yarn
```

## Usage
### Build
- Development mode
```bash
npm run build:dev
```
- Production mode
```bash
npm run build
```

The default build target file is 'src/index.js'. If you want to build other file,
```bash
FILE_PATH=<file_path> npm run build
```

### Upload scripts
```bash
bash upload.sh {local|dev|prod} [<filePath>]
```

### Reset / set Wi-Fi
1. Connect MiniEgg+ device to your computer
2. Run the wifi resetting script. Note that if you set testSSID and testPWD in `src/settings/reset-wifi.js` to the actual wi-fi you want to use, it will connect to it after the uploads. If you set them to dummy values, it will not be able to connect to a wi-fi and take you to the wi-fi setting screen.
```bash
bash scripts/upload.sh dev src/settings/reset-wifi.js
```
3. Run the device setting script
```bash
bash scripts/upload.sh dev
```
