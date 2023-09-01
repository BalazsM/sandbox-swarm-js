// TODO: move into drones-js repo
// TODO: simulation speed slider
// TODO: accordion
// TODO: update globals

// code based on:
//     https://thecodingtrain.com/challenges/124-flocking-simulation

const homes = [];
const drones = [];
const globalMap = new Map(200, 200, 10);

const view = new View();
// let workspaceLocked = false;
// let workspaceDeltaX = 0.0;
// let workspaceDeltaY = 0.0;
// let workspaceOffsetX = 0.0;
// let workspaceOffsetY = 0.0;
// let workspaceZoom = 1.0;

const simulation = new Simulation();

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

  
// ---------------------------------------------------------------------------

class Packet {
	constructor(senderId, senderPosition) {
		this.senderId = senderId;
		this.senderPosition = senderPosition;
		this.senderPositionLocks = [];
		this.sendTime = simulation.time;
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
	/*if (mouseButton === LEFT) {
		let droneSelected = false;
		for (let drone of drones) {
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
	}*/
	
	if (mouseButton === LEFT) {
		view.locked = true;
		view.offsetX = mouseX - view.deltaX;
		view.offsetY = mouseY - view.deltaY;
	}
}

function mouseDragged() {
	if (view.locked) {
		view.deltaX = mouseX - view.offsetX;
		view.deltaY = mouseY - view.offsetY;
	}

	return false;
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

	simulation.update();

	view.draw();

	updateDisplays();
}

// ---------------------------------------------------------------------------

function formatVector(vector) {
	return vector.x.toFixed(2) + ', ' + vector.y.toFixed(2);
}

function addDrone() {
	let drone = new Drone(
		drones.length,
		homes[drones.length % homes.length])
	drones.push(drone);
	if (drones.length == 1)
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
	simulationFPSDisplay.innerHTML = frameRate().toFixed(2);
	simulationTimeDisplay.innerHTML = simulation.time;
	simulationPacketsSentDisplay.innerHTML = simulation.packetsSent;
	simulationPacketLossesDisplay.innerHTML = simulation.packetLosses;
		//' (' + (simulationPacketLosses / simulationPacketsSent * 100).toFixed(2) + '%)';
	simulationPacketCollosionsDisplay.innerHTML = simulation.packetCollosions;
	simulationDroneCollosionsDisplay.innerHTML = simulation.droneCollosions;

	if (selectedDrone)
	{
		droneDataDiv.style.display = null;
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



function drawHome(home) {
	push();
	translate(home.position.x, home.position.y);

	stroke(0);
	fill(0, 0, 0, 0);
	ellipse(0, 0, 60);

	stroke(64);
	strokeWeight(3);
	fill(0, 0, 0, 0);
	line(-8, -8, -8,  8);
	line( 8, -8,  8,  8);
	line(-8,  0,  8,  0);

//	stroke(128);
//	strokeWeight(2);
//	ellipse(0, 0, 40);

	pop();
}

