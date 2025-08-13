function getBoxMesh(x1,y1,z1,x2,y2,z2) {
    var vertPos = [
	    x2, y2, z1,  x1, y2, z1,  x1, y1, z1,  x2, y1, z1,
		x2, y2, z2,  x2, y1, z2,  x1, y1, z2,  x1, y2, z2,
		x2, y1, z2,  x2, y1, z1,  x1, y1, z1,  x1, y1, z2,
		x2, y2, z2,  x1, y2, z2,  x1, y2, z1,  x2, y2, z1,
		x1, y2, z2,  x1, y1, z2,  x1, y1, z1,  x1, y2, z1,
		x2, y2, z2,  x2, y2, z1,  x2, y1, z1,  x2, y1, z2
	];
	return vertPos
}

// simulation control
class SimulationControl {
    constructor(world, timestep) {
    
        if( world.SimTimeStep == undefined){
        throw new Error("SimTimeStep method must be implemented for simulated object");
        };
    
        this.world = world;
    }
    
    startSimulation(timestep) {
        if ( ! this.isSimulationRunning() ) this.timer = setInterval( function(){ this.world.SimTimeStep(null, timestep); }, timestep );
    }
    
    stopSimulation() {
        clearInterval( this.timer );
		this.timer = undefined;
	}
	
	isSimulationRunning() { return this.timer !== undefined; }
    	
    restartSimulation() { if ( this.isSimulationRunning() ) { this.stopSimulation(); this.startSimulation(); } }
	
    toggleSimulation( btn, timestep ) {
	    if ( this.isSimulationRunning() ) {
    		this.stopSimulation();
			btn.value = "Start Simulation";
		} else {
    		this.startSimulation( timestep );
            btn.value = "Stop Simulation";
		}
	}
}
