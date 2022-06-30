
const FilterMng = require("./lib/filterMng")

class NetFilterMng {
	constructor() {
		this.cl = new FilterMng()
		this.sv = new FilterMng()
	}
	
	group() {
		return {
			cl: this.cl.group(),
			sv: this.sv.group(),
			offAll() {
				this.cl.offAll()
				this.sv.offAll()
			}
		}
	}
}

module.exports = NetFilterMng