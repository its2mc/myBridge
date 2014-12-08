/* 
* This work has been done by Phillip Ochola Mak'Anyengo
* Email: its2uraps@gmail.com
*
* This work uses open source code and libraries and 
* can therefore be replicated unless certain portions
* are stated otherwise. 
*
* Please contact the author when using the code.
*
*/

/* 
Using the experience gained from the chat app and the video bridge
I decided to design a bridge that can route on a one-to-one basis
or a one-to-many basis for any kind of data including text, multipart 
messages, file streams e.t.c
The data has to be structured using JSON to work. Hopefully the
parsing does not create any latency
*/

//Express is not necesary for this application.
var express = require('express'),
    path = require('path'),
	fs = require('fs'),
	https = require('https'),
	httpsPort = (process.env.VCAP_APP_PORT|| 443),
	app = express();
	
// Set up express environment
express.static.mime.default_type = "text/json";
//app.use(express.compress());

//app.use(express.static(path.join(__dirname, '/keys')));

// Enable reverse proxy support in Express. This causes the
// the "X-Forwarded-Proto" header field to be trusted so its
// value can be used to determine the protocol. See 
// http://expressjs.com/api#app-settings for more details.
app.enable('trust proxy');

// Add a handler to inspect the req.secure flag (see 
// http://expressjs.com/api#req.secure). This allows us 
// to know whether the request was via http or https.
app.use (function (req, res, next) {
	if (req.secure) {
		// request was via https, so do no special handling
		next();
	} else {
		// request was via http, so redirect to https
		res.redirect('https://' + req.headers.host + req.url);
	}
});

app.use(express.static(path.join(__dirname, '/public')));

/*
var privateKey = fs.readFileSync('75501921-mybridgingapp.net.key', 'utf8'),
	certificate = fs.readFileSync('75501921-mybridgingapp.net.cert', 'utf8'),
	credentials = {key: privateKey, cert: certificate},
	httpsServer = https.createServer(credentials, app);
*/

//Start the server
var httpsServer;
//httpsServer.listen(httpsPort);
//console.log('HTTPS Server: http://localhost:'+ httpsPort);

//The Channel object declaration
var channels = [];
var channel = function (pass){
	var temp= {
		channelPass: pass,
		subscribers: [],
		subscribe: function(sock){
			for(var i in this.subscribers) if(this.subscribers[i]==sock) return 0;
			this.subscribers.push(sock);
			return 1;
			},
		unsubscribe: function(sock){
			for(var i in this.subscribers)
				if (this.subscribers[i]==sock) this.subscribers.splice(i,1);
			return 1;
			},
		broadcast: function(msg){
			for (var i in this.subscribers)
				 this.subscribers[i].send(msg);
			return 1;
			},
		stats: function(){
			var string = "Channel pass: " + this.channelPass + " || Subscribers: " + JSON.stringify(this.subscribers);
			return string;
		}
	};
	return temp;
};
	
//Function to recieve Messages from clients and translate into cloud commands If no commands then translator
//gives a console error and performs no function on the client side.
var translator = function(msg,userSock){
	var tempCmd = JSON.parse(msg);
	switch (tempCmd.command) {
		case "createChannel" : 
			try{
				if(channels[tempCmd.channelId] = channel(tempCmd.pass))	console.log("Channel Creation Successful\n");
				else console.log("Channel Already exists");
			}catch(e){
				console.log("Error Has occured during channel creation \n");
			}
		break;
		
		case "destroyChannel":
			try{
				for (var i in channels)
					if(i==tempCmd.channelId) channels.splice(i,1);
				console.log("Channel Destruction Successful\n");
			}catch(e){
				console.log("Error Has occured during channel destruction\n : "+e);
			}
		break;
		
		case "subscribe" : 
			try{
				if(channels[tempCmd.channelId].subscribe(userSock))	console.log("Subscription Successful\n");
				else throw "Subscriber Already Exists";
			}catch(e){
				console.log("Error Has occured during subscription\n" + e);
			}
		break;
		
		case "unsubscribe" : 
			try{
				channels[tempCmd.channelId].unsubscribe(userSock);
				console.log("Unsubscription Successful\n");
			}catch(e){
				console.log("Error Has occured during unsubscription\n"+e);
			}
		break;
		
		case "showStats" : 
			try{
				console.log(channels[tempCmd.channelId].stats());
			}catch(e){
				console.log("The following error occured\n"+e);
			}
		break;
		
		default:
			try{ 
				channels[tempCmd.channelId].broadcast(tempCmd.data);
			}catch(e){
				console.log("The following error occured\n"+e);
			}
		break;
	}
};

// Start listening on the port
var server = app.listen(httpsPort, function() {
	console.log('Listening on port %d', server.address().port);

//	console.log('HTTPS Server: http://localhost:'+ httpsPort);
});


// start websocket server
	var WebSocketServer = require('ws').Server,
	    wss = new WebSocketServer({
			//server: httpsServer
			port: httpsPort
	//		server: server
	    });
	console.log('WSS Server: wss://localhost:'+ httpsPort);
	
	wss.on('connection', function (ws) {
		console.log('New User\n');
	    ws.on('message', function (message) {
	        translator(message,ws);
	    });
});



