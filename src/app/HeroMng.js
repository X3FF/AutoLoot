const FilterMng = require("./lib/filterMng")
const RFOPackets = require("./rfoPackets")
const autoPackThings = require("./autoPackThings")
const { sleep, Vec3, arrayItemDelete } = require("./lib/helpers")

const autoPackThingsMap = autoPackThings.reduce((m, t) => m.set(t.thingID, {
	heroRequestData: Buffer.from(t._732, "hex"),
	...t
}), new Map())

class HeroMng {
	constructor(options) {
		this.net = options.net
		this.netFilterMngGroup = options.netFilterMng.group()
		this.autoLoot = options.autoLoot

		this.work = true
		
		this.queue = []

		this.heroFree = true
		this.heroUse = false
		this.expectedDropResult = false

		/// при рестарте сбрасываем
		this.netFilterMngGroup.sv.on(RFOPackets.SV_FirstSimpliePacket.ID, msg => {
			this.queue = []
			
			this.heroFree = true
			this.heroUse = false
			this.expectedDropResult = false
		})		
		
		this.netFilterMngGroup.cl.on(RFOPackets.CL_HeroRequest.ID, msg => {
			/// если так вышло что комбинация начилась в момент авто паковки, возвращаем что комбинация не удачна
			if ( !this.heroFree ) {
				this.net.senderToClient( (new RFOPackets.SV_HeroPreResultItembox({sErrorCode: 2})).toRawPacket() )
				return FilterMng.DISCARD;
			}

			this.heroFree = false
		})
		this.netFilterMngGroup.sv.on(RFOPackets.SV_HeroPreResultItembox.ID, msg => {
			if ( this.heroUse ) {
				//console.log("RFOPackets.SV_HeroPreResultItembox", msg.heroID)
				/// если комбинация автопаковки прошла без ошибок
				if ( !msg.sErrorCode )
					this.net.senderToServer( (new RFOPackets.CL_HeroRequestPreResultItembox({heroID: msg.heroID})).toRawPacket() )
				
				if ( msg.sErrorCode ) {
					this.heroUse = false
					this.heroFree = true
				}
				
				return FilterMng.DISCARD;
			}
			
			this.heroFree = !!msg.sErrorCode
		})
		this.netFilterMngGroup.sv.on(RFOPackets.SV_HeroResultItembox.ID, msg => {
			if ( this.heroUse ) {
				this.net.senderToServer( (new RFOPackets.CL_ItemboxDrop({ 
					wItemSerial: msg.wItemSerial,
					amount: msg.amount,
				})).toRawPacket() )
				this.expectedDropResult = true
				
				this.autoLoot.addSelfLootVeryFirst(msg.thingID)
				
				this.heroFree = true
				return FilterMng.DISCARD;
			}
			
			this.heroFree = true
		})
		
		this.netFilterMngGroup.sv.on(RFOPackets.SV_ItemboxDropResult.ID, msg => {
			if ( this.expectedDropResult ) {
				this.expectedDropResult = false
				this.heroUse = false
				return FilterMng.DISCARD;
			}
		})
		
		this._onTakeResult = this.onTakeResult.bind(this)
		this.autoLoot.on("takeResult", this._onTakeResult)
		
		this.worker()
		//this._devWorker()
	}
	
	async worker() {
		while( this.work ) {
			const obj = this.queue[0]
			if ( obj ) {
				const {msg, apt} = obj
				if ( this.heroFree && !this.heroUse ) {
					/// шлем комбинацию герою
					const pack = new RFOPackets.CL_HeroRequest({
						wItemSerial: msg.wItemSerial + 0,
						data: apt.heroRequestData
					})
					
					this.heroFree = false
					this.heroUse = true
					this.net.senderToServer(pack.toRawPacket())
					this.queue.shift()
				}
			}
			
			await sleep(30)
		}
	}
	
	async _devWorker() {
		while( this.work ) {
			console.log({
				queueSize: this.queue.length,
				heroFree: this.heroFree,
				heroUse: this.heroUse,
				expectedDropResult: this.expectedDropResult,
			})
			await sleep(2e3)
		}
	}
	
	onTakeResult({loot, msg}) {
		if ( !loot || msg.sErrorCode )
			return
		
		if ( msg.byAmount !== 99 )
			return
		
		const apt = autoPackThingsMap.get(loot.thingID)
		if ( !apt )
			return
		
		if ( !this.heroFree && !this.heroUse )
			return
		
		this.queue.push({msg, apt})
		
		/// console.log( (new RFOPackets.SV_ItemboxDelete({wItemSerial: msg.wItemSerial})).toRawPacket() )
		/// TODO
		
		setTimeout(() => {
			this.net.senderToClient( (new RFOPackets.SV_ItemboxDelete({wItemSerial: msg.wItemSerial})).toRawPacket() )
		}, 0)
		
		return FilterMng.DISCARD;
	}

	close() {
		this.autoLoot.off("takeResult", this._onTakeResult)
		this.netFilterMngGroup.offAll()
		this.work = false
	}
}

module.exports = HeroMng