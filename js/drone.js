
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
  
	performControl(simulation) {
		switch (this.state)
		{
			case 'dead':
				this.velocity.x = 0.0;
				this.velocity.y = 0.0;
				break;

			case 'patrol':
				this.doPacketProcessing(simulation);
				if (dist(this.position.x, this.position.y, this.target.x, this.target.y) < 2.0) {
					this.patrolIndex = (this.patrolIndex + 1) % this.patrolTrack.length;
					this.target = this.patrolTrack[this.patrolIndex];
				}
				this.doSteering();
				if (this.charge < 25.0) // TODO: check distance from home
					this.state = 'gohome';
				break;
			
			case 'gohome':
				this.doPacketProcessing(simulation);
				if (dist(this.position.x, this.position.y, this.target.x, this.target.y) < 2.0)
					this.state = 'charge';
				this.target = this.home.position;
				this.doSteering();
				break;
  
			case 'charge':
				this.doPacketProcessing(simulation);
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
	
	doPacketProcessing(simulation) {
		if ((simulation.time - this.lastHeartbeatTime) > droneHearthbeatInterval) {
			let packet = new Packet(this.id, this.position);
			this.txQueue.push(packet);
			simulation.packetInTransmit++;
			simulation.packetsSent++;
			this.lastHeartbeatTime = simulation.time;
		}

		if (this.rxQueue.length > 0 && simulation.packetInTransmit > 1) {
			simulation.packetCollosions++;
			this.rxQueue.length = 0;
		} else if (simulation.packetInTransmit == 1) {
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
				sibling.time = simulation.time;
			}
		}

		var liveSiblings = [];
		for (let sibling of this.siblings) {
			if (simulation.time - sibling.time < 3 * 10) {
				liveSiblings.push(sibling);
			}
		}
		this.siblings = liveSiblings;
	}

	doSteering() {
		if (this.state != 'dead') {
			// TODO: do a* search and reservation

			const dx = (this.target.x - this.position.x) / 100.0;
			const dy = (this.target.y - this.position.y) / 100.0;
			let x = this.position.x;
			let y = this.position.y;
			for (let i = 0; i < 100; i++) {
				obstacleMap.set(x, y);
				x += dx;
				y += dy;
			}
		}

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
