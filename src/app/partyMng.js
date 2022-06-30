const RFOPackets = require("./rfoPackets")

class PartyMng {
	constructor(options) {
		this.byLootShareMode = 0;
		this.list = [];
		this._set = new Set();

		this.selfDwSerial = options.selfDwSerial
		this.netFilterMngGroup = options.netFilterMng.group();
		this.netFilterMngGroup.sv.on(RFOPackets.SV_PartyJoinJoinerResult.ID      , this.SV_PartyJoinJoinerResult.bind(this)   )
		this.netFilterMngGroup.sv.on(RFOPackets.SV_PartyJoinMemberResult.ID      , this.SV_PartyJoinMemberResult.bind(this)   )
		this.netFilterMngGroup.sv.on(RFOPackets.SV_PartyLeaveSelfResult.ID       , this.onLeave.bind(this)                    )
		this.netFilterMngGroup.sv.on(RFOPackets.SV_PartyLeaveCompulsionResult.ID , this.onLeave.bind(this)                    )
		this.netFilterMngGroup.sv.on(RFOPackets.SV_AlterPartyLootShareMode.ID    , this.SV_AlterPartyLootShareMode.bind(this) )
	}
	
	_update() {
		this._set = new Set(this.list.map(u => u.dwSerial))
		console.log(this.byLootShareMode, this.list)
	}

	SV_PartyJoinJoinerResult(msg) {
		this.list = msg.list;
		this.byLootShareMode = msg.byLootShareMode;
		this._update();
	}
	SV_PartyJoinMemberResult(msg) {
		this.list.push(msg);
		this.byLootShareMode = msg.byLootShareMode;
		this._update();
	}
	onLeave(msg) {
		this.list = this.list.filter(u => u.dwSerial !== msg.dwExiterSerial)
		if ( msg.dwExiterSerial === this.selfDwSerial.dwSerial ) {
			this.byLootShareMode = 0
			this.list = []
		}
		
		this._update()
	}
	SV_AlterPartyLootShareMode(msg) {
		this.byLootShareMode = msg.byLootShareMode
		this._update();
	}
	
	has(dwSerial) {
		return this._set.has(dwSerial)
	}
	
	close() {
		this.netFilterMngGroup.offAll()
	}
}

module.exports = PartyMng