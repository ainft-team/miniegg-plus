const { ESP8266HTTPClient } = require('./index');
const esp = new ESP8266HTTPClient(null, { debug: true });

esp.wifi({ ssid: 'test-ssid', password: 'test-pwd' })
    .then(() => {
        console.log('Wi-Fi connected');
        esp.http('test-url', {
            method: 'POST',
            body: '{"address":"boo"}',
            headers: { 'content-type': 'application/json' },
        })
            .then((res) => {
                const result = JSON.parse(res.body);
                console.log(result);
            })
            .catch((err) => {
                console.log(err);
            });
    })
    .catch(() => {
        esp.scan()
            .then((r) => {
                console.log(r);
            })
            .catch((err) => {
                console.log(err);
            });
    });
