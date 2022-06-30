const EventEmitter = require("events").EventEmitter
const FilterMng = require("./lib/filterMng")
const RFOPackets = require("./rfoPackets")
const LootState = require("./lootState")
const { sleep, Vec3, arrayItemDelete } = require("./lib/helpers")


const LOOT_MAX_DIST_NORMAL = 100
const LOOT_MAX_DIST_EXTENDED = 400
const LOOT_LIFETIME = 2*60e3

const FilterLootObjArr = [
  {/// Вифф
    _732: '1c00000001006100630019000000733d00004a6c000070f80001000000',
    thingID: '140700'
  },
  {/// Клинг
    _732: '3c00000001003700630019000000733d00004a6c000070f80001000000',
    thingID: '140000'
  },
  {/// Мика
    _732: '3800000001001200630019000000733d00004a6c000070f80001000000',
    thingID: '140400'
  },
  {/// Бридент
    _732: '2800000001000d00630019000000733d00004a6c000070f80001000000',
    thingID: '141300'
  },
  {/// Зид
    _732: '2400000001000c00630019000e00733dfc004a6c6b0070f81401000000',
    thingID: '140f00'
  },  
  {/// Рира
    _732: '200000000100bc00630019000000733d00004a6c000070f80001000000',
    thingID: '140b00'
  },

]
const FilterLootObjSet = new Set(FilterLootObjArr.map(v => v.thingID))

/**
takeResult
*/
class AutoLoot extends EventEmitter {
	constructor(options) {
		super()
		
		this.net = options.net
		this.selfDwSerial = options.selfDwSerial
		this.partyMng = options.partyMng
		this.moveSelf = options.moveSelf
		
		this.moveSelf
			//.on("move:start", () => console.log("Start move..."))
			//.on("move:stop", () => console.log("Stop move..."))
			//.on("update", () => console.log("CurPos: ", this.moveSelf.estimatedCurPos))

		this._onMoveSelfUpdate = this.onMoveSelfUpdate.bind(this)
		this.moveSelf.on("update", this._onMoveSelfUpdate)
		
		this.netFilterMngGroup = options.netFilterMng.group()
		
		this.work = true
		

		this.nativeRequestArr = []
		
		this.lootCreateAllMap = new Map()
		this.lootMap = new Map()
		this.lootNormalDistArr = []
		this.lootExtendedDistArr = []
		
		this.lootTakeRequestQueue = []
		
		this.selfVeryFirst = []
		this.lootSelfVeryFirstArr = []
		
		this.onTakeResult = null
		
		this.lootNoPlaceLastShowTime = 0;
		

		this.lootState = new LootState(options)
		this.lootState
			.on("create", loot => this.createLoot(loot))
			.on("delete", loot => this.deleteLoot(loot))
			///.on("create", l => console.log("Create loot: %s(%s)", l.wItemBoxIndex, l.byState))
			///.on("update", l => console.log("Update loot: %s(%s)", l.wItemBoxIndex, l.byState))
			///.on("delete", l => console.log("Delete loot: %s(%s)", l.wItemBoxIndex, l.byState))

		this.netFilterMngGroup.cl.on(RFOPackets.CL_ItemboxTakeRequest.ID, msg => {
			/// ведем свою очередь запросов клиента
			this.nativeRequestArr.push(msg)
			return FilterMng.DISCARD;
		})
		this.netFilterMngGroup.sv.on(RFOPackets.SV_ItemboxTakeNewResult.ID, this.takeResult.bind(this))
		this.netFilterMngGroup.sv.on(RFOPackets.SV_ItemboxTakeAddResult.ID, this.takeResult.bind(this))
		
		this.worker()
		this.workerForLifetime()
		//this._devWorkerShowState()
	}
   
	addSelfLootVeryFirst(thingID) {
		this.selfVeryFirst.push({
			thingID,
			time: Date.now()
		})
	}
 
	onMoveSelfUpdate() {
		this.sortLoot()
	}
	
	async sortLoot() {
		this.lootNormalDistArr = []
		this.lootExtendedDistArr = []
		for(const loot of this.lootMap.values()) {
			if ( this.moveSelf.estimatedCurPos )
				loot.updateDist(this.moveSelf.estimatedCurPos)
			
			if ( loot.dist <= LOOT_MAX_DIST_NORMAL ) {
				this.lootNormalDistArr.push(loot)
			} else if ( this.moveSelf.isMoving ) {
				if ( loot.dist <= LOOT_MAX_DIST_EXTENDED )
					this.lootExtendedDistArr.push(loot)
			}
		}
			
		this.lootNormalDistArr.sort((l, r) => l.dist - r.dist)
		this.lootExtendedDistArr.sort((l, r) => l.dist - r.dist)
	}
	
	async worker() {
		/// отправляем 20 раз в сек 4-8 команды на лут
		while( this.work ) {
			while( this.lootSelfVeryFirstArr.length ) {
				this.lootSelfVeryFirstArr
					.map( l => this.takeRequest( l ) )
				
				await sleep(20)
			}
			
			const nativeRequest = this.nativeRequestArr.shift()
			if ( nativeRequest  ) {
				this.lootTakeRequestQueue.push({
					loot: this.lootMap.get(nativeRequest.wItemBoxIndex) || this.lootState.getLoot(nativeRequest),
					isNative: true,
					time: Date.now(),
				})
				this.net.senderToServer(nativeRequest.toRawPacket())
			}

			let selectLootArr = this.lootNormalDistArr.slice(0, 4);
			const copy = [...this.lootNormalDistArr];
			
			selectLootArr = []
			for(let i = 0; i < 4 && copy.length; i++) {
				let j = Math.random() * copy.length | 0;
				selectLootArr.push( copy[j] );
				copy.splice(j, 1);
			}
			
			//console.log("selectLootArr.length>", selectLootArr.length)

		//	if ( !selectLootArr.length && this.moveSelf.isMoving )
		//		selectLootArr = [...selectLootArr, ...this.lootExtendedDistArr.slice(0, 4)]
			
			selectLootArr.map(loot => this.takeRequest( loot ) )
			
			if ( !selectLootArr.length ) {
				await sleep(10)
				continue
			}
			
			await sleep(20)
		}
	}
	async workerForLifetime() {
		while( this.work ) {
			const now = Date.now()
			const dels = []
			for(const [k, loot] of this.lootMap) {
				if ( now - loot.time > LOOT_LIFETIME )
					dels.push(k)
			}
			if ( dels.length ) {
				dels.map(k => this.lootMap.delete(k))
				this.sortLoot()
			}
			
			const dels2 = []
			for(const [k, loot] of this.lootCreateAllMap) {
				if ( now - loot.time > LOOT_LIFETIME )
					dels2.push(k)
			}
			if ( dels2.length ) {
				dels2.map(k => this.lootCreateAllMap.delete(k))
				this.sortLoot()
			}

			
			this.lootTakeRequestQueue = this.lootTakeRequestQueue
				.filter(l => now - l.time < 10e3)
			
			this.selfVeryFirst = this.selfVeryFirst
				.filter(l => now - l.time < 20e3)
			
			this.lootSelfVeryFirstArr = this.lootSelfVeryFirstArr
				.filter(l => now - l.time < 2e3)
			
			await sleep(2e3)
		}
	}
	
	async _devWorkerShowState() {
		while( this.work ) {
			console.log({
				selfDwSerial: this.selfDwSerial.dwSerial,
				
				pos: this.moveSelf.estimatedCurPos,
				lootDistStr: [...this.lootMap.values()].map(v => v.dist.toFixed(0)).join(" "), 
				lootMapSize: this.lootMap.size, 
				lootNormalDistArrSize: this.lootNormalDistArr.length,
				lootExtendedDistArrSize: this.lootExtendedDistArr.length,
				lootTakeRequestQueueSize: this.lootTakeRequestQueue.length,
				
				selfVeryFirstSize: this.selfVeryFirst.length,
				lootSelfVeryFirstArrSize: this.lootSelfVeryFirstArr.length,
				
				nativeRequestArrSize: this.nativeRequestArr.length,
				
				lootStateMapSize: this.lootState.lootMap.size,
			})
			await sleep(2000)
		}
	}
	
	_createLoot(loot) {
		this.lootMap.set(loot.wItemBoxIndex, loot)
		this.sortLoot()
		return loot
	}
	createLoot(loot) { 
		if ( loot.dwOwerSerial === 4294967295 ) {
			const obj = this.selfVeryFirst.find(l => l.thingID === loot.thingID)
			if ( obj ) {
				arrayItemDelete(this.selfVeryFirst, obj)
				return this.lootSelfVeryFirstArr.push( this._createLoot(loot) )
			}
		}
		//console.log(loot)
	   
		if ( loot.byItemTableCode === 0x12 ) return
		if ( FilterLootObjSet.has(loot.thingID) && Math.random() < 0.7 ) return
		if ( FilterLootObjSet.has(loot.thingID) && 1 ) return

		/// лут должен быть с моба
		if ( loot.byThrowerRace !== 0xFF )
			return
		/*
		/// если не я владелц лута
		if ( loot.dwOwerSerial !== this.selfDwSerial.dwSerial ) {
			/// если владелец не состоит с нами в группе
			if ( !this.partyMng.has(loot.dwOwerSerial) )
				return
			
			/// если пользователь состоит с нами в группе но режим лутания не общий
			if ( this.partyMng.byLootShareMode !== 0 )
				return
		}
		*/
		
		this._createLoot(loot)
	}
	deleteLoot(msg) {
		if ( !msg )
			return
		
		this.lootCreateAllMap.delete(msg.wItemBoxIndex)
		
		const loot = this.lootMap.get(msg.wItemBoxIndex)
		if ( loot ) {
			this.lootMap.delete(msg.wItemBoxIndex)
			arrayItemDelete(this.lootNormalDistArr, loot)
			arrayItemDelete(this.lootExtendedDistArr, loot)
			arrayItemDelete(this.lootSelfVeryFirstArr, loot)
		}
	}

	takeRequest(loot) {
		this.lootTakeRequestQueue.push({
			loot,
			isNative: false,
			time: Date.now(),
		})
		
		this.net.senderToServer(loot.clItemboxTakeRequest_rawPacket)
	}
	takeResult(msg) {
		const takeInfo = this.lootTakeRequestQueue.shift()
		if ( !takeInfo ) {
			console.log("Error. expected take result!")
			return
		}
		
		this.emit("takeResult", {
			...takeInfo, 
			msg
		})

		if ( typeof this.onTakeResult === "function" ) {
			try {
				this.onTakeResult(takeInfo, msg)
			} catch(e) {
				console.log("AutoLoot.takeResult", e.message, e.stack)
			}
		}
		
		if ( msg.sErrorCode === RFOPackets.SV_ItemboxTakeNewResult.consts.LOOT_NOT_FOUND ||
				msg.sErrorCode === RFOPackets.SV_ItemboxTakeNewResult.consts.LOOT_SUCCESS ) {
			
			if ( takeInfo.loot )
				this.deleteLoot(takeInfo.loot);
		}
		
		/// если это ответ на запрос игры пропустить пакет
		if ( takeInfo.isNative ) {
			return
		}
  
		switch( msg.sErrorCode ) {
			case RFOPackets.SV_ItemboxTakeNewResult.consts.LOOT_NO_PLACE:
				/// пропускаем сообщение о нехватке места не чаще 2х раз в сек
				const now = Date.now()
				if ( now - this.lootNoPlaceLastShowTime >= 500 ) {
					this.lootNoPlaceLastShowTime = now
					return;
				}
				
				/// больше не пытаемся лутать, данную вещь
				this.deleteLoot(takeInfo.loot);
				break;
			
			/// если по какой то причине нет прав на лут, также больше не пробуем лутать
			case RFOPackets.SV_ItemboxTakeNewResult.consts.LOOT_NO_ACCESS:
		//		this.deleteLoot(takeInfo.loot);
				break;
				
			/// пакет с успешным лутанием пропускаем
			case RFOPackets.SV_ItemboxTakeNewResult.consts.LOOT_SUCCESS:
				return;
		}
		
		/// отбрасываем все ошибки
		return FilterMng.DISCARD;
	}

	close() {
		this.lootState.close()
		this.eventNames().map(e => this.removeAllListeners(e))
		this.moveSelf.off("update", this._onMoveSelfUpdate)
		this.netFilterMngGroup.offAll()
		this.work = false
	}
}

module.exports = AutoLoot