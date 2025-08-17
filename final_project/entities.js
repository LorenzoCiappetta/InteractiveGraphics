import {SpatialGrid, boxLimits, boxCollision} from '/utils.js'

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
            width, // along x
            height, // along y 
            depth // along z
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
        this._hitbox = hitbox;
        this._parent = parent;
                
        this._updateSides();
    }
    
    getPosition(){
        return this._mesh.position;
    }
    
    getDimensions(){
        return [this._hitbox.width, this._hitbox.height, this._hitbox.depth];
    }
    
    _updateSides(){
        const p = this.getPosition();
        const [w,h,d] = this.getDimensions()
        const [r, l, f, b, bo, t] = boxLimits({ 
            position: p,
            dimensions: {
                width: w,
                height: h,
                depth: d
            }
        });
        
        this.right = r;
        this.left = l;
        this.front = f;
        this.back = b;
        this.bottom = bo;
        this.top = t    
    }
}

export class World extends Entity {
    constructor({
        mesh,
        hitbox = {
            width,
            height,
            depth,
        },
        gravity = -0.01
    }){
        const position = {
            x: 0,
            y: 0,
            z: 0,
        };
        
        super({
            mesh,
            position,
            hitbox,
            parent: null // world has no parent
        });
                
        this.gravity = gravity;
        
        this._grid = new SpatialGrid([[this.left, this.back],[this.right, this.front]],[5,5]); //data structure for containing all other entities (e.g. linkedlist) 
    }
    
    addEntity(e) {
        if(e instanceof World) {
            throw new Error("cannot add World object to World's entities");
        }
        
        if(e instanceof Entity) {
            const position = e.getPosition();
            this._grid.NewClient(e, [position.x, position.z], [e._hitbox.width, e._hitbox.depth]);
        }
    }

    // TODO: For now it updates worldwide, later may need to be modified to update only around the character 
    update() {
        const clients = this._grid.FindNear([this._mesh.position.x, this._mesh.position.z],[this._hitbox.width, this._hitbox.depth]);
        clients.forEach( (client) => {
            client.entity.update();
            this._grid.UpdateClient(client);
        });
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
            width,
            height,
            depth
        }
    }){
        super({    
            mesh,
            position,
            hitbox,
            parent 
        }); 
        this.velocity = {
            x: 0.0,
            y: 0.0,
            z: 0.0
        }
        
        this.gravity = parent.gravity;
        
    }
        
    update(){
        this._updateSides();
        // accellerate via gravity
        try{
            this.velocity.y += this.gravity; // gravity
        }catch{
        }
        //  hit detect
        if(boxCollision({
            box1: this,
            box2: this._parent
        })) { 

            this.velocity.y -= this.velocity.y;
        } else {
            this._mesh.position.y += this.velocity.y;
        }
    }
        
    
}
