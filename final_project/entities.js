import * as THREE from 'three';
import {boxLimits, boxCollision} from '/utils.js'
import ThirdPersonCamera from './camera.js'
import {CharacterController, DroneController} from './controls.js'
import {StandardCollider} from './collisions.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader} from 'three/addons/loaders/FBXLoader.js';

// abstract class for game objects
class HitBox extends THREE.Mesh {
    constructor({
                height,
                geometry,
                material,
                mesh,
                parent,
                world,
                position,
                encumbrance = { 
                    width: 0, // along x
                    depth: 0   // along z
                }
    }) {
        super(geometry, material);

        this._world = world;                
        this.parent = parent; // redundant but did not find better solution
        if(parent) parent.add(this);
        this.position.set(position.x,position.y,position.z);
        this._encumbrance = new THREE.Vector3(encumbrance.width, height, encumbrance.depth);                
        
        // collision detection        
        this._collider = null;
        this._collisions = [];
        
        this._updateSides();
        
        this._mesh = mesh;
        if(this._mesh) this.add(this._mesh);
        
    }
    
    hideHitBox() {
        this.visible = false;
    }
    
    showHitBox() {
        this.visible = true;
    }
    
    getDimensions(){
        return this._encumbrance;
    }
    
    getPosition(){
        if( this.parent ) {
            const p = new THREE.Vector3();
            this.getWorldPosition(p);
            return p;
        }
        
    }    
    
    getRotation(){
        if( this.parent ) {
            const q = new THREE.Quaternion();
            this.getWorldQuaternion(q);
            return q;
        }
        
    }
    
    _setMesh(mesh, position) {
        this.add(mesh);        
        
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
    
    checkCollision(entity) {
        if(this._collider) {
            const collision = this._collider.collision(this, entity);
            if(collision) this._collisions.push(collision);
            
        }
    }
      
    clearCollisions() {
        this._collisions = [];
    }
}

export class CylinderHitBox extends HitBox {
    constructor({radius,
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
        const geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
        const material = new THREE.MeshBasicMaterial({ wireframe: true });
        super({height,geometry, material, mesh, parent, world, position, encumbrance});
        this.radius = radius;
        this.height = height;
    }
    
}

export class BoxHitBox extends HitBox {
    constructor({width,
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
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshBasicMaterial({ wireframe: true });    
        super({height,geometry, material, mesh, parent, world, position, encumbrance});
        this.width = width;
        this.height = height;
        this.depth = depth;
    }
}

export class Projectile extends BoxHitBox {

}

export class Drone extends CylinderHitBox {
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
            radius,
            height,
            parent,
            world,
            mesh,
            position,
            encumbrance
        }); 
        
        this._offset = new THREE.Vector3(-0.5, 0.8, -0.1);
        this._maxammo = 50;
        this._magazine = this._maxammo;
        if(this.parent instanceof Character) this.position.set(this._offset.x,this._offset.y,this._offset.z);
        this._collider = new StandardCollider();
        this._controller = new DroneController(this);
    }
    
    update(timeElapsed) {
        this._updateSides();
        this._controller.update(timeElapsed);
    }
}

export class Character extends CylinderHitBox {

    constructor({radius,
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
            radius,
            height,
            parent,
            world,
            mesh:null,
            position,
            encumbrance
        }); 
        
        this._rotationhelper = new THREE.Object3D();
        this._rotationhelper.castShadow = false;
        this._rotationhelper.receiveShadow = false;
        this.add(this._rotationhelper);
        this._animations={};
        this.gravity = this._world.gravity
        this._camera = new ThirdPersonCamera(camera, this);
        this._controller = new CharacterController(this);
        this._collider = new StandardCollider();
        this._camera.update(0);          
        this._weapon=null;
        this._loadModel(path);

    }
    
    update(timeElapsed){
        this._updateSides();        
        this._controller.update(timeElapsed);
        this._camera.update(timeElapsed);
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
            
            this._mixer.addEventListener('finished', function(e){
                console.log(e.action._clip.name);
            });
            
        });
    }
    
    addWeapon(weapon) {
        this._weapon = weapon;
        this._rotationhelper.add(weapon);
    }
}

// a walkable platform in our world
export class Walkable extends BoxHitBox {

    constructor({width,
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
            width,
            height,
            depth,
            mesh,
            parent,
            world, // world were entity is placed in
            position,
            encumbrance,
        }); 
        this._mesh.receiveShadow = true;
    }
    
    update(_){
        return;
    }
}

export class MovingPlatform extends Walkable {

}

export class Obstacle extends BoxHitBox {

    constructor({width,
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
            width,
            height,
            depth,
            mesh,
            parent,
            world, // world were entity is placed in
            position,
            encumbrance,
        }); 
        this._mesh.receiveShadow = true;
    }
    
    update(_){
        return;
    }    
}
