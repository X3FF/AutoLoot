const EventEmitter = require("events").EventEmitter
const FilterMng = require("./lib/filterMng")
const RFOPackets = require("./rfoPackets")
const { sleep, Vec3, arrayItemDelete } = require("./lib/helpers")

const LOOT_NORMAL_LIFETIME = 60e3
const LOOT_OPEN_LIFETIME   = 40e3;
const LOOT_HURRY_LIFETIME  = 10e3;
const LOOT_LIFETIME_ARR = [ LOOT_NORMAL_LIFETIME, LOOT_OPEN_LIFETIME, LOOT_HURRY_LIFETIME ]

class Loot {
	constructor(msg) {
		this.byItemTableCode = msg.byItemTableCode
		this.wItemRecIndex = msg.wItemRecIndex
		this.byAmount = msg.byAmount
		this.thingID = msg.thingID
		
		this.wItemBoxIndex = msg.wItemBoxIndex
		this.dwOwerSerial = msg.dwOwerSerial
		this.idDumber = msg.idDumber
		this.byState = -1//msg.byState
		this.zPos = msg.zPos
		this.byThrowerRace = msg.byThrowerRace
		
		this.time = Date.now()
		this.timeCreate = this.time
		this.timeUpdate = 0
		this.timeDeath = 0
		this.update(msg)
		
		this.dist = 1e9
		
		this.clItemboxTakeRequest_rawPacket = (new RFOPackets.CL_ItemboxTakeRequest({ 
			wItemBoxIndex: this.wItemBoxIndex
		})).toRawPacket()
	}
	update(msg) {
		if ( this.byState === msg.byState )
			return false
		
		this.byState = msg.byState
		
		const now = Date.now()
		
		this.timeUpdate = now
		this.timeDeath = now + ( LOOT_LIFETIME_ARR[ this.byState ] || LOOT_NORMAL_LIFETIME )
		
		//console.log("Loot::update.timeDeathLast: ", this.timeDeath - now)
		
		return true
	}
	
	updateDist(pos) {
		this.dist = Vec3.distXZ(pos, this.zPos)
	}
}

/**
create
update
delete
*/
class LootState extends EventEmitter {
	constructor(options) {
		super()
		
		this.netFilterMngGroup = options.netFilterMng.group()
		
		this.work = true
		
		this.lootMap = new Map()
		this.lootWorker()
		this.netFilterMngGroup.sv.on(RFOPackets.SV_ItemboxCreate.ID       , msg => this.createLoot(msg))
		this.netFilterMngGroup.sv.on(RFOPackets.SV_ItemboxFixposition.ID  , msg => {
			if ( !this.updateLoot(msg) )
				this.createLoot(msg)
		})
		this.netFilterMngGroup.sv.on(RFOPackets.SV_ItemboxStateChange.ID  , msg => this.updateLoot(msg))
		this.netFilterMngGroup.sv.on(RFOPackets.SV_ItemboxDestroy.ID      , msg => this.deleteLoot(msg))
		
		/// когда новая карта, очистить лут
		this.netFilterMngGroup.sv.on(RFOPackets.SV_UnkEventNewMap.ID      , () => {
			[...this.lootMap.values()]
				.map(loot => this.deleteLoot(loot))
		})
	}

	async lootWorker() {
		while( this.work ) {
			const now = Date.now();
			
			[...this.lootMap.values()]
				.filter(loot => now > loot.timeDeath)
				.map(loot => this.deleteLoot(loot))
			
			await sleep(1e3)
		}
	}

	createLoot(msg) {
		const loot = new Loot(msg)
		this.lootMap.set(loot.wItemBoxIndex, loot)
		this.emit("create", loot)
	}
	updateLoot(msg) {
		const loot = this.lootMap.get(msg.wItemBoxIndex)
		if ( !loot )
			return false
		
		if ( loot.update(msg) )
			this.emit("update", loot)
		
		return loot
	}
	deleteLoot(msg) {
		const loot = this.lootMap.get(msg.wItemBoxIndex)
		if ( !loot )
			return false
		
		//console.log("Loot alive time: " + (Date.now() - loot.timeCreate))
		this.lootMap.delete(msg.wItemBoxIndex)
		this.emit("delete", loot)
		return loot
	}
	getLoot(msg) {
		return this.lootMap.get(msg.wItemBoxIndex)
	}

	close() {
		this.netFilterMngGroup.offAll()
		this.work = false
		
		this.eventNames().map(e => this.removeAllListeners(e))
	}
}

module.exports = LootState