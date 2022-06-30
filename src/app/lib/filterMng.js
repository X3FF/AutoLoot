
class FilterMngGroup {
	constructor(filterMng) {
		this.filterMng = filterMng
		this.array = []
		
		this.emit = this.filterMng.emit.bind(this.filterMng)
	}
	on(key, callback, order = 0) {
		this.filterMng.on(key, callback, order)
		this.array.push({ key, callback })
	}
	off(key, callback) {
		this.array = this.array.filter(h => !(h.key === key && h.callback === callback))
		this.filterMng.off(key, callback)
	}
	
	offAll() {
		this.array.map(h => this.filterMng.off(h.key, h.callback))
		this.array = []
	}
}
class FilterMng {
	constructor() {
		this.mapHandlers = new Map()
	}
	
	group() {
		return new FilterMngGroup(this)
	}
	
	on(key, callback, order = 0) {
		let handlers = this.mapHandlers.get(key)
		if ( !handlers )
			this.mapHandlers.set( key, handlers = [] )
		
		let h = handlers.find(h => h.callback === callback)
		if ( !h )
			handlers.push( h = { callback, order } )
			
		
		h.callback = callback
		h.order = order
		handlers.sort((l, r) => l.order - r.order)		
	}
	off(key, callback) {
		let handlers = this.mapHandlers.get(key)
		if ( !handlers )
			return false
		
		const i = handlers.findIndex(v => v.callback === callback)
		if ( i < 0 )
			return false
		
		handlers.splice(i, 1)
		if ( !handlers.length )
			this.mapHandlers.delete(key)
		
		return true
	}

	emit(key, ...args) {
		const handlers = this.mapHandlers.get(key);
		if ( !handlers )
			return true
		
		for(const {callback} of handlers) {
			switch( callback(...args) ) {
				case FilterMng.DISCARD:
					return false
					
				case FilterMng.BREAK:
					return true
			}
		}
		
		return true;
	}
}
FilterMng.NEXT = 0
FilterMng.BREAK = 1
FilterMng.DISCARD = 2

/**
f = new FilterMng()
cb = (...args) => console.log("[ cb 0 ] ", args)
cb1 = (...args) => console.log("[ cb 1 ] ", args)
cb2 = (...args) => console.log("[ cb 2 ] ", args)
f.on(2, cb)
f.emit(2, {x: 3, y: 5}, "native")
f.off(2, cb)
f.emit(2, [1,2,3], "native")

g = f.group()
g.on(6, cb)
g.on(9, cb1)
g.on(9, cb2)
g.emit(9, "cb..")
g.off(9, cb1)

*/

module.exports = FilterMng