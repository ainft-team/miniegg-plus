const fs = require('fs');
const DREAMS = require('../assets/dreams.json');
const MUSICS = require('../assets/musics.json');
const {constants} = require('../constants.js');
const EFFECTS = require('../assets/effects.json');
const Encoder = new TextEncoder();
if (!fs.exists('/dream')){
    fs.mkdir('/dream');
}
if (!fs.exists('/egg')){
    fs.mkdir('/egg');
}
if (!fs.exists('/effect')){
    fs.mkdir('/effect');
}
for (const effect in EFFECTS) {
    if (!fs.exists(`/effect/${effect}`)){
        fs.writeFile(`/effect/${effect}`, atob(EFFECTS[effect]));
    }
}
for (const dream in DREAMS) {
    if (!fs.exists(`/dream/${dream}`)){
        fs.mkdir(`/dream/${dream}`);
    }
    if (!fs.exists(`/dream/${dream}/map`)) {
        fs.writeFile(`/dream/${dream}/map`, atob(DREAMS[dream].data));
    }
    if (!fs.exists(`/dream/${dream}/title`)) {
        fs.writeFile(`/dream/${dream}/title`, Encoder.encode(DREAMS[dream].title));
    }
    if (!fs.exists(`/dream/${dream}/effect`)) {
        fs.writeFile(`/dream/${dream}/effect`, new Uint8Array(DREAMS[dream].effect));
    }
    if (!fs.exists(`/dream/${dream}/music`)) {
        const encodedData = Encoder.encode(MUSICS[dream].data);
        let data = new Uint8Array(encodedData.length+2);
        data[0] = MUSICS[dream].rhythm;
        data[1] = MUSICS[dream].tempo;
        data.set(encodedData, 2);
        fs.writeFile(`/dream/${dream}/music`, data);
    }
}