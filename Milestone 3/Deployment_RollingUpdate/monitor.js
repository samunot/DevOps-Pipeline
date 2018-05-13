var request = require('request');
var os = require('os');
var exec = require('child_process').exec;

/// iTrust nodes
var nodeServers = 
[
	// replace with your ips for iTrust2 nodes
	{url:"http://35.171.157.68:8080/iTrust2"},
	{url:"http://52.91.233.192:8080/iTrust2"},
	{url:"http://54.167.187.175:8080/iTrust2"},
	{url:"http://52.203.25.80:8080/iTrust2"},
	{url:"http://52.207.59.146:8080/iTrust2"}
];

function getStatus(server)
{
	var options = 
	{
		url: server.url
	};
	var statusCode;
	request(options, function (error, res, body) 
	{
		console.log( error || res.statusCode, server.url);
		if (res) statusCode = res.statusCode;
	});
	return statusCode;
}

function monitorStatus()
{
	var nodes = nodeServers.map( getStatus )
	return nodes;
}

var heartbeatTimer = setInterval( 
	function () 
	{
		try {
			var data = { 
				name: "iTrust servers", nodes: monitorStatus()
			};
			console.log("***********************************")
		} catch(e){
			console.log("Error!");
			clearInterval(heartbeatTimer);
		}
		
	}, 2500);




