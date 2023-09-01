class Map {
	constructor(width, height, resolution) {
		this.width = width;
		this.height = height;
		this.resolution = resolution;
		this.values = new Int32Array(width * height);
	}

	update() {
		let i = 0;
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				const v = this.values[i];
				if (v > 0)
				{
					this.values[i] = v - 1000 / 60;
				}
				i++;
			}
		}
	}

	set(x, y) {
		x = Math.floor(x / this.resolution);
		y = Math.floor(y / this.resolution);
		this.values[y * this.width + x] = 1000;
	}
}