const RFOPackets = require("./rfoPackets")
const EventEmitter = require("events")
const { sleep, Vec3 } = require("./lib/helpers")

const CHAR_SPEED_WALK = 30
//const CHAR_SPEED_RUN  = 67.4
const CHAR_SPEED_RUN_UNKADDED = 7.4
const CHAR_SPEED_FLY  = 150
const NADD_SPEED_RATE = 1/6.6

const MOVE_FORWARD = 1 << 0
const MOVE_BACK    = 1 << 1
const MOVE_LEFT    = 1 << 2
const MOVE_RIGHT   = 1 << 3

class MoveSelf extends EventEmitter {
	constructor(options) {
		super()
		
		this.selfDwSerial = options.selfDwSerial
		
		this.playerMoveTime = Date.now()
		this.zCur = null
		this.zTar = null
		this.nAddSpeed = 0
		this.byDirect = 0
		
		this.isMoving = false
		
		this.isMoveTypeRun = true
		this.isFightMode = false
		
		this.estimatedCurPos = null
		this.estimatedSpeed  = CHAR_SPEED_WALK
		
		let startPos = null
		let startTime = 0
		
		this.netFilterMngGroup = options.netFilterMng.group();
		this.netFilterMngGroup.sv.on(RFOPackets.SV_PlayerMove.ID, msg => {
			if ( msg.dwSerial !== this.selfDwSerial.dwSerial ) return
			
			this.playerMoveTime = Date.now()
			this.zCur = msg.zCur
			this.estimatedCurPos = { ...this.zCur }
			this.zTar = msg.zTar
			this.nAddSpeed = msg.nAddSpeed
			this.byDirect = msg.byDirect
			this.emit("move:update")
			this.update()
			
			
			if ( !startPos ) {
				startPos = msg.zCur
				startTime = Date.now()
			}
			const dist = ( (msg.zCur.x - startPos.x)**2 + (msg.zCur.z - startPos.z)**2 ) ** 0.5
			const speed = dist / (Date.now() - startTime) * 1e3
			///console.log({ speed , nAddSpeed: msg.nAddSpeed, byDirect: msg.byDirect })
			
			
			
			if ( this.isMoving )
				return

			this.isMoving = true
			this.emit("move:start")
		})
		this.netFilterMngGroup.sv.on(RFOPackets.SV_PlayerStop.ID, msg => {
			if ( msg.dwSerial !== this.selfDwSerial.dwSerial ) return
			
			this.isMoving = false
			
			this.zTar = this.zCur = msg.zCur
			this.estimatedCurPos = { ...this.zCur }
			this.emit("move:update")
			this.update()
			
			startPos = null
			
			this.emit("move:stop")
		})
		
		this.netFilterMngGroup.sv.on(RFOPackets.SV_PlayerUnkChangeMoveType.ID, msg => {
			if ( msg.dwSerial !== this.selfDwSerial.dwSerial ) return
			
			this.isMoveTypeRun = !!( msg.unkState[0] & ( 1 << 0 ) )
			this.isFightMode   = !!( msg.unkState[0] & ( 1 << 1 ) )
			
			this.update()
		})
		
		/**
		this.on("update", () => {
			const o = {...this}
			delete o.netFilterMngGroup
			delete o.selfDwSerial
			
			
			let s = []
			if ( this.byDirect & MOVE_FORWARD ) s.push("forward")
			if ( this.byDirect & MOVE_BACK ) s.push("back")
			if ( this.byDirect & MOVE_LEFT ) s.push("left")
			if ( this.byDirect & MOVE_RIGHT ) s.push("right")

			console.log( s.join(" "), this.estimatedSpeed, this.zCur, this.estimatedCurPos, this.zTar)
		})
		*/
		
		this.work = true
		this.worker()
	}
	
	async worker() {
		while(this.work) {
			if ( this.isMoving )
				this.update()
			
			await sleep(300)
		}
	}
	
	update() {
		this.calcEstimatedCurPosition()
		this.estimatedSpeed = this.calcEstimatedSpeed()
		
		this.emit("update")
	}

	calcEstimatedCurPosition() {
		if ( !this.zCur || !this.zTar )
			return
		
		const now = Date.now()
		
		const deltaTime = ( ( now - this.playerMoveTime ) / 1e3 )
		const dist = this.estimatedSpeed * deltaTime;
		
		const vecDist = Vec3.sub(this.zTar, this.zCur)
		const vec = Vec3.normalizeXZ(vecDist)
		const vecDistLen = Vec3.lenXZ(vecDist)
		if ( vecDistLen < 0.001 )
			return this.zTar
		
		
		const pos = Vec3.add(
			this.estimatedCurPos,
			Vec3.mulScalar( vec, dist )
		)
		
		pos.y = this.zTar.y
		this.estimatedCurPos = pos
		this.playerMoveTime = now
	}
	calcEstimatedSpeed() {
		/// антиграв
		if ( this.nAddSpeed === 900 )
			return CHAR_SPEED_FLY

		let baseSpeed = CHAR_SPEED_WALK
		if ( this.isMoveTypeRun ) {
			if ( (this.byDirect & MOVE_FORWARD) || 
					!( ( this.byDirect & MOVE_FORWARD ) && ( this.byDirect & MOVE_BACK ) ) )
				baseSpeed *= 2
			
			baseSpeed += CHAR_SPEED_RUN_UNKADDED
		}

		return baseSpeed + this.nAddSpeed * NADD_SPEED_RATE
	}

	close() {
		this.netFilterMngGroup.offAll()
		this.work = false
	}
}

module.exports = MoveSelf