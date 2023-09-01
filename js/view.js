class View {
	constructor() {
		this.locked = false;
		this.deltaX = 0.0;
		this.deltaY = 0.0;
		this.offsetX = 0.0;
		this.offsetY = 0.0;
		this.zoom = 1.0;
	}

	draw() {
		clear();
		push();
		translate(this.deltaX, this.deltaY);
		scale(this.zoom);
	
		for (let home of homes)
			drawHome(home);
	
		this.drawMap(obstacleMap);
	
		for (let drone of drones)
			this.drawDrone(drone);
	
		pop();
	}

	drawMap(map) {
		push();
		translate(0, 0);
	
		const r = map.resolution;
		const wh = map.resolution - 2;

		noStroke();
		fill(10, 10, 10, 100);
		let i = 0;
		for (let y = 0; y < map.height; y++) {
			for (let x = 0; x < map.width; x++) {
				const v = map.values[i];
				if (v > 0) {
					fill(200, 200, 200, v / 1000 * 100);

					rect(x * r, 
						y * r, 
						wh, 
						wh);
				}
				i++;
			}
		}
	
		pop();
	}

	drawDrone(drone) {
		push();
		translate(drone.position.x, drone.position.y);
		push();
		rotate(drone.velocity.heading());
	
		if (drone.state == 'dead') {
			stroke(100);
		} else {
			stroke(0);
		}
	
		strokeWeight(0.4);
		line( 8, -8, -8, 8);
		line(-8, -8,  8, 8);
	
		fill(0);
		ellipse(-8, -8, 4);
		ellipse(-8, 8, 4);
		ellipse(8, -8, 4);
		ellipse(8, 8, 4);
	
		noFill();
		stroke(100, 100, 100, 200);
		arc(-8, -8, 16, 16, PI / 180 * 130, PI / 180 * 320);
		arc(-8, 8, 16, 16, PI / 180 * 40, PI / 180 * 230);
		arc(8, 8, 16, 16, PI / 180 * 310, PI / 180 * 140);
		arc(8, -8, 16, 16, PI / 180 * 220, PI / 180 * 50);
		stroke(100, 100, 100, 50);
		arc(-8, -8, 16, 16, PI / 180 * 320, PI / 180 * 130);
		arc(-8, 8, 16, 16, PI / 180 * 230, PI / 180 * 40);
		arc(8, 8, 16, 16, PI / 180 * 140, PI / 180 * 310);
		arc(8, -8, 16, 16, PI / 180 * 50, PI / 180 * 220);
	
		let c;
		if (drone.state == 'dead') {
			c = 100;
		} else {
			c = lerpColor(color(255, 0, 0), color(0, 255, 0), drone.charge / 100.0);
		}
	
		pop();

		noStroke();
		fill(c);
		rect(-20, 24, 40 * drone.charge / 100.0, 4);
		stroke(0);
		noFill();
		rect(-20, 24, 40, 4);

		if (drone == selectedDrone) {
			fill(0, 0, 0, 0);
			strokeWeight(1);
			stroke('#2f86c9');
			const a = PI / 180;
			const a10 = a * 10;
			const a20 = a * 20;
			for (let i = 0; i < 20; i++) {
				const a20i = a20 * i;
				arc(0, 0, 50, 50, a20i, a20i + a10);
			}
		}
	
		pop();
	
		if (drone.state == 'dead')
			return;
	
		if (droneShowMinDistance.checked) {
			push();
			translate(drone.position.x, drone.position.y);
	
			strokeWeight(1);
			stroke(255, 0, 0, 200);
			fill(0, 0, 0, 0);
			ellipse(0, 0, droneMinDistance * 2);
	
			pop();
		}
	
		if (droneShowTarget.checked && drone.target != null) {
			strokeWeight(0.5);
			stroke(255, 216, 0, 200);
			fill(255, 216, 0, 200);
			drawArrow(drone.position, drone.target);
		}
	
		if (droneShowRadioRange.checked) {
			push();
			translate(drone.position.x, drone.position.y);
	
			strokeWeight(1);
			stroke(0, 0, 255, 200);
			fill(0, 0, 0, 0);
			ellipse(0, 0, droneRadioRange * 2);
	
			pop();
		}
	
		if (droneShowPatrolTrack.checked) {
			strokeWeight(0.5);
			stroke(242, 159, 15, 200);
			fill(242, 159, 15, 200);
			for (let i = 0; i < drone.patrolTrack.length; i++) {
				drawArrow(drone.patrolTrack[i], drone.patrolTrack[(i + 1) % drone.patrolTrack.length]);
			}
		}
	}
}

function drawArrow(begin, end) {
	let vec = p5.Vector.sub(end, begin);
	push();
	translate(begin.x, begin.y);
	rotate(vec.heading());
	line(5, 0, vec.mag() - 5, 0);
	let arrowSize = 10;
	translate(vec.mag() - arrowSize, 0);
	triangle(0, arrowSize / 4, 0, -arrowSize / 4, arrowSize, 0);
	pop();
}

