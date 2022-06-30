const net = require("net")
const fs = require("fs")
const EventEmitter = require("events").EventEmitter
const { exec, execSync } = require("child_process")

const log = (...args) =>
	fs.appendFileSync("auto-loot-log.txt", JSON.stringify(args,1,1) + "\n")

function RFOReplaceIPPORT(ip, port) {
	const fs = require("fs")
	const buffer = fs.readFileSync("./System/DefaultSet.tmp")

	const key = [0x3A, 0x4B, 0x9C, 0xCB, 0xB6, 0x4F]
	for(let i = 0; i < 6; i++)
		buffer[i] ^= key[i]

	const obj = { 
		ip: [...buffer.slice(0, 4)].join("."),
		port: buffer.readUInt16LE(4)
	}

	ip
		.split(".")
		.map(Number)
		.map((v, i) => buffer[i] = v)
	
	buffer.writeUInt16LE(port, 4)
	
	for(let i = 0; i < 6; i++)
		buffer[i] ^= key[i]
	
	fs.writeFileSync("./System/DefaultSet.tmp", buffer)
	
	return obj
}


log(" => ")
let rfServerAddress;
const server = net.createServer((socket) => {
	log("Sokcet....................")
	socketProcess(socket)
})
.on('error', (err) => {
	throw err;
})
.listen(0, "127.0.0.1", e => {
	rfServerAddress = RFOReplaceIPPORT("127.0.0.1", server.address().port)
	log( rfServerAddress )
	log( server.address() )

	//return

	try {
		//fs.renameSync("RF_Online_original.bin", "RF_Online.bin")
		exec("RF_Online.bin")
	} catch(e) {
		log("error..." + e.message)
	}
})




process.on('uncaughtException', function (err) {
	log("uncaughtException", err.message, err.stack);
})






let logPackFn = () => {}
setInterval(() => {
	try {
		logPackFn = Function("input, require, context, next", fs.readFileSync("./autoloot/src/log-eval.js"))
	} catch(e) {
		log(e.message, e.stack)
	}
}, 2e3)
function logPacket(type, buffer, isEmu, id, ctx) {
	//log("logPacket")
	const path = `./logs/${id}.txt`
	
	var size = buffer.readUInt16LE(0)
	var cmd = buffer.readUInt16LE(2)
	var data = buffer.slice(4)
	
	const input = {type, size, cmd, data, buffer}
	
	const next = {
		forward: true
	}
	
	let filter = {};
	try {
		if  ( !logPackFn(input, require, ctx, next) ) {
			return next.forward;
		}
	} catch(e) {
		log(e.message, e.stack)
	}
	
	let tmp = data.toString("hex").match(/../g);
	tmp = tmp ? tmp.join(" ") : ""
	
	let text = `${type}${isEmu ? "*" : ""}[${size}] ${cmd}(${cmd >> 8}/${cmd & 0xFF}) DATA: ${tmp}	\r\n`;
	
	//fs.appendFileSync(path, text);
	
	return next.forward;
}


class NetFilter extends EventEmitter {
	constructor() {
		super()
	}


	dataToClient(...args) {
		this.emit("dataToClient", ...args)
	}
	dataToServer(...args) {
		this.emit("dataToServer", ...args)
	}
	shadowClose(...args) {
		this.emit("shadowClose", ...args)
	}
	
	close() {}
}
class NetFilterNoop extends NetFilter {
	constructor() {
		super();
	}
	
	dataToClient(...args) {
		this.emit("dataToClient", ...args)
	}
	dataToServer(...args) {
		this.emit("dataToServer", ...args)
	}
	shadowClose(...args) {
		this.emit("shadowClose", ...args)
	}
}

class RFOFilterLog extends NetFilterNoop {
	constructor() {
		super();
		
		RFOFilterLog.SEQ = RFOFilterLog.SEQ || 0;
		this.idNum = RFOFilterLog.SEQ++;
	}
	
	dataToClient(data, ...args) {
		logPacket("recv", data, args[0], this.idNum, this) &&
		this.emit("dataToClient", data, ...args)
	}
	dataToServer(data, ...args) {
		logPacket("send", data, args[0], this.idNum, this) &&
		this.emit("dataToServer", data, ...args)
	}
}
class RFOFilter extends NetFilter {
	constructor() {
		super();
		
		this.bufferDataToClient = Buffer.alloc(0);
		this.bufferDataToServer = Buffer.alloc(0);
	}
	
	_getPacket(b) {
		if ( b.length < 2 ) {
			return null;
		}
		
		let size = b.readUInt16LE();
		if ( b.length < size ) {
			return null;
		}
		
		return b.slice(0, size);
	}
	
	_dataProcess(buf, bufNew, callback) {
		buf = Buffer.concat([buf, bufNew]);
		
		let packet;
		while(packet = this._getPacket(buf)) {
			buf = buf.slice(packet.length)
			callback(packet)
		}
		
		return buf
	}
	
	dataToClient(data, ...args) {
		this.bufferDataToClient = this._dataProcess(this.bufferDataToClient, data, (packet) => {
			this.emit("dataToClient", packet, ...args)
		});
	}
	dataToServer(data, ...args) {
		this.bufferDataToServer = this._dataProcess(this.bufferDataToServer, data, (packet) => {
			this.emit("dataToServer", packet, ...args)
		});
	}
}



class Filters extends EventEmitter {
	constructor() {
		super()
		
		this.emitDataToClient = data => this.emit("dataToClient", data)
		this.emitDataToServer = data => this.emit("dataToServer", data)
		this.emitShadowCloseClient = data => this.emit("shadowClose", data)
		
		this.baseFilter = new NetFilterNoop()
		this._filterOn(this.baseFilter)
		
		this.filters = [this.baseFilter];
	}
	
	_filterOn(filter) {
		filter.on("dataToClient", this.emitDataToClient)
		filter.on("dataToServer", this.emitDataToServer)
		filter.on("shadowClose", this.emitShadowCloseClient)
	}
	_filterOff(filter) {
		filter.off("dataToClient", this.emitDataToClient)
		filter.off("dataToServer", this.emitDataToServer)
		filter.off("shadowClose", this.emitShadowCloseClient)
	}
	
	addFilter(filter) {
		let lastFilter = this.filters[this.filters.length - 1]
		
		this._filterOff(lastFilter)
		lastFilter.on("dataToClient", filter.dataToClient.bind(filter))
		lastFilter.on("dataToServer", filter.dataToServer.bind(filter))
		lastFilter.on("shadowClose", filter.shadowClose.bind(filter))
		this._filterOn(filter)
		
		this.filters.push(filter)
	}
	
	dataToClient(...args) {
		this.filters[0].dataToClient(...args)
	}
	dataToServer(...args) {
		this.filters[0].dataToServer(...args)
	}
	shadowClose(...args) {
		this.emit("shadowClose")
	}
	
	close() {
		this.filters.forEach(f => f.close())
	}
}


function exit() {
	setTimeout(() => {
		process.exit(0)
	}, 100)
}

function socketProcess(socket) {
	socket.setNoDelay(true)
	let sizeSvData = 0;
	let sizeClData = 0;
	
	log("Start socket...")
	try {
		
	setInterval(() => {
		console.log(`@NET: toClient=${sizeSvData} toServer=${sizeClData}`)
	}, 10e3)
		
	const filters = new Filters()
	filters.addFilter(new RFOFilter)
	filters.addFilter(new RFOFilterLog)
		
	let connected = false
	let bufArray = []
	const dstSock = new net.Socket()
	dstSock.setNoDelay(true)
	
	function svData(data) {
		sizeSvData += data.length
		socket.write(data)
	}
	function clData(data) {
		sizeClData += data.length
		dstSock.write(data)
	}
	
	dstSock
		.on('error', (error) => {
			log("Server error( %s )", error.message)
			try{socket.destroy();} catch(e){}
		})
		.on('connect', () => {
			connected = true;
			log("Connected to %s:%s")
			
			if ( bufArray.length ) {
				bufArray.forEach(data => {
					//dstSock.write(data)
					filters.dataToServer(data)
				})
			}
		})
		.on("data", (data) => {
			//log("svcl", data)
			//socket.write(data)
			filters.dataToClient(data)
		})
		.on("close", () => {
			log("Close from server");
			try{socket.destroy();} catch(e){}
			exit()
		})
		.connect(rfServerAddress.port, rfServerAddress.ip);
	
	log("conect try...", rfServerAddress.port, rfServerAddress.ip)
	
	
	socket
		.on("data", data => {
			if ( !connected ) {
				bufArray.push(data)
				return;
			}
			
			//log("clsv", data)
			
			//dstSock.write(data);
			filters.dataToServer(data)
		})
		.on("close", () => {
			log("Close from client");
			try{dstSock.destroy();} catch(e){}
			exit()
		})
		.on("error", () => {
			log("Client error( %s )", error.message)
			try{dstSock.destroy();} catch(e){}
		})
	

	filters.on("dataToClient", data => {
		svData(data)
	})
	filters.on("dataToServer", data => {
		clData(data)
	})	
	
	} catch(e) {
		log("error " + e.message)
	}
}
