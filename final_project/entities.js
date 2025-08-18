import {boxLimits, boxCollision, STATE} from '/utils.js'
import ThirdPersonCamera from './camera.js'

// abstract class for game objects
class Entity {

    constructor({
        mesh,
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
        this._encumbrance = encumbrance;
        this._parent = parent;
        this._world = world;
                
        this._updateSides();
    }
    
    getPosition(){
        return this._mesh.position;
    }
    
    getRotation(){
        return this._mesh.quaternion;
    }
    
    getDimensions(){
        return [this._encumbrance.width, this._hitbox.height, this._encumbrance.depth];
    }
    
    _updateSides(){ // for now everything is a box later thi method may need to change
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

export class Character extends Entity {
    constructor({
        mesh,
        camera,
        parent, // each entity has a parent, world is parent to all (not sure if this is redundant if 3js has it already)
        world,
        controller,
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
            mesh,
            parent,
            world,
            position,
            encumbrance,
            hitbox
        }); 
        this.velocity = {
            x: 0.0,
            y: 0.0,
            z: 0.0
        }
        this.angular = {
            x: 0.0,
            y: 0.0,
            z: 0.0
        }
        
        this.state = STATE.IDLE;
        this.gravity = world.gravity;
        this._camera = new ThirdPersonCamera(camera, mesh);
        this._controller = controller;
        
        this._camera.update();
    
    }
    
    _isIdle(){
        return this.velocity.x == 0 && this.velocity.y == 0 && this.velocity.z == 0;
    }

    _updateView(){
        const position = this._mesh.position;
        //this._camera.position.set(position.x+2, position.y+2, position.z+2);
    }
    
    _updateCommand(){
        const keys = this._controller._keys;
        const mouse = this._controller._mouse;
    
        let speed = 0.0;

        if(keys.shft.pressed) {
            speed += 0.15;
        } else {
            speed += 0.07;
        }
        this.velocity.x = 0;
        this.velocity.z = 0;
        this.angular.y = 0;
        if (this.state != STATE.FALLING) this.velocity.y = 0;
        
        if(keys.a.pressed) this.velocity.x += speed;
        else if(keys.d.pressed) this.velocity.x -= speed;
    
        if(keys.s.pressed) this.velocity.z -= speed;
        else if(keys.w.pressed) this.velocity.z += speed; 
        
        /*if(keys.ar.pressed) this.angular.y -= 0.01;
        else if(keys.al.pressed) this.angular.y += 0.01*/
        
        this.angular.y += mouse.move.x;
        
        if(keys.spc.active && this.state != STATE.JUMPING && this.state != STATE.FALLING){
            keys.spc.active = false;
            this.velocity.y += 0.15;
        }
        
        if(this._isIdle()){
            this.state = STATE.IDLE;
        } else if (keys.shft.pressed) {
          this._camera.update();  this.state = STATE.RUNNING;
        } else {
            this.state = STATE.WALKING;
        }
        
        if (this.velocity.y < 0 ){
            this.state = STATE.FALLING;
        } else if (this.velocity.y > 0 ) {
            this.state = STATE.JUMPING;
        }
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
            this.state = STATE.FALLING;
            if (this.velocity.y >= -5) {
                this.velocity.y += this.gravity; // gravity
            }
        }
    }

    _updatePosition(){
        this._mesh.translateX(this.velocity.x);
        this._mesh.position.y += this.velocity.y;
        this._mesh.translateZ(this.velocity.z);
        this._mesh.rotation.y += this.angular.y;

        this._camera.update();
    }

    update(){
        this._updateSides();
        
        this._updateGravity();
        this._updateCommand();
        this._updatePosition();
        this._updateView();
        
        //if(this.state != STATE.IDLE) console.log(this.state);
    }
}

// a walkable platform in our world
export class Walkable extends Entity {
    constructor({
        mesh,
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
            mesh,
            parent,
            world, // world were entity is placed in
            position,
            encumbrance,
            hitbox
        }); 
    }
    
    update(){
        //console.log("im updating")
        return;
    }
}
