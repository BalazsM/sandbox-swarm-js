
// code based on:
//     https://thecodingtrain.com/challenges/124-flocking-simulation

const homes = [];
const swarm = [];

let workspaceLocked = false;
let workspaceDeltaX = 0.0;
let workspaceDeltaY = 0.0;
let workspaceOffsetX = 0.0;
let workspaceOffsetY = 0.0;
let workspaceZoom = 1.0;

let simulationTime = 0;
let simulationPacketInTransmit = 0;
let simulationPacketLossRatio = 0;
let simulationPacketsSent = 0;
let simulationPacketLosses = 0;
let simulationPacketCollosions = 0;
let simulationDroneCollosions = 0;

let droneMinDistance;
let droneRadioRange;
let droneMaxSpeed;
let droneHearthbeatInterval;
let droneDischargeRate;

let selectedDrone = null;

// ---------------------------------------------------------------------------

class Home {
	constructor(x, y) {
		this.position = createVector(x, y);
	}
}

// ---------------------------------------------------------------------------

class Drone {
	constructor(id, home) {
		this.id = id;
		this.home = home;
		this.lastHeartbeatTime = 0;
		this.position = createVector(this.home.position.x, this.home.position.y);
		this.velocity = createVector();
		this.acceleration = createVector();
		this.maxForce = 0.2;
		this.charge = 100.0;
		this.state = '';
		this.patrolTrack = [];
		this.patrolIndex = 0;
		this.rxQueue = [];
		this.txQueue = [];
		this.siblings = [];

		let patrolTrackLength = (this.id % 4 + 1) * 3;
		for (let i = 0; i < patrolTrackLength; i++) {
			this.patrolTrack.push(createVector(
				this.home.position.x + cos((i + this.id) / (patrolTrackLength / (2.0 * PI))) * 300.0, 
				this.home.position.y + sin((i + this.id) / (patrolTrackLength / (2.0 * PI))) * 240.0));
		}

		this.state = 'patrol';
		this.target = this.patrolTrack[this.patrolIndex];
	}
  
	performControl(deltaT) {
		switch (this.state)
		{
			case 'dead':
				this.velocity.x = 0.0;
				this.velocity.y = 0.0;
				break;

			case 'patrol':
				this.doPacketProcessing();
				if (dist(this.position.x, this.position.y, this.target.x, this.target.y) < 2.0) {
					this.patrolIndex = (this.patrolIndex + 1) % this.patrolTrack.length;
					this.target = this.patrolTrack[this.patrolIndex];
				}
				this.doSteering();
				if (this.charge < 25.0) // TODO: check distance from home
					this.state = 'gohome';
				break;
			
			case 'gohome':
				this.doPacketProcessing();
				if (dist(this.position.x, this.position.y, this.target.x, this.target.y) < 2.0)
					this.state = 'charge';
				this.target = this.home.position;
				this.doSteering();
				break;
  
			case 'charge':
				this.doPacketProcessing();
				this.velocity.x = 0;
				this.velocity.y = 0;
				this.charge += 0.55; // * deltaT;
				if (this.charge > 100.0) {
					this.charge = 100.0;
					this.state = 'patrol';
				}
				break;
		}
	}
	
	doPacketProcessing() {
		if ((simulationTime - this.lastHeartbeatTime) > droneHearthbeatInterval) {
			let packet = new Packet(this.id, this.position);
			this.txQueue.push(packet);
			simulationPacketInTransmit++;
			simulationPacketsSent++;
			this.lastHeartbeatTime = simulationTime;
		}

		if (this.rxQueue.length > 0 && simulationPacketInTransmit > 1) {
			simulationPacketCollosions++;
			this.rxQueue.length = 0;
		} else if (simulationPacketInTransmit == 1) {
			while (this.rxQueue.length > 0) {
				let packet = this.rxQueue.shift();
				let sibling = null;
				for (let s of this.siblings) {
					if (s.id == packet.senderId) {
						sibling = s;
						break;
					}
				}

				if (sibling == null) {
					sibling = new Sibling(packet.senderId);
					this.siblings.push(sibling);
				}

				sibling.position = packet.senderPosition;
				sibling.time = simulationTime;
			}
		}


		var liveSiblings = [];
		for (let sibling of this.siblings) {
			if (simulationTime - sibling.time < 3 * 10) {
				liveSiblings.push(sibling);
			}
		}
		this.siblings = liveSiblings;
	}

	doSteering() {
		var desired = p5.Vector.sub(this.target, this.position);
		var d = desired.mag();
		var speed = droneMaxSpeed;
		if (d < 100)
			speed = map(d, 0, 100, 0, droneMaxSpeed);
		desired.setMag(speed);
		var steering = p5.Vector.sub(desired, this.vel);
		steering.limit(this.maxForce);
		this.acceleration.add(steering);

		for (let sibling of this.siblings) {
			desired = p5.Vector.sub(sibling.position, this.position);
			d = desired.mag();
			if (d < droneMinDistance) {
				desired.setMag(droneMaxSpeed);
				desired.mult(-1);
				steering = p5.Vector.sub(desired, this.velocity);
				steering.limit(this.maxForce * 10);
				this.acceleration.add(steering);
			}
		}
	}
	
	performSimulation(deltaT) {
		this.position.add(this.velocity.mult(deltaT));
		this.velocity.add(this.acceleration.mult(deltaT));
		this.velocity.limit(droneMaxSpeed);
		this.acceleration.mult(0);
		this.charge -= droneDischargeRate * deltaT;
		if (this.charge < 0.0) {
			this.charge = 0.0;
			this.state = 'dead';
		}
	}
}
  
// ---------------------------------------------------------------------------

class Packet {
	constructor(senderId, senderPosition) {
		this.senderId = senderId;
		this.senderPosition = senderPosition;
		this.senderPositionLocks = [];
		this.sendTime = simulationTime;
	}
}

// ---------------------------------------------------------------------------

class Sibling {
	constructor(id) {
		this.id = id;
		this.position = createVector();
		this.time = 0;
	}
}
  
// --  p5js event handlers  --------------------------------------------------

function preload() {
}

function setup() {
	let canvas = createCanvas(windowWidth, windowHeight);
	canvas.parent('workspace');

	smooth();
	
	for (let i = 0; i < 5; i++) {
		homes.push(new Home(
			width / 2.0 + cos(i / (5 / (2.0 * PI))) * 300.0, 
			height / 2.0 + sin(i / (5 / (2.0 * PI))) * 300.0));
	}

	for (let i = 0; i < 12; i++)
		setTimeout(() => {
			addDrone();
		}, i * 1000);
}

function windowResized() {
	resizeCanvas(windowWidth, windowHeight);
}

function mousePressed() {
	if (mouseButton === LEFT) {
		let droneSelected = false;
		for (let drone of swarm) {
			if (dist(drone.position.x, drone.position.y, mouseX, mouseY) < 20) {
				droneSelected = true;
				selectedDrone = drone;
				console.log(drone);
				break;
			}
		}

		if (!droneSelected) {
			if (selectedDrone != null) {
				selectedDrone.target = createVector(mouseX, mouseY);
			}
		}
	}
/*	
	if (mouseButton === CENTER) {
		workspaceLocked = true;
		workspaceOffsetX = mouseX - workspaceDeltaX;
		workspaceOffsetY = mouseY - workspaceDeltaY;
	}
*/	
}

function mouseDragged() {
	if (workspaceLocked) {
		workspaceDeltaX = mouseX - workspaceOffsetX;
		workspaceDeltaY = mouseY - workspaceOffsetY;
	}
}

function mouseReleased() {
	workspaceLocked = false;
}

function mouseWheel(event) {
//	workspaceZoom = workspaceZoom - event.delta / 1000.0;
//	return false;
}

function draw() {
	updateGlobals();

	updateSimulation();

	drawSimulation();

	updateDisplays();
}

// ---------------------------------------------------------------------------

function updateSimulation() {
	simulationTime++;
	simulationPacketInTransmit = 0;

	for (let sender of swarm) {
		if (sender.state == 'dead' || sender.txQueue.length == 0)
			continue;

		let packet = sender.txQueue.shift();

		for (let receiver of swarm) {
			if ((sender.id != receiver.id) && 
				(dist(sender.position.x, sender.position.y, 
					receiver.position.x, receiver.position.y) <= droneRadioRange)) {
				if (simulationPacketLossRatio < random(100))
					receiver.rxQueue.push(packet);
				else
					simulationPacketLosses++;
			}
		}
	}

	for (let drone of swarm) {
		drone.performControl(1.0);
		drone.performSimulation(1.0); //simulationSpeedSlider);
	}

	for (let drone1 of swarm) {
		if (drone1.state == 'dead')
			continue;
		for (let drone2 of swarm) {
			if (drone2.state == 'dead')
				continue;
			if (drone1.id != drone2.id &&
				dist(drone1.position.x, drone1.position.y,
				drone2.position.x, drone2.position.y) < 20) {
					drone1.state = 'dead';
					drone2.state = 'dead';
					simulationDroneCollosions++;
				}
		}
	}
}

function formatVector(vector) {
	return vector.x.toFixed(2) + ', ' + vector.y.toFixed(2);
}

function addDrone() {
	let drone = new Drone(
		swarm.length,
		homes[swarm.length % homes.length])
	swarm.push(drone);
	if (swarm.length == 1)
		selectedDrone = drone;
}

function updateGlobals() {
	simulationPacketLossRatio = simulationPacketLossRatioInput.value * 1.0;
	droneMinDistance = droneMinDistanceInput.value * 1.0;
	droneRadioRange = droneRadioRangeInput.value * 1.0;
	droneMaxSpeed = droneMaxSpeedInput.value * 1.0;
	droneHearthbeatInterval = (droneHearthbeatIntervalInput.value * 1.0).toFixed(0);
	droneDischargeRate = droneDischargeRateInput.value * 1.0;
}

function updateDisplays() {
	simulationTimeDisplay.innerHTML = simulationTime;
	simulationPacketsSentDisplay.innerHTML = simulationPacketsSent;
	simulationPacketLossesDisplay.innerHTML = simulationPacketLosses;
		//' (' + (simulationPacketLosses / simulationPacketsSent * 100).toFixed(2) + '%)';
	simulationPacketCollosionsDisplay.innerHTML = simulationPacketCollosions;
	simulationDroneCollosionsDisplay.innerHTML = simulationDroneCollosions;

	if (selectedDrone)
	{
		droneDataDiv.style.display = '';
		droneIdDisplay.innerHTML = selectedDrone.id;
		droneStateDisplay.innerHTML = selectedDrone.state;
		dronePositionDisplay.innerHTML = formatVector(selectedDrone.position);
		droneTargetDisplay.innerHTML = formatVector(selectedDrone.target);
		droneChargeDisplay.innerHTML = selectedDrone.charge.toFixed(1) + '%';
		droneSiblingsCountDisplay.innerHTML = selectedDrone.siblings.length;
	} else {
		droneDataDiv.style.display = 'none';
	}
}

// --  draw funtions  --------------------------------------------------------

function drawSimulation() {
	clear();
	push();
	translate(workspaceDeltaX, workspaceDeltaY);
	scale(workspaceZoom);

	for (let home of homes)
		drawHome(home);

	for (let drone of swarm)
		drawDrone(drone);

	pop();
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

function drawHome(home) {
	push();
	translate(home.position.x, home.position.y);

	stroke(0);
	fill(0, 0, 0, 64);
	ellipse(0, 0, 60);

	stroke(64);
	strokeWeight(3);
	fill(0, 0, 0, 0);
	line(-8, -8, -8,  8);
	line( 8, -8,  8,  8);
	line(-8,  0,  8,  0);

	stroke(128);
	strokeWeight(2);
	ellipse(0, 0, 40);

	pop();
}

function drawDrone(drone) {
	push();
	translate(drone.position.x, drone.position.y);
	rotate(drone.velocity.heading());

	if (drone.state == 'dead')
		stroke(100);
	else
		stroke(lerpColor(color(255, 0, 0), color(0, 255, 0), drone.charge / 100.0));

	strokeWeight(1);
	line( 2, -2, -2, 2);
	line(-2, -2,  2, 2);
	line( 2, -2, -2, 2);

	fill(0, 0, 0, 0);
	strokeWeight(2);
	ellipse(-5, -5, 8);
	ellipse(-5, 5, 8);
	ellipse(5, -5, 8);
	ellipse(5, 5, 8);

	if (drone == selectedDrone) {
		fill(0, 0, 0, 0);
		strokeWeight(2);
		stroke('#2f86c9');
		ellipse(0, 0, 40);
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
