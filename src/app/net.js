const EventEmitter = require("events").EventEmitter
const RFOPackets = require("./rfoPackets")

class Net extends EventEmitter {
	constructor(options) {
		super()
		
		this.netFilterMng = options.netFilterMng
		this.senderToClient = options.senderToClient
		this.senderToServer = options.senderToServer
		
		this._packets = []
		this._loopped = false
	}

	packetLoop() {
		this._loopped = true
		for(let packet; packet = this._packets.shift(); ) {
			const ID = packet.rawPacket.readUInt16LE(2)
			
			try {
				const RFOPacket = RFOPackets[ID]
				if ( RFOPacket ) {
					const rfoPacket = RFOPacket.fromBuffer(packet.rawPacket.subarray(2))
					if ( !( packet.type === "cl" ? 
							this.netFilterMng.cl.emit(RFOPacket.ID, rfoPacket, packet.from) :
							this.netFilterMng.sv.emit(RFOPacket.ID, rfoPacket, packet.from) ) )
						continue
				}
			} catch(e) {
				console.log(e, e.stack)
			}
			
			( packet.type === "cl" ) ?
				this.senderToServer(packet.rawPacket) :
				this.senderToClient(packet.rawPacket) ;
		}
		this._loopped = false
	}

	clPacket(rawPacket, from = Net.SRC_NATIVE) {
		this._packets.push({ type: "cl", rawPacket, from })
		if ( !this._loopped )
			this.packetLoop()
	}

	svPacket(rawPacket, from = Net.SRC_NATIVE) {
		this._packets.push({ type: "sv", rawPacket, from })
		if ( !this._loopped )
			this.packetLoop()
	}
	
	close() {
		this.eventNames().map(e => this.removeAllListeners(e))
		this.clPacket = () => {}
		this.svPacket = () => {}
	}
}
Net.SRC_NATIVE = 1;
Net.SRC_PLUGINS = 2;

module.exports = Net