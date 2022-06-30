
const sleep = msec => new Promise(r => setTimeout(r, msec))

class Vec3 {
	static add(v1, v2) {
		return {
			x: v1.x + v2.x,
			y: v1.y + v2.y,
			z: v1.z + v2.z,
		}
	}

	static sub(v1, v2) {
		return {
			x: v1.x - v2.x,
			y: v1.y - v2.y,
			z: v1.z - v2.z,
		}
	}

	static mulScalar(v, rate) {
		return {
			x: v.x * rate,
			y: v.y * rate,
			z: v.z * rate,
		}
	}
	
	static distXZ(v1, v2) {
		return ( (v1.x - v2.x)**2 + (v1.z - v2.z)**2 ) ** 0.5
	}
	
	static normalizeXZ(v) {
		const len = this.lenXZ(v)
		const rate = 1 / len
		return {
			x: v.x * rate,
			y: v.y,
			z: v.z * rate,
		}
	}

	static lenXZ(v) {
		return (v.x**2 + v.z**2) ** 0.5
	}
}

const arrayItemDelete = (arr, item) => {
	const i = arr.indexOf(item)
	if ( i < 0 )
		return false
	
	arr.splice(i, 1)
	return true
}

module.exports = { 
	sleep, Vec3, arrayItemDelete
}