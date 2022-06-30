function gen() {
	let code = "";
	for(let bits of [8, 16, 32, 64]) {
		for(const sign of ["i", "ui"]) {
			for(const endian of ["", "le", "be"]) {
				let endianDst = endian ? endian : "le"
				if ( bits === 8 )
					endianDst = ""
				
				code += 
	`${ sign[0] }${ bits }${ endian }() {
		const result = this.buffer.read${ bits === 64 ? "Big" : "" }${ sign.toUpperCase() }nt${ bits }${ endianDst.toUpperCase() }( this.offset )
		this.offset += ${ bits / 8 }
		return result
	}
	`
			}
		}
	}


	for(let bits of [32, 64]) {
		for(const endian of ["", "le", "be"]) {
			let endianDst = endian ? endian : "le"
			if ( bits === 8 )
				endianDst = ""
				
			code += 
	`f${ bits }${ endian }() {
		const result = this.buffer.read${ bits === 32 ? "Float" : "Double" }${ endianDst.toUpperCase() }( this.offset )
		this.offset += ${ bits / 8 }
		return result
	}
	`
		}
	}

	const BufferReader = (new Function(`
return class BufferReader {
	constructor(buffer, offset = 0) {
		this.buffer = buffer;
		this.offset = offset;
	}
	
	buf(len) {
		const result = this.buffer.slice(this.offset, this.offset + len)
		this.offset += len;
		return result
	}
	
${ code }
}
`))()


	const buf  = Buffer.from([1,2,3,4,5,6,7,8,9,0])
	const b = new BufferReader(buf)
	
	const fns = Object.getOwnPropertyNames(b.__proto__).filter(f => !["constructor"].includes(f))
	fns.map(f => {
		b[f]()
		b.offset = 0
	})

	return BufferReader;
}

module.exports = gen()