// parent class to all entities in simulation (objects, characters, enemies, etc.)
class Entity {
    // drawer = drawer class used to render the object, position = transformation matrix from World's RF to entity RF, mesh = array of verteces
    constructor(drawer, position, mesh) {
    
      if(this.constructor == Entity) {
         throw new Error("Class is of abstract type and can't be instantiated");
      };

      if(this.SimTimeStep == undefined) {
          throw new Error("draw method must be implemented");
      };
      
    if(this.setPosition == undefined) {
          throw new Error("setPosition method must be implemented");
      };
            
      this.drawer = drawer;
      this.position = position;
      this.mesh = mesh;
    }
}

// world class contains all that there's in the simulation
class World extends Entity {
    constructor(drawer, position, mesh, gravity, entity_array) {
        super(drawer, position, mesh);
        
        if(entity_array == null) {
            this.entity_array = [];
        }
        else {
            this.entity_array = entity_array;
        }
        
        this.gravity = gravity;
        
    }
    
    addEntity(e) {
        if(e instanceof World) {
            throw new Error("cannot add World object to World's entities");
        }
        
        if(e instanceof Entity) {
            entity_array.push(e);
        }
    }   
    
    drawWorld() {
        this.drawer.draw(this.position);
        
        for(let i = 0; i < this.entity_array.length; i++){
            e = this.entity_array[i];
            e.drawer.draw(e.position);
        }
        
    }

    SimTimeStep(dt, gravity) {
        for(let i = 0; i < this.entity_array.length; i++){
            e = this.entity_array[i];
            e.SimTimeStep(dt, gravity);
        }
    
    }
    
    setPosition(position) {
        this.position = position;
    }
    
};

class Character extends Entity {
    constructor(drawer, position, mesh) {
        super(drawer, position, mesh);
    }
    
    SimTimeStep(dt, gravity){
        return
    }
    
    setPosition(position) {
        this.position = position;
    }
};
