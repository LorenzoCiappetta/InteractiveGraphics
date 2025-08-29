import * as THREE from 'three';
import {boxLimits, boxCollision} from '/utils.js'
import ThirdPersonCamera from './camera.js'
import {CharacterController, EnemyController, DroneController, ProjectileController, MovingPlatformController, PlatformController} from './controllers.js'
import {BoxHitBox, CylinderHitBox, StandardCollider} from './collisions.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {SmokeParticles, SmokeTrailParticles, ExplosionParticles} from './particles.js';

// abstract class for game objects
class Entity extends THREE.Object3D {
    constructor({
        height,
        mesh,
        parent,
        world,
        position,
        encumbrance = { 
            width: 0, // along x
            depth: 0   // along z
        }
    }) {
        super();
        
        this._expired = false;
        this._canbehit = true;
        
        this._world = world;                
        if(parent) parent.add(this);
        this._hitbox = null;
        this._inrange = []; // objects in range of weapon(fixed for now);  
        
        this.position.set(position.x,position.y,position.z);
        this._encumbrance = new THREE.Vector3(encumbrance.width, height, encumbrance.depth);                
        
        // collision detection        
        this._collider = null;
        this._collisions = [];
        
        this._updateSides();
        
        this._mesh = mesh;
        if(this._mesh) this.add(this._mesh);        
    }
    
    getDimensions(){
        return this._encumbrance;
    }    
    
    getPosition() {
        const p = new THREE.Vector3();
        this.getWorldPosition(p);
        //console.log(p.x);
        return p;    
    }
    
    getRotation() {
        const q = new THREE.Quaternion();
        this.getWorldQuaternion(q);
        return q;    
    }
    
    getHitBox(){
        return this._hitbox;
    }
    
    showHitBox(){
        if(this._hitbox) this._hitbox.visible = true;
    }

    hideHitBox(){
        if(this._hitbox) this._hitbox.visible = false;
    }

    checkCollision(entity) {
        if(this._collider) {
            const collision = this._collider.collision(this, entity);
            if(collision) this._collisions.push(collision);
            
        }
    }
      
    clearCollisions() {
        this._collisions = [];
    }    

    addToRange(entity) {
        if(entity != this) {
            this._inrange.push(entity);
        }
    }

    clearRange() {
        this._inrange = [];
    }

    _updateSides(){ // for now everything is a box later thi method may need to change // TODO: OUTDATED, fix
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
    
    get expired(){
        return this._expired;
    }
   
};

export class Projectile extends Entity {

    constructor({
        origin,
        speed,
        direction,
        world,
        position,
    }) {
        super({
            height:0.2,
            mesh:null,
            parent:null,
            world,            
            position,
            encumbrance:{
                height:0.01,
                width:0.01
            }
        });
                    
        this._canbehit = false;
        
        this.origin=origin;
        this._lifetime = 10;
        this._direction = direction; // assumed to be normal
        this._speed = speed;
        
        this._trail_particles = new SmokeTrailParticles(this._world._camera, this);
        
        this._hitbox = new BoxHitBox({
            width:0.6,
            height:0.2,
            depth:0.01
        });
        this.add(this._hitbox);
        
        const geometry = new THREE.PlaneGeometry( 0.6, 0.2 );
        const material = new THREE.MeshBasicMaterial( {color: "yellow", side: THREE.DoubleSide} );
        this._mesh = new THREE.Mesh( geometry, material );
        this.add( this._mesh );
        const orth_dir = this._direction.clone();
        orth_dir.set(orth_dir.z,orth_dir.y,-orth_dir.x)
        this._mesh.lookAt(orth_dir.clone().add(this.position));  
        this._hitbox.lookAt(orth_dir.clone().add(this.position));
        
        this._world.addEntity(this);
        this._world.addToScene(this); 
        
        this._collider = new StandardCollider();
        this._controller = new ProjectileController(this);        
    }
    
    update(timeElapsed) {
        this._updateSides(); 
        this._controller.update(timeElapsed);
        this._trail_particles.update(timeElapsed);
    }
    
    checkCollision(entity) {
        if(entity == this.origin || entity == this.origin.parent) return;
        if(this._collider) {
            const collision = this._collider.collision(this, entity);
            if(collision) this._collisions.push(collision);
            
        }
    }
    
    _delete(){
        this._expired = true;
        this.remove(this._mesh);
        this.remove(this._hitbox);
        this._hitbox = null;
        this._mesh = null;
        this._collider = null;
        this._controller = null;
        this._world._scene.remove(this);
    }
    
};

export class Drone extends Entity {
    constructor({radius,
                height,
                mesh,
                parent,
                world,
                position,
                encumbrance = { 
                    width: 0, // along x
                    depth: 0   // along z
                },

    })  {
        super({
            height,
            mesh:null,
            parent,
            world,            
            position,
            encumbrance
        }); 
        
        this._maxammo = 50;
        this._magazine = this._maxammo;
        this._firerate = 0.3;
        this._stal = 0.3;
        this._projectilespeed = 15;
        this._offset = new THREE.Vector3(0.5, 1.0, -0.1);
        this._hitbox = new CylinderHitBox({radius, height});
        this.add(this._hitbox);
        
        this._smoke_particles = new SmokeParticles(this._world._camera, this);
        
        this._rotationhelper = new THREE.Object3D();
        this._rotationhelper.castShadow = false;
        this._rotationhelper.receiveShadow = false;        
        this.add(this._rotationhelper);    
        this._rotationhelper.add(mesh);

        this._mesh = mesh;
        
        if(this.parent instanceof Character) this.position.set(this._offset.x,this._offset.y,this._offset.z);
        this._collider = new StandardCollider();
        this._controller = new DroneController(this);
    }
    
    update(timeElapsed) {
        this._stal += timeElapsed;
        this._updateSides();
        this._controller.update(timeElapsed);
        this._smoke_particles.update(timeElapsed);
    }

    checkCollision(entity) {
        if(entity instanceof Projectile) {
            if(entity.origin == this) return;
        }
        if(this._collider) {
            const collision = this._collider.collision(this, entity);
            if(collision) this._collisions.push(collision);
            
        }
    }

    Fire(direction, timeInSeconds) {
        if(this._magazine == 0) return;
        if (this._stal >= this._firerate) {
            this._magazine -= 1;
            const proj = new Projectile({
                origin:this,
                speed:this._projectilespeed,
                direction:direction,
                world:this._world,
                position:this.getPosition(),
            }); 
            proj._hitbox.visible = this._hitbox.visible;
            this._stal = 0;
            const effect_origin = direction.clone().multiplyScalar(0.1);
            const effect_direction = new THREE.Vector3(0,direction.y,1);
            effect_direction.normalize();
            this._smoke_particles.addParticles(timeInSeconds, effect_origin, effect_direction)
        }    

    }
}

export class Character extends Entity {

    constructor({
        radius,
        height,
        parent,
        world,
        position,
        encumbrance = { 
            width: 0, // along x
            depth: 0   // along z
        },
        camera,
        path
    })  {
        super({
            height,
            mesh:null,
            parent,
            world,            
            position,
            encumbrance
        }); 
              
        this._animations={};
        this.gravity = this._world.gravity
        this._weapon=null;
        
        this._rotationhelper = new THREE.Object3D();
        this._rotationhelper.castShadow = false;
        this._rotationhelper.receiveShadow = false;
        this.add(this._rotationhelper);

        this._hitbox = new CylinderHitBox({radius, height});
        this.add(this._hitbox);

        this._camera = new ThirdPersonCamera(camera, this);
        this._controller = new CharacterController(this);
        this._collider = new StandardCollider();
        this._camera.update(0);          
        this._loadModel(path);
        
    }
    
    update(timeElapsed){
        this._updateSides();        
        this._controller.update(timeElapsed);
        this._camera.update(timeElapsed);
    }

    checkCollision(entity) {
        if(entity instanceof Projectile) {
            if(entity.origin == this || entity.origin == this._weapon) return;
        }
        if(this._collider) {
            const collision = this._collider.collision(this, entity);
            if(collision) this._collisions.push(collision);
            
        }
    }

    addWeapon(weapon) {
        this._weapon = weapon;
        this.add(weapon);
    }    
           
    /*_loadModel(path) {
        const loader = new GLTFLoader();
        loader.load(path, (gltf) => {
            this._mesh = gltf.scene;
            this._mesh.traverse((c) => {
                if(c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                    c.material.side = THREE.FrontSide;
                }
            });
            this.add(this._mesh);             
            this._mesh.position.set(0,-1.0,0);
            this._mesh.rotation.y = Math.PI;
        },
        (xhr)=>{
           console.log("char model" + (xhr.loaded/xhr.total*100)+"% loaded"); 
        });
    }*/
        
    _loadModel(name) {
        const loader = new FBXLoader();
        loader.setPath('./resources/');
        loader.load(name, (fbx) => {
            this._mesh = fbx;
            this._mesh.scale.setScalar(0.01);
            this._mesh.traverse((c) => {
                if(c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                    c.material.side = THREE.FrontSide;
                }
            });
                                        
            this._mesh.position.set(0,-0.9,0);
            this._rotationhelper.add(this._mesh);
            
            this._mixer = new THREE.AnimationMixer(this._mesh);
            
            this._manager = new THREE.LoadingManager();
            this._manager.onLoad = () => {
                this._controller._FSA.setState('idle');
            };
            
            const _onLoad = (animName, anim) => {
                const clip = anim.animations[0];
                const action = this._mixer.clipAction(clip);
                        
                this._animations[animName] = {
                    clip: clip,
                    action: action,
                };
            };
            
            const loader = new FBXLoader(this._manager);
            loader.setPath("./resources/");
            loader.load("idle1.fbx", (a) => {_onLoad('idle',a);});
            loader.load("turn_r.fbx", (a) => {_onLoad('turn_r',a);});
            //loader.load("idle2.fbx", (a) => {_onLoad('idle2',a);});
            loader.load("walk.fbx", (a) => {_onLoad('walk',a);});
            loader.load("run.fbx", (a) => {_onLoad('run',a);});
            loader.load("jump.fbx", (a) => {_onLoad('jump',a);});
            loader.load("fall.fbx", (a) => {_onLoad('fall',a);});
            
        });
    }

}

export class Enemy extends Entity {

    constructor({
        radius,
        height,
        parent,
        world,
        position,
        encumbrance = { 
            width: 0, // along x
            depth: 0   // along z
        },
        path
    })  {
        super({
            height,
            mesh:null,
            parent,
            world,            
            position,
            encumbrance
        }); 
              
        this._animations={};
        this.gravity = this._world.gravity
        this._fov = Math.PI/6;
        this._far = 18;
        this._close = 5;
        this.origin = new THREE.Vector3(10,3,10);
        this._firerate = 0.8;
        this._stal = 0.8;
        this._projectilespeed = 10;
        this._life = 5;
        
        this._smoke_particles = new SmokeParticles(this._world._camera, this);
        this._death_particles = this._world.explosion_particles;
        
        this._rotationhelper = new THREE.Object3D();
        this._rotationhelper.castShadow = false;
        this._rotationhelper.receiveShadow = false;
        this.add(this._rotationhelper);

        this._hitbox = new CylinderHitBox({radius, height});
        this.add(this._hitbox);

        this._controller = new EnemyController(this);
        this._collider = new StandardCollider();     
        this._loadModel(path);
        
    }
    
    update(timeElapsed){
        const r = this._rotationhelper.quaternion;
        const d = new THREE.Vector3(0,0,1);
        d.applyQuaternion(r);
        
        this._smoke_particles.addParticles(timeElapsed, d.clone().setLength(0.4),d);
    
        this._smoke_particles.update(timeElapsed);
        this._stal += timeElapsed;
        this._updateSides();        
        this._controller.update(timeElapsed);
        if(this._life <= 0) {
            const o = new THREE.Vector3(0,0,0)
            this._death_particles.addParticles(timeElapsed,this.getPosition(),o); 
            this._world.addToDeleteList(this);
        }        
    }
    
    checkCollision(entity) {
        if(entity instanceof Projectile) {
            if(entity.origin == this || entity.origin == this._weapon) return;
        }
        if(this._collider) {
            const collision = this._collider.collision(this, entity);
            if(collision) this._collisions.push(collision);
            
        }
    } 
    
    _loadModel() {
        const loader = new GLTFLoader();
        loader.setPath('./resources/enemy');
        loader.load('/scene.gltf', (gltf) => {
            this._mesh = gltf.scene;
            this._mesh.scale.setScalar(0.1);
            this._mesh.traverse((c) => {
                if(c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                    c.material.side = THREE.FrontSide;
                }
            });
                                        
            this._mesh.rotation.y += Math.PI;
            this._rotationhelper.add(this._mesh);
                        
        });
    }
    
    getTarget() {
        return this._world._character;
    }

    Fire(direction, timeInSeconds) {
        if (this._stal >= this._firerate) {
            const proj = new Projectile({
                origin:this,
                speed:this._projectilespeed,
                direction:direction,
                world:this._world,
                position:this.getPosition(),
            }); 
            proj._hitbox.visible = this._hitbox.visible;
            this._stal = 0;
        }    

    }
    
    receiveHit(){
        this._life-=1;
    }
    
    _delete(){
        this._expired = true;
        this.remove(this._mesh);
        this.remove(this._rotationhelper);
        this.remove(this._hitbox);
        this._rotationhelper = null;
        this._mesh = null;
        this._collider = null;
        this._controller = null;
        this._world._scene.remove(this);
        this._hitbox = null;
    }
    
}

// a walkable platform in our world
class Walkable extends Entity {

    constructor({
        height,
        mesh,
        parent,
        world,
        position,
        encumbrance = { 
            width: 0, // along x
            depth: 0   // along z
        }
    }) {
        super({   
            height,
            mesh,
            parent,
            world, // world were entity is placed in
            position,
            encumbrance,
        }); 
        
        this._collider = new StandardCollider();
        this._controller = new PlatformController(this);
        
        this.origin=new THREE.Vector2(0,0);
        
        this._time = 0.0;
    }
    
    update(timeElapsed){
        this._time+=timeElapsed;
        this._controller.update(timeElapsed);
        const stencil = this._mesh.children[0];
        if(stencil != undefined && stencil != null){
            stencil.material.uniforms.time.value = this._time;
            stencil.material.uniforms.origin.value = this.origin;
        }
    }
}

export class Platform extends Walkable {

    constructor({
        width,
        height,
        depth,
        mesh,
        parent,
        world,
        position,
        encumbrance = { 
            width: 0, // along x
            depth: 0   // along z
        }
    }) {
        super({   
            height,
            mesh,
            parent,
            world, // world were entity is placed in
            position,
            encumbrance,
        }); 
        
        this._hitbox = new BoxHitBox({width,height,depth});
        this.add(this._hitbox);
        
        this._collider = new StandardCollider();
        this._controller = new PlatformController(this);
    }
   
}

export class MovingPlatform extends Walkable {
    constructor({
        amplitude,
        frequency,
        direction,
        radius,
        height,
        mesh,
        parent,
        world,
        position,
        encumbrance = { 
            width: 0, // along x
            depth: 0   // along z
        }
    }) {
        super({
            height,
            mesh,
            parent,
            world,
            position,
            encumbrance
        });
        
        this._amplitude = amplitude;
        this._frequency = frequency;
        this._direction = direction;

        this._hitbox = new CylinderHitBox({radius,height});
        this.add(this._hitbox);

        this._collider = new StandardCollider();
        this._controller = new MovingPlatformController(this);
        
    }
    
    update(timeElapsed) {
        this._updateSides();
        this._controller.update(timeElapsed);
    }
}

export class Obstacle extends Entity {

    constructor({        
        height,
        mesh,
        parent,
        world,
        position,
        encumbrance = { 
            width: 0, // along x
            depth: 0   // along z
        }
    }) {
        super({   
            height,
            mesh,
            parent,
            world, // world were entity is placed in
            position,
            encumbrance,
        }); 
    }
    
    update(_){
        return;
    }    
}

export class Column extends Obstacle {
    constructor({
        width,
        height,
        depth,
        mesh,
        parent,
        world,
        position,
        encumbrance = { 
            width: 0, // along x
            depth: 0   // along z
        }
    }) {
        super({   
            height,
            mesh,
            parent,
            world, // world were entity is placed in
            position,
            encumbrance,
        }); 
        this._hitbox = new BoxHitBox({width,height,depth});
        this.add(this._hitbox);        
        this._mesh.receiveShadow = true;
    }
    
    update(_){
        return;
    }
}

export class Pillar extends Obstacle {

    constructor({
        radius,
        height,
        mesh,
        parent,
        world,
        position,
        encumbrance = { 
            width: 0, // along x
            depth: 0   // along z
        }
    }) {
        super({   
            height,
            mesh,
            parent,
            world, // world were entity is placed in
            position,
            encumbrance,
        }); 
        this._hitbox = new CylinderHitBox({radius, height});
        this.add(this._hitbox);        
        this._mesh.receiveShadow = true;
    }
    
    update(_){
        return;
    }
}
