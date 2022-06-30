const RFOPackets = require("./rfoPackets")

global.__dwSerial_gb_bad = global.__dwSerial_gb_bad !== undefined ? 
	global.__dwSerial_gb_bad : 
	undefined
	
class SelfDwSerial {
	constructor(netFilterMng) {
		this.dwSerial = global.__dwSerial_gb_bad // null
		
		this.netFilterMngGroup = netFilterMng.group()
		this.netFilterMngGroup.sv.on(RFOPackets.SV_FirstSimpliePacket.ID, msg => {
			global.__dwSerial_gb_bad = this.dwSerial = msg.dwSerial
		})
	}
	
	close() {
		this.netFilterMngGroup.offAll()
	}
}

module.exports = SelfDwSerial
