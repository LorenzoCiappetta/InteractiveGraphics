import * as THREE from 'three';
import {boxLimits, boxCollision} from '/utils.js'
import ThirdPersonCamera from './camera.js'
import {CharacterController} from './controls.js'

// abstract class for game objects
class Entity extends THREE.Mesh {

    constructor({
        geometry,
        material,
        parent, // each entity has a parent, world is parent to all (not sure if this is redundant if 3js has it already)
        world, // world were entity is placed in
        position = {
            x: 0,
            y: 0,
            z: 0
        }, 
        encumbrance = { 
            width: 0, // along x
            depth: 0   // along z
        },
        hitbox = { // cilinder
            heigth: 0,
            radius: 0
        }
    }) {
        super(geometry, material);
        // Cannot create object of class entity
        /*if(this.constructor == Entity) {
            throw new Error("Class is of abstract type and can't be instantiated");
        };*/ // not sure if this makes sense semantically  
        
        // All entities require these methods
        if(this.update == undefined) {
            throw new Error("update method must be implemented");        
        }
        
        
        this.position.set(position.x, position.y, position.z);
        this._hitbox = hitbox;
        this._encumbrance = new THREE.Vector3(encumbrance.width, hitbox.height, encumbrance.depth);
        this.parent = parent; // redundant but did not find better solution
        this._parent = parent;
        this._world = world;
                
        this._updateSides();
    }
    
    getPosition(){
        return this.position;
    }
    
    getRotation(){
        return this.quaternion;
    }
    
    getDimensions(){
        return this._encumbrance;
    }
    
    _updateSides(){ // for now everything is a box later thi method may need to change
        const p = this.getPosition();
        const d = this.getDimensions();
        const [r, l, f, b, bo, t] = boxLimits({ 
            position: p,
            dimensions: d
        });
        
        this.right = r;
        this.left = l;
        this.front = f;
        this.back = b;
        this.bottom = bo;
        this.top = t    
    }
}

export class Character extends Entity {
    constructor({
        geometry,
        material,
        camera,
        parent, // each entity has a parent, world is parent to all (not sure if this is redundant if 3js has it already)
        world,
        position = {
            x: 0,
            y: 0,
            z: 0
        },        
        encumbrance = {
            width: 0, // along x
            depth: 0   // along z
        },
        hitbox = { // cilinder
            heigth: 0,
            radius: 0
        },
    }) {
        super({    
            geometry,
            material,
            parent,
            world,
            position,
            encumbrance,
            hitbox
        }); 
        this.castShadow = true;
                
        this.gravity = world.gravity;
        this._camera = new ThirdPersonCamera(camera, this);
        this._controller = new CharacterController(this);
        
        this._camera.update(0);
    
    }
    
    update(timeElapsed){
        this._updateSides();
        
        this._controller.update(timeElapsed);
        this._camera.update(timeElapsed);
        
    }
}

// a walkable platform in our world
export class Walkable extends Entity {
    constructor({
        geometry,
        material,
        parent, // each entity has a parent, world is parent to all (not sure if this is redundant if 3js has it already)
        world,
        position = {
            x: 0,
            y: 0,
            z: 0
        },         
        encumbrance = {
            width: 0, // along x
            depth: 0   // along z
        },
        hitbox = { // cilinder
            heigth: 0,
            radius: 0
        }
    }) {
        super({    
            geometry,
            material,
            parent,
            world, // world were entity is placed in
            position,
            encumbrance,
            hitbox
        }); 
        this.receiveShadow = true;
    }
    
    update(_){
        return;
    }
}

export class Obstacle extends Entity {
    constructor({
        geometry,
        material,
        parent, // each entity has a parent, world is parent to all (not sure if this is redundant if 3js has it already)
        world,
        position = {
            x: 0,
            y: 0,
            z: 0
        },         
        encumbrance = {
            width: 0, // along x
            depth: 0   // along z
        },
        hitbox = { // cilinder
            heigth: 0,
            radius: 0
        }
    }) {
        super({    
            geometry,
            material,
            parent,
            world, // world were entity is placed in
            position,
            encumbrance,
            hitbox
        }); 
        this.castShadow = true;
        this.gravity = world.gravity;        
        this.velocity = {
            x: 0.0,
            y: 0.0,
            z: 0.0
        };
        
    }
    
    _updateGravity(){
        //  hit detect
        if(boxCollision({
            box1: this,
            box2: this._parent
        })) { 
            this.velocity.y = 0.0;
        } else {
            // accellerate via gravity with terminal velocity
            if (this.velocity.y >= -5) {
                this.velocity.y += this.gravity; // gravity
            }
        }
    }   
    
    _updatePosition(){
        
        this.position.y += this.velocity.y;
    }    
    
    update(_) {
        this._updateSides();
        this._updateGravity();
        this._updatePosition();
    }
}
