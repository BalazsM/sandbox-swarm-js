class ObstacleMapCell {
	constructor(x, y) {
		this.x = x;
		this.y = y;

		this.f = 0;
		this.g = 0;
		this.previous = null;
//		this.locked = false;

		this.value = 0;
	}
}

// TODO: rename width to columnsCount, height to rowsCount
class ObstacleMap {
	constructor(width, height, resolution) {
		this.width = width;
		this.height = height;
		this.resolution = resolution;

		this.cells = new Array(this.width);
		for (let i = 0; i < this.width; i++) {
			this.cells[i] = new Array(this.height);
			for (var j = 0; j < this.height; j++) {
				this.cells[i][j] = new ObstacleMapCell(i, j);
			}
		}		
	}

	update() {
		for (let y = 0; y < this.height; y++) {
			for (let x = 0; x < this.width; x++) {
				// const v = this.cells[x][y].value;
				// if (v > 0)
				// {
				//  	this.cells[x][y].value = v - 1000 / 60;
				// }
				this.cells[x][y].value = 0;
			}
		}
	}

	set(x, y, r) {
		x = Math.round(x / this.resolution);
		y = Math.round(y / this.resolution);
		for (let i = -r; i < r; i++) {
			for (let j = -r; j < r; j++) {
				this.cells[x + j][y + i].value = 1000;
			}
		}
	}

	set2(x, y) {
		this.cells[x][y].value = 1000;
	}
}
