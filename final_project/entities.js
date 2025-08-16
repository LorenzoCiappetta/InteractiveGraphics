import SpatialHashGrid from '/utils.js'

/*function callUpdate(e){
    if(e.update == undefined){
        return
    }
    e.update();
}*/

// abstract class for game objects
class Entity {
    constructor({
        mesh,
        parent, // each entity has a parent, world is parent to all (not sure if this is redundant if 3js has it already)
        position = {
            x: 0,
            y: 0,
            z: 0,
        },
        hitbox = {
            height,
            width,
        }
    }){
        // Cannot create object of class entity
        if(this.constructor == Entity) {
            throw new Error("Class is of abstract type and can't be instantiated");
        }; 
        
        // All entities require these methods
        if(this.update == undefined) {
            throw new Error("update method must be implemented");        
        }
        
        this._mesh = mesh;
        this._mesh.position.set(position.x, position.y, position.z);
        this._position = position;
        this._hitbox = hitbox; 
        this._parent = parent
    }
}

export default class World extends Entity {
    constructor({
        mesh,
        position = {
            x: 0,
            y: 0,
            z: 0,
        },
        hitbox = {
            height,
            width,
        },
        grid // data structure used to contain all other entities in the world (e.g. grid hashmap)
    }){
        super({
            mesh: mesh,
            position: position,
            hitbox: hitbox,
            parent: null // world has no parent
       }); 
       
       this._grid = grid; 
    }
    
    addEntity(e) {
        if(e instanceof World) {
            throw new Error("cannot add World object to World's entities");
        }
        
        if(e instanceof Entity) {
            this.grid.NewClient(e, e._position, e._hitbox);
        }
    }
    
    _callUpdate(e){
        if(e.update == undefined){
            return
        }
        e.update();
    }
    
    update() {
        this.grid.IterateOverClients(this._callUpdate);
    }
}

export class Character extends Entity {
    constructor({
        mesh,
        parent, // each entity has a parent, world is parent to all (not sure if this is redundant if 3js has it already)
        position = {
            x: 0,
            y: 0,
            z: 0,
        },
        hitbox = {
            height,
            width,
        }
    }){
        super({
            mesh: mesh,
            position: position,
            hitbox: hitbox,
            parent: parent 
       });     
    }
    
    update(){
        this.position.y += 0.01;
    }
}
