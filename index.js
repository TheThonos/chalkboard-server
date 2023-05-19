const express = require('express');
const path = require('path');
const util = require('util');
const fs = require('fs');
const app = express();
const { v4: uuidv4 } = require('uuid');
require('express-ws')(app);

let clients = {};
let recording = false;
let record = [];
// let recordTime;
let recordName;


app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.ws('/client', (ws, req) => {
	ws.client = true;
	for(let client of Object.values(clients)){
		client.send('client connected');
	}
	connect(ws, req);
});
app.ws('/controller', (ws, req) => {
	ws.controller = true;
	for(let client of Object.values(clients)){
		client.send('controller connected');
	}
	connect(ws, req);
});
app.ws('/server', connect);
function connect(ws, req) {
	ws.id = uuidv4();
	clients[ws.id] = ws;
	console.log(`new ${ws.client ? 'client' : ws.controller ? 'controller' : req.headers.origin ?? req.headers.host}:`, ws.id);
	if(Object.values(clients).some((client) => client.client)) ws.send('client connected');
	else ws.send('client disconnected');
	if(Object.values(clients).some((client) => client.controller)) ws.send('controller connected');
	else ws.send('controller disconnected');
	ws.on('message', (msg) => {
		// if(msg == 'controller' || msg == 'client'){
		// 	ws[msg] = true;
		// 	for(let client of Object.values(clients)){
		// 		client.send(`${msg} connected`);
		// 	}
		// 	return;
		// }
		if(msg.substring(0, 6) == 'start ' && msg.length > 6){
			console.log('STARTING');
			console.log('starting', msg.substring(6));
			if(recording) fs.promises.writeFile('recordings/' + recordName + '.json', JSON.stringify(record));
			record = [];
			recording = true;
			recordName = msg.substring(6);
			for(let client of Object.values(clients)){
				client.send(msg);
			}
			return;
		}
		if(msg == 'end'){
			console.log('ending', recordName);
			recording = false;
			for(let client of Object.values(clients)){
				client.send(msg);
			}
			fs.promises.writeFile('recordings/' + recordName + '.json', JSON.stringify(record));
			return;
		}
		if(msg.substring(0, 5) == 'play ' && msg.length > 5){
			console.log('playing', msg.substring(5));
			if(msg.substring(5).match(/^\d+$/)){
				console.log('number');
				for(let client of Object.values(clients)){
					console.log('sending number');
					if(client.id != ws.id) client.send(msg);
				}
				return;
			}
			try{
				let data = JSON.parse(msg.substring(5));
				for(let client of Object.values(clients)){
					client.send(msg);
				}
				return;
			} catch(e){
				console.log('name');
				fs.promises.readFile('recordings/' + msg.substring(5) + '.json', 'utf8').then(data => {
					// console.log(data);
					// let array = JSON.parse(data);
					// for(let el of array){
					// 	setTimeout(() => {
					// 		for(let client of Object.values(clients)){
					// 			// console.log('sending name');
					// 			// if(client.id != ws.id) client.send(el.msg);
					// 			client.send(el.msg);
					// 		}
					// 	}, el.time);
					// }
					for(let client of Object.values(clients)){
						client.send(`play ${data}`);
					}
				})
				return;
			}
		}
		if(msg.substring(0, 6) == 'play* ' && msg.length > 6){
			for(let client of Object.values(clients)){
				client.send(msg);
			}
			return;
		}
		if(msg == 'clear') console.log('clearing');
		for(let client of Object.values(clients)){
			// console.log('sending thing');
			if(client.id != ws.id) client.send(msg);
		}
		if(recording){
			// if(record.length == 0) recordTime = Date.now();
			try{
				record.push(JSON.parse(msg));
			} catch(e){
				console.log(e);
			}
		}
	});
	ws.on('close', () => {
		if(ws.client || ws.controller){
			for(let client of Object.values(clients)){
				client.send(`${ws.client ? 'client' : 'controller'} disconnected`);
			}
		}
		delete clients[ws.id];
	});
}

app.get('/', (req, res) => {
	res.send('Hi');
});

app.get('/num', (req, res) => {
	fs.readdir('./recordings', (err, files) => {
		res.send((files.length - 1).toString());
	});
});

app.use(express.static(path.join(__dirname, 'recordings')));

app.listen();