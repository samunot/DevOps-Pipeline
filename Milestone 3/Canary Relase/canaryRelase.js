var express = require('express')
var fs = require('fs')
var httpProxy = require('http-proxy');
var request = require("request");
var app = express()
var proxy = httpProxy.createProxyServer({});
var stableIP = [];
var canaryIP = [];
var flag = false;


var app = express()
app.use(function(req, res, next) {
    var port = 80
    var server
    if (Math.random() > 0.2 || flag === true) {
        server = stableIP[Math.floor(Math.random() * (stableIP.length))]
    } else {
        server = canaryIP[Math.floor(Math.random() * (canaryIP.length))]
    }
    console.log(`Redirecting traffic to: http://${server}:${port}`);
    proxy.web(req, res, {
        target: `http://${server}:${port}`
    });
});



var refreshId = setInterval(function() {
    try {
        request('http://' + canaryIP[0] + ":80/api/study/listing", { timeout: 1500 }, function(error, res, body) {
            if (res == undefined || res.statusCode != 200) {
                flag = true;
                console.log("Alert has been raised. Canary is set off!");
                clearInterval(refreshId);
            }
        })
    } catch (e) {
        console.log("Error. Canary is set off!");
        flag = true;
    }

}, 3000);
var server = app.listen(3000, function() {
    var array = fs.readFileSync('/home/vagrant/canaryIP.txt').toString().split("\n");
    for (i = 0; i < array.length; i++) {
        if (array[i] != "") {
            canaryIP.push(array[i])
        }
    }
    array = fs.readFileSync('/home/vagrant/stableIP.txt').toString().split("\n");
    for (i = 0; i < array.length; i++) {
        if (array[i] != "") {
            stableIP.push(array[i])
        }
    }
    console.log(`Listening on ${server.address().port}`)
})