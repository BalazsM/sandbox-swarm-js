
class Simulation {
	constructor() {
		this.time = 0;
		this.packetInTransmit = 0;
		this.packetLossRatio = 0;
		this.packetsSent = 0;
		this.packetLosses = 0;
		this.packetCollosions = 0;
		this.droneCollosions = 0;
	}

	update() {
		this.time++;
		this.packetInTransmit = 0;

		for (let sender of drones) {
			if (sender.state == 'dead' || sender.txQueue.length == 0)
				continue;

			let packet = sender.txQueue.shift();

			for (let receiver of drones) {
				if ((sender.id != receiver.id) && 
					(dist(sender.position.x, sender.position.y, 
						receiver.position.x, receiver.position.y) <= droneRadioRange)) {
					if (this.packetLossRatio < random(100))
						receiver.rxQueue.push(packet);
					else
						this.packetLosses++;
				}
			}
		}

		for (let drone of drones) {
			drone.performControl(this);
			drone.performSimulation(1.0); //simulation.deltaTime);
		}

		for (let drone1 of drones) {
			if (drone1.state == 'dead')
				continue;
			for (let drone2 of drones) {
				if (drone2.state == 'dead')
					continue;
				if (drone1.id != drone2.id &&
					dist(drone1.position.x, drone1.position.y,
					drone2.position.x, drone2.position.y) < 20) {
						drone1.state = 'dead';
						drone2.state = 'dead';
						this.droneCollosions++;
					}
			}
		}

		obstacleMap.update();
	}
}