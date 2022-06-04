const testSSID = 'YOUR_WIFI_NAME_GOES_HERE';
const testPWD = 'YOUR_WIFI_PASSWORD';

if(storage.getItem('ssid') !== testSSID) {
    storage.setItem('ssid', testSSID);
}
if(storage.getItem('pwd') !== testPWD) {
    storage.setItem('pwd', testPWD);
}
