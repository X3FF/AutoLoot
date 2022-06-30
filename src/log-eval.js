const fs = require("fs")
const EventEmitter = require('events').EventEmitter

const BufferReader = require("./app/lib/BufferReader")

const log = (...args) =>
	fs.appendFileSync("auto-log-eval-log.txt", JSON.stringify(args,1,1) + "\n")
	
//log("pack")

const sleep = msec => new Promise(r => setTimeout(r, msec))




const C0 = input.buffer[2]
const C1 = input.buffer[3]
const C2 = input.buffer.slice(4)
const CID = C0 | (C1 << 8)
let R = undefined

function once(id, seq, callback) {
	const obj = (global.onceObj7856 = global.onceObj7856 || {})
	if ( obj[id] !== seq ) {
		obj[id] = seq
		callback()
	}
}
function onceInterval(id, msec, callback) {
	const obj = (globalThis.onceInter7856 = globalThis.onceInter7856 || {})
	const item = ( obj[id] = obj[id] || {} )
	
	item.msec = msec
	item.callback = callback
	item.work = true
	
	if ( !item.worker ) {
		item.worker = async () => {
			while(item.work) {
				
				try {
					item.callback()
				} catch(e) {
					console.log(id, e)
				}
				
				await sleep(item.msec)
			}
		}
		item.worker()
	}
}

function makeRawPacket(p) {
	const b = Buffer.alloc(p.length + 2)
	b.writeUInt16LE(b.length, 0)
	p.copy(b, 2)
	return b
}
function packToServer(data) {
	context.emit("dataToServer", makeRawPacket(data), true)
}
function packToClient(data) {
	context.emit("dataToClient", makeRawPacket(data), true)
}
function dump(b) {
	return b.toString("hex").match(/../g).join(" ")
}

function init(options) {
	const { senderToClient, senderToServer } = options
	
	try {
		
	const gb = ( context.gb = context.gb || {} )
	if ( gb.api && gb.api.net ) {
		
		try {
			const {api} = gb
			console.log("net...")
			api.net.close()
			api.selfDwSerial.close()
			api.partyMng.close()
			api.moveSelf.close()
			api.autoLoot.close()
			api.heroMng.close()
			console.log("Closed...")
		} catch(e) {
			console.log(e.message, e.stack)
		}
	}
	
	for(const key of Object.keys(require.cache))
		delete require.cache[key]

	const NetFilterMng = require("./app/netFilterMng")
	const RFOPackets = require("./app/rfoPackets")	
	const Net = require("./app/net")	
	const PartyMng = require("./app/partyMng")
	const SelfDwSerial = require("./app/selfDwSerial")
	const MoveSelf = require("./app/moveSelf")
	const AutoLoot = require("./app/autoLoot")
	const HeroMng = require("./app/heroMng")
	
	
	const netFilterMng = new NetFilterMng()

	const net = new Net({
		netFilterMng, 
		senderToClient, 
		senderToServer
	})

	const api = {
		net,
		netFilterMng,
	}
	
	const selfDwSerial = new SelfDwSerial(netFilterMng)
	const partyMng = new PartyMng({
		netFilterMng,
		selfDwSerial
	})
	const moveSelf = new MoveSelf({
		netFilterMng,
		selfDwSerial,
	})
	const autoLoot = new AutoLoot({
		net,
		netFilterMng,
		selfDwSerial,
		partyMng,
		moveSelf,
	})
	const heroMng = new HeroMng({
		net,
		netFilterMng,
		autoLoot
	})

	Object.assign(api, {
		net,
		netFilterMng,
		selfDwSerial,
		partyMng,
		moveSelf,
		autoLoot,
		heroMng,
	})
	

	/**
	api.selfDwSerial.close()
	api.partyMng.close()
	api.moveSelf.close()
	api.autoLoot.close()
	api.heroMng.close()
	*/
	
	console.log( { api } )
	
	gb.api = api
	
	} catch(e) {
		console.log(e.message, e.stack)
	}
}

context.seq = context.seq || 0;
context.nextSeq = context.nextSeq || 1;
context.nextSeq = context.nextSeq || 2;

try {
		
	if ( 0 )
	if ( context.watchCtx ) {
		context.watchCtx.close()
		context.watchCtx = null
	}
	context.watchCtx = context.watchCtx || fs.watch("./AutoLoot/src/", { 
		encoding: "utf8",
		recursive: true,
	}, (eventType, filename) => {
		console.log(eventType, filename, context.nextSeq)
		context.nextSeq++
	})

} catch(e) {
	console.log(e)
}


if ( context.seq !== context.nextSeq ) {
	context.seq = context.nextSeq
	init({
		senderToClient: rawPacket => {
			const c0 = rawPacket[2+0]
			const c1 = rawPacket[2+1]
			//if ( c0 === 7 && [3,4].includes(c1) )  {
			if ( 0  )  
			if ( c0 === 7 )  {
				console.log(" sv", c0, c1)
				return; 
			}
  			  
			//return;
			
			context.emit("dataToClient", rawPacket, true)
		},
		senderToServer: rawPacket => context.emit("dataToServer", rawPacket, true),
	})
}

///console.log("=>", input.type, C0, C1, C2)

if( 0 )
once("sdfsdf", 33212, () => {
	//packToServer(Buffer.from([ 13, 22, 1 ]))
	
	if( 1 )
	for(let i = 0; i < 5000; i++)
		//packToServer(Buffer.from([ 13, 22, 0x46 ]))
		packToServer(Buffer.from([ 13, 22, 0x46 ]))
})

if ( 0 ) {
	packToServer(Buffer.from([ 13, 22, 0x46 ]))
	//packToServer(Buffer.from([ 13, 22, 0x46 ]))
}

//if ( input.type === "send" && C0 === 4 )
//	setTimeout(() => packToServer(Buffer.from([ 13, 22, 0x46 ])), 1)

if(0)
if ( C0 === 28 ) {
	setTimeout(() =>
		packToServer(Buffer.from([ 13, 22, 0x46 ])), 1)
}

if(  0 )
if ( C0 ===  13 && C1 === 23 ) {
	next.forward = false
	return false
}

globalThis.dmgArr = globalThis.dmgArr || []
if ( C0 === 5 && C1 === 7 ) {
	//next.forward = false;
	//return false;
	//console.log("=>", input.type, C0, C1, C2)
	const b = new BufferReader(C2)
	const dwSerial = b.u32()
	const unk1 = b.u8()
	const type = b.u8()
	const unk2 = b.u16()
	
	const unk3 = b.u32()
	const dwSerialTarget = b.u32()
	
	const amountDamage = b.u16()
	let typeDamage = "normal"
	if ( amountDamage === 0 )
		typeDamage = "miss"
	if ( amountDamage === 0xFFFE )
		typeDamage = "block"
	
	const obj = {
		dwSerial,
		dwSerialTarget,
		amountDamage,
		type,
		typeDamage
	}
	//console.log(obj)
	
	dmgArr.push(obj)
}
//dmgArr=[]
onceInterval("gerg394gd", 1e3, () => {
	return;
	const obj = {}
	dmgArr.map(v => obj[v.typeDamage] = (obj[v.typeDamage]|0) + 1)
	const obj2 = {}
	Object.keys(obj).map(k => obj2[k] = +(obj[k] / dmgArr.length * 100).toFixed(1))
	console.log(obj, obj2)
})


global.openThing = global.openThing || undefined
global.openThingArr = global.openThingArr || []
//openThingArr=[]

if ( 0 ) {	/// REC
		if ( input.type === "send" && C0 === 7 && C1 === 32 ) {
			console.log(dump(C2))
			next.forward = false

			openThing = { _732: C2.toString("hex"), }
			
			const wItemSerial = C2.slice(6, 8).toString("hex")
			const data = Buffer.from(`00 ${ wItemSerial } 00`.replace(/\s/g, ""), "hex")
			data[3] = 99
			const b = Buffer.concat([
				Buffer.from([7, 5]), 
				data
			])
			packToServer(b)		
			
			return false	
		}		
		if ( input.type === "recv" && C0 === 3 && C1 === 20 ) {
			const thingID = C2.slice(0, 3).toString("hex")
			if ( global.openThing ) {
				openThing.thingID = thingID
				openThingArr.push(openThing)
				console.log(openThingArr)
				openThing = null
			}
		}
}



globalThis.rfoTarget = globalThis.rfoTarget || null



if (   /***/  1    /***/  ) {
//if (input.type == "send")
//if(C0 === 4 && ![10].includes(C1) ) console.log(input.type, input.buffer[2], input.buffer[3], `[ ${ dump( input.buffer.slice(4) ) } ]` )
//if(C0 === 3 && ![].includes(C1) ) console.log(input.type, input.buffer[2], input.buffer[3], `[ ${ dump( input.buffer.slice(4) ) } ]` )

if(  0  )
	if ( rfoTarget && C2.toString("hex").includes("016b0f") )
		console.log("Find", input.type, input.buffer[2], input.buffer[3], `[ ${ dump( input.buffer.slice(4) ) } ]` )
 

if(  0  )
	if ( rfoTarget && C2.toString("hex").includes(rfoTarget.dwSerialHex) )
		console.log(input.type, input.buffer[2], input.buffer[3], `[ ${ dump( input.buffer.slice(4) ) } ]` )
	

if(  0  )
	if ( input.type === "send" && rfoTarget && C2.toString("hex").includes(rfoTarget.idHex) ) {
		console.log(input.type, input.buffer[2], input.buffer[3], `[ ${ dump( input.buffer.slice(4) ) } ]` )	
		forward.next = false
		return false
	}
	

if(  1  )
	if ( input.type === "send" && C0 === 5 && C2.toString("hex").includes("011121") ) {
		console.log("Find!!!")
		const data = Buffer.from( C2.toString("hex").replace("011121", currMob.idHex) , "hex" )
		const b = Buffer.concat([
			Buffer.from([C0, C1]),
			data
		])
		
		packToServer(b)
		//console.log(input.type, input.buffer[2], input.buffer[3], `[ ${ dump( input.buffer.slice(4) ) } ]` )	
		next.forward = false
		return false
		
	}
	
	
//if ( C0 === 3 && C1 === 16)	
//	console.log(input.type, input.buffer[2], input.buffer[3], `[ ${ dump( input.buffer.slice(4) ) } ]` )
	
	
//if ( C0 === 5 )	
//	console.log(input.type, input.buffer[2], input.buffer[3], `[ ${ dump( input.buffer.slice(4) ) } ]` )

//if ( C0 === 3 && C1 === 16 ) console.log(input.type, input.buffer[2], input.buffer[3], `[ ${ dump( input.buffer.slice(4) ) } ]` )
//if ( C0 === 4 && C1 === 5 ) console.log(input.type, input.buffer[2], input.buffer[3], `[ ${ dump( input.buffer.slice(4) ) } ]` )
//if ( C0 === 4 && C1 === 10 ) console.log(input.type, input.buffer[2], input.buffer[3], `[ ${ dump( input.buffer.slice(4) ) } ]` )

globalThis.fakeMob = globalThis.fakeMob || null


globalThis.rfoFakeTargetUserBind = globalThis.rfoFakeTargetUserBind || false
once("qw", 3434404, () => {
	fakeMob = null
})
onceInterval("initmob", 1e3, () => {
	if ( fakeMob )
		return
	

	if ( !context.gb.api.moveSelf.estimatedCurPos ||
			!context.gb.api.moveSelf.estimatedCurPos.y )
		return
	
	console.log(context.gb.api.moveSelf.estimatedCurPos)
	
	fakeMob = {
	}
	fakeMob.dwSerialHex = (Math.random()*0xFFFFFFFFFFFFFF).toString(16).slice(0, 8)
	
	rfoFakeTargetUserBind = false
	//const data = Buffer.from("  01 00 80 12  FE FE FE FE   3b ef 8e 03 5f ea   32  00 00 ".replace(/\s/g, ""), "hex")
	const data = Buffer.from(`   00 00 11 21   ${ fakeMob.dwSerialHex } ec ee 9f 03 61 ea  60  40 00`.replace(/\s/g, ""), "hex")
	//data[2] = Math.random() * 255 | 0
	
	//data[4] = Math.random() * 255 | 0
	//data[5] = Math.random() * 255 | 0
	
	/*
	data[8] = Math.random() * 255 | 0
	data[10] = Math.random() * 255 | 0
	data[12] = Math.random() * 255 | 0
	*/
	
	data.writeInt16LE(context.gb.api.moveSelf.estimatedCurPos.x | 0, 8)
	data.writeInt16LE((context.gb.api.moveSelf.estimatedCurPos.y | 0) + 30, 10)
	data.writeInt16LE(context.gb.api.moveSelf.estimatedCurPos.z | 0, 12)
	
	const p = Buffer.concat([
		Buffer.from([3, 16]),
		data 
	])
	//context.gb.api.moveSelf.estimatedCurPos
	packToClient(p)
	//console.log(p)
})
onceInterval("qw44", 1e3, () => {
	if ( !fakeMob )
		return
	
	const data = Buffer.from(`  00 010513 ${ fakeMob.dwSerialHex }`.replace(/\s/g, ""), "hex")
	const p = Buffer.concat([
		Buffer.from([4, 10]),
		data
	])
	packToClient(p)
	//console.log(p, fakeMob)
})


onceInterval("forSelect", 100, () => {
	return
	if ( !context.gb.api.moveSelf.estimatedCurPos ||
			!context.gb.api.moveSelf.estimatedCurPos.y )
		return
	
	if ( fakeMob ) {
		const data = Buffer.from(fakeMob.dwSerialHex + "00000000000000000000", "hex")
		data.writeInt16LE(context.gb.api.moveSelf.estimatedCurPos.x, 4)
		data.writeInt16LE(context.gb.api.moveSelf.estimatedCurPos.y, 6)
		data.writeInt16LE(context.gb.api.moveSelf.estimatedCurPos.z, 8)
			
		data.writeInt16LE(context.gb.api.moveSelf.estimatedCurPos.x+10, 10)
		data.writeInt16LE(context.gb.api.moveSelf.estimatedCurPos.z, 12)
			
		//const s = fakeMob.dwSerialHex + C2.toString("hex").slice(8)
		const b = Buffer.concat([
			Buffer.from([4, 5]),
			data
		])
		//
		packToClient(b)				
	}
})

onceInterval("qw", 200, () => {
	if ( !rfoTarget )
		return
	
	const data = Buffer.alloc(8)
	data.writeUInt32LE( 208404736, 0)
	data.writeUInt32LE(rfoTarget.dwSerial, 4)
	const b = Buffer.concat([
		Buffer.from([13, 26]),
		data
	])
	
	//packToServer(b)
	
	//console.log(b)
})


function SV_MonsterCreate(buf) {
	const br = new BufferReader(buf)
	return {
		wRecIndex: br.u16(),
		wIndex: br.u16(),
		dwSerial: br.u32(),
		
		zCur: { x: br.i16(), y: br.i16(), z: br.i16() },
		bYAngle: br.u8(),
		wStateInfo: br.u16()
	}
}
SV_MonsterCreate.ID = 3 | (16 << 8)

function SV_MonsterFixposition(buf) {
	const br = new BufferReader(buf)
	return {
		wRecIndex: br.u16(),
		wIndex: br.u16(),
		dwSerial: br.u32(),
		
		wLastEffectCode: br.u16(),
		zCur: { x: br.i16(), y: br.i16(), z: br.i16() },
		
		bYAngle: br.u8(),
		wStateInfo: br.u16()
	}
}
SV_MonsterFixposition.ID = 4 | (11 << 8)

function SV_MonsterMove(buf) {
	const br = new BufferReader(buf)
	return {
		dwSerial: br.u32(),
		zCur: { x: br.i16(), y: br.i16(), z: br.i16() },
		zTar: { x: br.i16(), z: br.i16() },
	}
}
SV_MonsterMove.ID = 4 | (5 << 8)

function SV_MonsterDeath(buf) {
	const br = new BufferReader(buf)
	return {
		unk1: br.u16(),
		dwSerial: br.u32(),
		unk2: br.u8(),
	}
}
SV_MonsterDeath.ID = 3 | (24 << 8)

function SV_UnitUpdateState(buf) {
	const br = new BufferReader(buf)
	return {
		unk1: br.u8(),
		id: br.buf(3),
		
		dwSerial: br.u32(),

		idHex: buf.slice(1, 1 + 3).toString("hex"),
	}
}
SV_UnitUpdateState.ID = 4 | (10 << 8)


function CL_SelectTarget(buf) {
	const br = new BufferReader(buf)
	return {
		unk1: br.u8(),
		id: br.buf(3),
		
		dwSerial: br.u32(),
		
		idHex: buf.slice(1, 1 + 3).toString("hex"),
		dwSerialHex: buf.slice(4).toString("hex"),
	}
}
CL_SelectTarget.ID = 13 | (26 << 8)


globalThis.monsters = globalThis.monsters || []

onceInterval("monstersdel", 1e3, () => {
	const now = Date.now();
	monsters = monsters
		.filter(m => now - m.timeUpdate < 10e3)
})
onceInterval("monstersree", 2e3, () => {
	console.log(monsters.length)
})

globalThis.currMob = globalThis.currMob || null
//currMob = null
onceInterval("h543h35444fdf03", 100, () => {
	if ( !currMob || ( Date.now() - currMob.timeCurrMob > 20e3 ) ) {
		const currMobArr = monsters.filter(m => m.idHex && m.wRecIndex === 0 && !m.isMoving)
		if ( !currMobArr.length )
			return
		
		if ( context.gb.api.moveSelf.estimatedCurPos ) {
			currMobArr.map(m => 
				m.distToSelf = 
					(
						(m.zCur.x - context.gb.api.moveSelf.estimatedCurPos.x)**2 + 
						(m.zCur.z - context.gb.api.moveSelf.estimatedCurPos.z)**2
					) ** 0.5
			)
			currMobArr.sort((l, r) => l.distToSelf - r.distToSelf)
		}
		
		currMob = currMobArr[0]
		
		//console.log({ currMob })
		console.log("New currMob...")
		currMob.timeCurrMob = Date.now();
		
		try {

		if ( fakeMob ) {
			const data = Buffer.from(fakeMob.dwSerialHex + "00000000000000000000", "hex")
			data.writeInt16LE(currMob.zCur.x, 4)
			data.writeInt16LE(currMob.zCur.y, 6)
			data.writeInt16LE(currMob.zCur.z, 8)
			
			data.writeInt16LE(currMob.zCur.x+10, 10)
			data.writeInt16LE(currMob.zCur.z, 12)
			
			//const s = fakeMob.dwSerialHex + C2.toString("hex").slice(8)
			const b = Buffer.concat([
				Buffer.from([4, 5]),
				data
			])
			//
			packToClient(b)		
			
		}
		
		} catch(e) {
			console.log(e)
		}
	}
	
})

onceInterval("dfgdfg", 100, () => {
	return
	const data2 = Buffer.from("  00 01 fe 0d 26 ba 05 00  ".replace(/\s/g, ""), "hex")
	data2.writeUInt32LE(117899520, 0)
	data2.writeUInt32LE(281473, 4)
	
	data2.writeUInt32LE(405405952, 0)
	data2.writeUInt32LE(280443, 4)

	const p2 = Buffer.concat([
		Buffer.from([13, 26]),
		data2
	])

	packToServer(p2)

})


if ( CID === CL_SelectTarget.ID ) {
	const pack = CL_SelectTarget(C2)
	console.log("CL_SelectTarget", pack)
	rfoTarget = pack
	if ( pack.dwSerial === 0xFEFEFEFE )
		rfoFakeTargetUserBind = true
	
}
 
if ( CID === SV_MonsterDeath.ID ) {
	const pack = SV_MonsterDeath(C2)
	
	const i = monsters.findIndex(m => m.dwSerial === pack.dwSerial)
	if ( i >= 0 ) {
		if ( currMob && currMob.dwSerial === pack.dwSerial )
			currMob = null;
		
		monsters.splice(i, 1)
		//console.log("SV_MonsterDeath", pack)		
	}
}
if ( CID === SV_MonsterMove.ID ) {
	const pack = SV_MonsterMove(C2)
	
	let mob = monsters.find(m => m.dwSerial === pack.dwSerial)
	if ( mob ) {
		mob.isMoving = true
		mob.startMoveTime = Date.now()
		mob.zCur = {...pack.zCur}
		setTimeout(() => {
			Object.assign(mob.zCur, pack.zTar)
		}, 5e3)
	}
	if ( fakeMob && pack.dwSerial === currMob.dwSerial ) {
		console.log("Mobe move...")
		const s = fakeMob.dwSerialHex + C2.toString("hex").slice(8)
		const b = Buffer.concat([
			Buffer.from([4, 5]),
			Buffer.from(s, "hex")
		])
		//
		packToClient(b)
	}
	//console.log(pack)

	
	//next.forward = false
	//return
}
onceInterval("movmobedc", 300, () => {
	monsters.map(mob => {
		mob.isMoving = Date.now() - mob.startMoveTime < 5e3
	})
	
	//console.log(monsters.filter(m => m.isMoving).length)
})


function createOrUpdateMonster(pack, isMoving = true) {
	let mob = monsters.find(m => 
		m.dwSerial === pack.dwSerial &&
			m.wRecIndex === pack.wRecIndex &&
				m.wIndex === pack.wIndex )
	
	if ( !mob ) {
		mob = {...pack}
		monsters.push(mob)
	}
	
	mob.isMoving = isMoving
	mob.startMoveTime = isMoving ? Date.now() : 0
	Object.assign(mob, pack)
	
	mob.timeUpdate = Date.now()
}



if ( CID === SV_MonsterCreate.ID ) {
	const pack = SV_MonsterCreate(C2)
	createOrUpdateMonster(pack, false)
	
	//if ( !currMob && rfoFakeTargetUserBind )
	//	currMob = pack
}
if ( CID === SV_MonsterFixposition.ID ) {
	const pack = SV_MonsterFixposition(C2)
	createOrUpdateMonster(pack)
}
if ( CID === SV_UnitUpdateState.ID ) {
	const pack = SV_UnitUpdateState(C2)
	let mob = monsters.find(m => m.dwSerial === pack.dwSerial)
	if ( mob ) {
		Object.assign(mob, pack)
		mob.timeUpdate = Date.now()
	}
}




}





if(0)
onceInterval("qw22", 1e3, () => {
	/*
	const data2 = Buffer.from(" 00 00 01 af c3 05 00 10 27 cc 00  ".replace(/\s/g, ""), "hex")
	const p2 = Buffer.concat([
		Buffer.from([13, 27]),
		data2
	])
	//console.log(p2)
	packToClient(p2)
	*/
	/*
	if(0) {
		
	const data2 = Buffer.from("  00 01 fe 0d 26 ba 05 00  ".replace(/\s/g, ""), "hex")
	const p2 = Buffer.concat([
		Buffer.from([13, 26]),
		data2
	])
	packToServer(p2)
	}
	
	{
	const data2 = Buffer.from("  0b  ".replace(/\s/g, ""), "hex")
	const p2 = Buffer.concat([
		Buffer.from([13, 28]),
		data2
	])
	packToServer(p2)
	}
	const data2 = Buffer.from("  00 00 02 00 77 00 00 00  ".replace(/\s/g, ""), "hex")
	const p2 = Buffer.concat([
		Buffer.from([13, 26]),
		data2
	])
	packToServer(p2)
	
	
	const data = Buffer.from("  00 02 00 01 ff ff ff ff  ".replace(/\s/g, ""), "hex")
	const p = Buffer.concat([
		Buffer.from([5, 1]),
		data
	])
	packToServer(p)
	*/
	/*
	const data = Buffer.from("   00 06 00 03 05 00 08 00 e8 f3 8c eb aa aa aa aa 24 21 ff ff ".replace(/\s/g, ""), "hex")
	const p = Buffer.concat([
		Buffer.from([5, 2]),
		data
	])
	packToServer(p) 
	*/
})

if ( 0 ) {
/*
struct _monster_create_zocl
{
  unsigned __int16 wRecIndex;
  unsigned __int16 wIndex;
  unsigned int dwSerial;
  __int16 zPos[3];
  char bYAngle;
  unsigned __int16 wStateInfo;
};
*/ 
	//const data = Buffer.from("  00 00 57 07  cf 2d 05 00  47 ee c6 03 2f ea  cc  00 00 ".replace(/\s/g, ""), "hex")
	const data = Buffer.from("  00 04 80 12  59 54 05 00  d9 f3 32 02 9f eb  32  00 00 ".replace(/\s/g, ""), "hex")
	data[2] = Math.random() * 255 | 0
	
	data[4] = Math.random() * 255 | 0
	data[5] = Math.random() * 255 | 0
	
	data[8] = Math.random() * 255 | 0
	data[10] = Math.random() * 255 | 0
	data[12] = Math.random() * 255 | 0
	const p = Buffer.concat([
		Buffer.from([3, 16]),
		data
	])
	//console.log(p)
	//packToClient(p)
}
/*
if ( C0 === 3 && C1 === 16  ) {
	next.forward = false
	return
}

if ( C0 === 4 && C1 === 5  ) {
	next.forward = false
	return
}
if ( C0 === 4 && C1 === 10  ) {
	next.forward = false
	return
}
*/



try {
	const gb = context.gb
	if ( gb && gb.api ) {
		if ( input.type === "send" ) {
			next.forward = false
			gb.api.net.clPacket(input.buffer)
		}
		
		if ( input.type === "recv" ) {
			next.forward = false
			gb.api.net.svPacket(input.buffer)
		}	
	}
} catch(e) {
	console.log(e.message, e.stack)
}


//next.forward = false
//return false

const blocks = [
	[102],
	//[4],
	[2],
	[7],
];
if ( blocks.some(v => v[0] === C0 && (v.length === 1 || v[1] === C1) ) ) return
if(0)
if (  input.buffer[2] === 4 ) {
	if ( input.buffer[3] === 10 ) {
		//next.forward = false
		return
	}
}

if ( C0 === 3 && C1 === 16 ) {
	next.forward = false
	return
}
if ( C0 === 3 && C1 === 20 ) {
	next.forward = false
	return
}
if ( C0 === 4 && C1 === 5 ) {
	next.forward = false
	return
}
if ( C0 === 3 ) {
	next.forward = false
	return
}
if ( C0 === 4 ) {
	next.forward = false
	return true
}


if ( input.buffer[2] === 12 )
console.log(input.type, input.buffer[2], input.buffer[3], `[ ${ dump( input.buffer.slice(4) ) } ]` )

once("sdfsdf", 32422223232, () => {
	const b = Buffer.concat([
		Buffer.from([12, 4]),
		Buffer.from("31 00 00 00 01 00 00 00 00 00 c9 00 03".replace(/\s+/g, ""), "hex")
	])
	//packToServer(b)
	console.log(b)
})

//if ( C0 === 28 )
//console.log(input.type, input.buffer[2], input.buffer[3], `[ ${ dump( input.buffer.slice(4) ) } ]` )

if(0)
if ( C0 === 28 && C1 === 4 ) {
	packToClient(Buffer.from([
		28, 5,  0
	]))
	
}

return R