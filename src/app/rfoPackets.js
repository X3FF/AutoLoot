const assert = require("assert")
///const windows1251 = require('windows-1251')

delete require.cache[ require.resolve("./lib/BufferReader") ];
const BufferReader = require("./lib/BufferReader")


const readVec3i16 = b => ( { x: b.i16(), y: b.i16(), z: b.i16() } )
const readVec2i16 = b => ( { x: b.i16(), z: b.i16() } )


class RFOPacket {
	constructor() {
		this.ID = this.constructor.ID
		this.consts = this.constructor.consts
		//this.timeCreate = Date.now()
	}
	

	toPacket() {
		const p = this.toBuffer()
		const b = Buffer.alloc(p.length + 2)
		b.writeUInt16LE(this.ID, 0)
		p.copy(b, 2)
		return b
	}
	toRawPacket() {
		const p = this.toPacket()
		const b = Buffer.alloc(p.length + 2)
		b.writeUInt16LE(b.length, 0)
		p.copy(b, 2)
		return b
	}
	
	static _makePacket(dataLength) {
		const b = Buffer.alloc(2 + dataLength)
		b.writeUInt16LE(this.ID, 0)
		return b
	}
	static _tryPacket(b) {
		const id = b.readUInt16LE(0)
		assert(id === this.ID)
	}

	_makePacket(...args) {
		return this.constructor._makePacket(...args)
	}
}



///
class CL_ItemboxTakeRequest extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, {
			wItemBoxIndex: 0,
			wAddSerial: 0xFFFF,
			...obj
		})
	}

	toBuffer() {
		let buf = Buffer.alloc(4);
		buf.writeUInt16LE(this.wItemBoxIndex, 0)
		buf.writeUInt16LE(this.wAddSerial, 2)
		return buf
	}
	
	static fromBuffer(pack) {
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()
		
		/**
		#define itembox_take_request_clzo 2	
		struct _itembox_take_request_clzo{
			WORD wItemBoxIndex;
			WORD wAddSerial;	//포개지는 아이템일경우 포갤 시리얼.. 포갤곳이 없으면 0xFFFF
		};
		*/
		
		return new this({	
			wItemBoxIndex: b.u16(),
			wAddSerial: b.u16(),
		})
	}
}	
CL_ItemboxTakeRequest.ID = 7 | (2 << 8);

class SV_ItemboxCreate extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()
		
		/**
		struct _CHRID
		{
		  char byID;
		  unsigned __int16 wIndex;
		  unsigned int dwSerial;
		};
		struct _itembox_create_zocl
		{
		  char byItemTableCode;
		  unsigned __int16 wItemRecIndex;
		  char byAmount;				//중첩아이템일경우 갯수..
		  unsigned __int16 wBoxIndex;
		  unsigned int dwOwerSerial;	//1차로 줏을수잇는 권리자..
		  _CHRID idDumber;	//버린사람.. 버린사람정보없으면 0xFF..
		  char byState;
		  __int16 zPos[3];
		  char byThrowerRace;
		};
		*/
		
		const thingID = b.buf(3).toString("hex")
		b.offset -= 3
		
		return new this({
			byItemTableCode: b.u8(),
			wItemRecIndex: b.u16(),
			thingID,
			
			byAmount: b.u8(),	
			wItemBoxIndex: b.u16(),
			dwOwerSerial: b.u32(),
			idDumber: {
				byID: b.u8(),
				wIndex: b.u16(),
				dwSerial: b.u32(),
			},
			byState: b.u8(),
			zPos: readVec3i16(b),
			byThrowerRace: b.u8()
		})
	}
}	
SV_ItemboxCreate.ID = 3 | (20 << 8);

class SV_ItemboxFixposition extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()
		
		/**
		struct _itembox_fixpositon_zocl
		{
		  char byItemTableCode;
		  unsigned __int16 wItemRecIndex;
		  char byAmount;
		  unsigned __int16 wItemBoxIndex;
		  unsigned int dwOwerSerial;
		  __int16 zPos[3];
		  char byState;
		  char byThrowerRace;
		};
		*/
		
		const thingID = b.buf(3).toString("hex")
		b.offset -= 3
		
		return new this({
			byItemTableCode: b.u8(),
			wItemRecIndex: b.u16(),
			thingID,
			
			byAmount: b.u8(),	
			wItemBoxIndex: b.u16(),
			dwOwerSerial: b.u32(),
			zPos: readVec3i16(b),
			byState: b.u8(),
			byThrowerRace: b.u8()
		})
	}
}	
SV_ItemboxFixposition.ID = 4 | (15 << 8);

const SV_ItemboxTakeErrorCodes = {
	LOOT_SUCCESS: 0,
	LOOT_NO_PLACE: 1,
	
	LOOT_NOT_FOUND: 4,
	LOOT_NO_ACCESS: 5,
	
	LOOT_BAD_RADIUS: 0x06,
	_LOOT_NO_PLACE: 7,
	
	LOOT_BAD_TIMEOUT_COOLDOWN: 0x09,
}
class SV_ItemboxTakeNewResult extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
	}

	static fromBuffer(b) {
		this._tryPacket(b)
		
		const msgData = b.subarray(2);

		/**
		struct _itembox_take_new_result_zocl
		{
		  char sErrorCode;
		  char byItemTableCode;
		  unsigned __int16 wItemIndex;
		  unsigned __int64 dwCurDurPoint;
		  unsigned int dwUptInfo;
		  unsigned __int16 wItemSerial;
		  char byCsMethod;
		  unsigned int dwT;
		};
		*/
		
		const sErrorCode = msgData.readUInt8(0);
		if ( sErrorCode )
			return new this({ sErrorCode })

		const byItemTableCode = msgData.readUInt8(1);
		const wItemIndex = msgData.readUInt16LE(2);
		const thingID = msgData.subarray(1, 1 + 3).toString("hex")
		
		const byAmount = msgData.readUInt8(4)
		const dwCurDurPoint = msgData.readBigUInt64LE(4)
		const dwUptInfo = msgData.readUInt32LE(10)
		const wItemSerial = msgData.readUInt16LE(16);
		
		const byCsMethod = msgData.readUInt8(16);
		const dwT = msgData.readUInt32LE(17)	
	
		return new this({
			sErrorCode,
			
			byItemTableCode,
			wItemIndex,
			thingID,
			entityID: thingID,
			byAmount,
			
			dwCurDurPoint,
			dwUptInfo,
			wItemSerial,
			
			byCsMethod,
			dwT
		})
	}
};
SV_ItemboxTakeNewResult.ID = 7 | (3 << 8);
SV_ItemboxTakeNewResult.consts = SV_ItemboxTakeErrorCodes

class SV_ItemboxTakeAddResult extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
	}

	static fromBuffer(b) {
		this._tryPacket(b)
		const msgData = b.subarray(2)
		
		/**
		struct _itembox_take_add_result_zocl
		{
		  char sErrorCode;
		  unsigned __int16 wItemSerial;
		  char byAmount;
		};
		*/
		const sErrorCode = msgData.readUInt8(0);
		if ( sErrorCode )
			return new this({ sErrorCode })
		
		const wItemSerial = msgData.readUInt16LE(1);
		const byAmount = msgData.readUInt8(3);
		
		return new this({
			sErrorCode,
			
			wItemSerial,
			byAmount,
		})
		
	}
}	
SV_ItemboxTakeAddResult.ID = 7 | (4 << 8);
SV_ItemboxTakeAddResult.consts = SV_ItemboxTakeErrorCodes

class SV_ItemboxStateChange extends RFOPacket {
	constructor(obj) {
		super();
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()
		
		/**
		#define itembox_state_change_zocl 1
		struct _itembox_state_change_zocl{

			WORD wItemBoxIndex;
			DWORD dwOwerSerial;	//누가 버린건 oxffff 
			BYTE byState;	//0: normal(지정자만이 먹을수잇는상태) 
							//1: open(누구든지 먹을수 있는 상태) 
							//2: hurry(소멸임박,깜빡임)
		};
		*/
		return new this({
			wItemBoxIndex: b.u16(),
			dwOwerSerial: b.u32(),
			byState: b.u8(),
		})
	}

}
SV_ItemboxStateChange.ID = 7 | (1 << 8);

class SV_ItemboxDestroy extends RFOPacket {
	constructor(obj) {
		super();
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()

		/**
		#define itembox_destroy_zocl 18
		struct _itembox_destroy_zocl{
			WORD wIndex;
		};
		*/
		return new this({
			wItemBoxIndex: b.u16()
		})
	}

}
SV_ItemboxDestroy.ID = 3 | (28 << 8);

class CL_ItemboxDrop extends RFOPacket {
	constructor(obj) {
		super();
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()

		return new this({
			unkU8: b.u8(),
			wItemSerial: b.u16(),
			amount: b.u8()
		})
	}
	toBuffer() {
		const b = Buffer.alloc(4)
		b[0] = this.unkU8 | 0
		b.writeUInt16LE(this.wItemSerial, 1)
		b[3] = this.amount | 0
		return b
	}

}
CL_ItemboxDrop.ID = 7 | (5 << 8);

class SV_ItemboxDropResult extends RFOPacket {
	constructor(obj) {
		super();
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()

		return new this({
			sErrorCode: b.u8(),
		})
	}
	toBuffer() {
		const b = Buffer.alloc(1)
		b[0] = this.sErrorCode | 0
		return b
	}
	
}
SV_ItemboxDropResult.ID = 7 | (6 << 8);


class SV_ItemboxDelete extends RFOPacket {
	constructor(obj) {
		super();
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()

		return new this({
			sErrorCode: b.u8(),
			wItemSerial: b.u16(),
		})
	}
	toBuffer() {
		const b = Buffer.alloc(3)
		b[0] = this.sErrorCode | 0
		b.writeUInt16LE(this.wItemSerial, 1)
		return b
	}

}
SV_ItemboxDelete.ID = 7 | (23 << 8);




///
class SV_PartyJoinJoinerResult extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()
		
		/**
		struct _party_join_joiner_result_zocl::_list
		{
		  unsigned __int16 wIndex;
		  unsigned int dwSerial;
		  char wszAvatorName[17];
		};
		#pragma pack(pop)

		struct _party_join_joiner_result_zocl
		{
		  char byLootShareMode;
		  char byListNum;
		  _party_join_joiner_result_zocl::_list List[8];
		};
		*/
		
		const byLootShareMode = b.u8();
		const byListNum = b.u8();
		const list = Array(byListNum).fill(0).map(v => {
			const obj = {
				wIndex: b.u16(),
				dwSerial: b.u32(),
				wszAvatorName: b.buf(17),
			}
			obj.avatorName = ""//windows1251.decode(obj.wszAvatorName.toString("binary").replace(/\x00.*/, ""))
			return obj
		})
		
		
		return new this({
			byLootShareMode,
			byListNum,
			list
		})
	}
}	
SV_PartyJoinJoinerResult.ID = 16 | (7 << 8);

class SV_PartyJoinMemberResult extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()
		
		/**
		struct _party_join_member_result_zocl
		{
		  unsigned int dwJoinerSerial;
		  char wszJoinerName[17];
		  char byLootShareMode;
		  unsigned __int16 wIndex;
		};
		*/
		
		const obj = {
			dwSerial: b.u32(),
			wszAvatorName: b.buf(17),
			byLootShareMode: b.u8(),
			wIndex: b.u16(),
		}
		obj.avatorName = ""//windows1251.decode(obj.wszAvatorName.toString("binary").replace(/\x00.*/, ""))
		return obj
	}
}
SV_PartyJoinMemberResult.ID = 16 | (8 << 8);


class SV_PartyLeaveSelfResult extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()
		
		/**
		//스스로 조직에서 탈퇴함을 자신포함조직원에게 알림..
		//보스의 탈퇴의경우 다음끗발자가 보스로 승계
		#define party_leave_self_result_zocl 10
		struct _party_leave_self_result_zocl {
			DWORD dwExiterSerial;		//0xFF이면 실패메시지..자신에게만
			bool bWorldExit;
		};
		*/
		
		return {
			dwExiterSerial: b.u32(),
			bWorldExit: b.u8(),
		}
	}
}
SV_PartyLeaveSelfResult.ID = 16 | (10 << 8);

class SV_PartyLeaveCompulsionResult extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()
		
		/**
		//조직에서 강퇴됨을 다른조직원에게 알림..
		#define party_leave_compulsion_result_zocl 12
		struct _party_leave_compulsion_result_zocl {

			DWORD dwExiterSerial; //0xFF이면  실패메시지..자신에게만
		};
		*/
		return {
			dwExiterSerial: b.u32(),
		}
	}
}
SV_PartyLeaveCompulsionResult.ID = 16 | (12 << 8);

class SV_AlterPartyLootShareMode extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()
		
		/**
		struct _alter_party_loot_share_result_zocl
		{
		  char byLootShareMode;
		};
		*/
		return {
			byLootShareMode: b.u8(),
		}
	}
}
SV_AlterPartyLootShareMode.ID = 16 | (29 << 8);



///
class SV_ThrowStorageResult extends RFOPacket {
	constructor(obj) {
		super();
		
		this.byErrCode = obj.byErrCode
	}

	static fromBuffer(b) {
		this._tryPacket(b)

		const byErrCode = b.readUInt8LE(2)
		return new this({ byErrCode })
	}

}
SV_ThrowStorageResult.ID = 7 | (6 << 8);
SV_ThrowStorageResult.consts = {
	SUCCESS: 0,
	INVALID_STORAGE: 1,
	NO_ELEMENT: 2,
	NUMBER_EXCEEDED: 3,
}



///
class SV_FirstSimpliePacket extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()
		
		b.u16();
		return { dwSerial: b.u32() }
	}
}
SV_FirstSimpliePacket.ID = 1 | (15 << 8);



///
class SV_PlayerMove extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		/**
		struct _player_move_zocl
		{
		  unsigned int dwSerial;
		  __int16 zCur[3];
		  __int16 zTar[2];
		  __int16 nAddSpeed;
		  char byDirect;
		};		
		*/
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()
		
		return { 
			dwSerial: b.u32(),
			zCur: readVec3i16(b),
			zTar: readVec2i16(b),
			nAddSpeed: b.i16(),
			byDirect: b.u8(),
		}
	}
}
SV_PlayerMove.ID = 4 | (4 << 8);

class SV_PlayerStop extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		/**
		struct _player_stop_zocl
		{
		  unsigned int dwSerial;
		  __int16 zCur[3];
		};	
		*/
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()
		
		return { 
			dwSerial: b.u32(),
			zCur: readVec3i16(b),
		}
	}
}
SV_PlayerStop.ID = 4 | (20 << 8);

class SV_PlayerUnkChangeMoveType extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()
		
		return { 
			dwSerial: b.u32(),
			unkState: b.buf(8),
		}
	}
}
SV_PlayerUnkChangeMoveType.ID = 4 | (25 << 8);



///
class SV_MovePotalResult extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		const b = new BufferReader(pack)
		b.u16()
			
		/**
		struct _move_potal_result_zocl
		{
		  char byRet;
		  char byMapIndex;
		  float fStartPos[3];
		  char byZoneCode;
		};
		*/		
		return { 
			byRet: b.u8(),
			byMapIndex: b.u8(),
			fStartPos: { x: b.f32(), y: b.f32(), z: b.f32(), },
			byZoneCode: b.u8(),
		}
	}
}
SV_MovePotalResult.ID = 8 | (2 << 8);

class SV_UnkEventNewMap extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		return {}
	}
}
SV_UnkEventNewMap.ID = 12 | (9 << 8);



///
class CL_HeroRequest extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
		this.data = this.data.slice()
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		
		const b = new BufferReader(pack)
		b.u16()
		
		const data = b.buf(29)
		const wItemSerial = data.readUInt16LE(6)

		return {
			wItemSerial,
			data
		}
	}
	
	toBuffer() {
		const data = this.data.slice()
		data.writeUInt16LE(this.wItemSerial, 6)
		return data
	}
}
CL_HeroRequest.ID = 7 | (32 << 8);

class SV_HeroPreResultItembox extends RFOPacket {
	constructor(obj) {
		super()
		
		this.data = Buffer.from("04ffcccccccccccccccccc00ffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fffffffff00000000ffffff0fcccccccccccccccc", "hex")
		
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		
		const b = new BufferReader(pack)
		b.u16()

		const sErrorCode = b.u8()
		const unkBuf1 = b.buf(5)
		const heroID = b.buf(3).toString("hex")
		
		const unkBuf2 = b.buf(2)
		const count = b.u8()
		const list = []
		for(let i = 0; i < count; i++) {
			const unkU8 = b.u8()
			

			const thingID = b.buf(3).toString("hex")
			b.offset -= 3
		
			const byItemTableCode = b.u8()
			const wItemRecIndex = b.u16()
			const amount = b.u8()
			
			const unkBuf = b.buf(7)
			list.push({
				thingID,
				byItemTableCode,
				wItemRecIndex,
				amount,
				
				unkU8, unkBuf
			})
		}
		
		return {
			sErrorCode,
			unkBuf1,
			heroID,
			unkBuf2,
			list
		}
	}
	toBuffer() {
		this.data[0] = this.sErrorCode
		return this.data.slice()
	}

}
SV_HeroPreResultItembox.ID = 7 | (33 << 8);

class CL_HeroRequestPreResultItembox extends RFOPacket {
	constructor(obj) {
		super()
		
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		return {}
	}
	toBuffer() {
		return Buffer.from(`01 ${ this.heroID } 00 00 ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff ff`.replace(/\s/g, ""), "hex")
	}

}
CL_HeroRequestPreResultItembox.ID = 7 | (35 << 8);


class SV_HeroResultItembox extends RFOPacket {
	constructor(obj) {
		super()
		Object.assign(this, obj)
	}

	static fromBuffer(pack) {
		this._tryPacket(pack)
		
		const b = new BufferReader(pack)
		b.u16()

		const thingID = b.buf(3).toString("hex")
		b.offset -= 3
		
		return {
			thingID,
			byItemTableCode: b.u8(),
			wItemRecIndex: b.u16(),
		
			amount: b.u8(),
			unkBuf1: b.buf(11),
			wItemSerial: b.u16(),
		}
	}
}
SV_HeroResultItembox.ID = 11 | (9 << 8);



const RFOPackets = {
	/// loot
	CL_ItemboxTakeRequest,
	SV_ItemboxCreate,
	SV_ItemboxFixposition,
	SV_ItemboxStateChange,
	SV_ItemboxTakeNewResult,
	SV_ItemboxTakeAddResult,
	SV_ItemboxDestroy,
	CL_ItemboxDrop,
	SV_ItemboxDropResult,
	SV_ItemboxDelete,
	
	/// party
	SV_PartyJoinJoinerResult,
	SV_PartyJoinMemberResult,
	SV_PartyLeaveSelfResult,
	SV_PartyLeaveCompulsionResult,
	SV_AlterPartyLootShareMode,

	/// move 
	SV_PlayerMove,
	SV_PlayerStop,
	SV_PlayerUnkChangeMoveType,
	
	///
	SV_MovePotalResult,
	SV_UnkEventNewMap,
	
	///
	SV_FirstSimpliePacket,
	
	///
	CL_HeroRequest,
	SV_HeroPreResultItembox,
	CL_HeroRequestPreResultItembox,
	SV_HeroResultItembox,
}

for(const key of Object.keys(RFOPackets))
	RFOPackets[ RFOPackets[key].ID ] = RFOPackets[key]

module.exports = RFOPackets