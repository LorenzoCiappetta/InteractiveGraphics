// contains controls for the game
import * as THREE from 'three'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import {boxCollision} from '/utils.js'

class EntityController {
    constructor(target) {
        this._target = target;
    }
}

export class PlatformController extends EntityController {
    constructor(platform) {
        super(platform)
        this._direction = null;
    }
    
    update(timeInseconds){
        this._updateCollisions();
    }
    
    _updateCollisions() {
        const collisions = this._target._collisions;
        if(collisions.length != 0) {
            
            collisions.sort((a, b) => {
                return a.overlap < b.overlap;
            });        
            
            const collision = collisions[0];    
            const normal = collision.normal.clone();
            
            if(normal.y == 0) {
                this._time = 0;
                this._prev = 0;
                let delta = collision.overlap;            
                if(this._direction) this._target.translateOnAxis(this._direction,0.2);                
            } else {
                const obj = collision.hitbox.parent;
                if(obj._canbehit) {
                   const p = obj.getPosition();
                   this._target.worldToLocal(p);
                   this._target.add(obj);
                   obj.position.copy(p)                    
                }
            }
        }            
    }
}

export class MovingPlatformController extends PlatformController{
    constructor(platform) {
        super(platform);
        this._amplitude = this._target._amplitude;
        this._frequency = this._target._frequency;
        this._direction = this._target._direction;
        this._time = 0;
        this._prev = 0;
    }
    
    update(timeInSeconds) {
        this._time+=timeInSeconds;
    
        this._updateCollisions();
        
        const sinfc = this._amplitude*Math.sin(this._time*this._frequency);
        const disp = sinfc - this._prev;
        this._prev = sinfc;
        
        this._target.position.x += this._direction.x*disp;
        this._target.position.y += this._direction.y*disp;
        this._target.position.z += this._direction.z*disp;

    }
    
}

// very simple controller for a projectile
export class ProjectileController extends EntityController{
    constructor(projectile) {
        super(projectile);
        // this._FSA // not 100% necessary for now...
        this._time = 0;
        this._lifetime = this._target._lifetime;
        this._speed = this._target._speed;
        this._direction = this._target._direction;
        
    }
    
    update(timeInSeconds) {
        this._time+=timeInSeconds;
    
        this._updateCollisions();
    
        if(this._time >= this._lifetime) {
            // trigger delete function
            this._target._delete();
            return
        }
        
        const velocity = this._direction.clone();

        velocity.multiplyScalar(this._speed);
        velocity.multiplyScalar(timeInSeconds)
        this._target.position.add(velocity);
        
    }
    
    _updateCollisions(timeInSeconds) {
        const collisions = this._target._collisions;
        if(collisions.length != 0) {
            
            collisions.sort((a, b) => {
                return a.overlap < b.overlap;
            });        
            
            const collision = collisions[0];
            if(collision.hitbox.parent._mesh) {
                
                const P1 = this._target.getPosition();
                const Q1 = this._target.getRotation();
                
                const obj = collision.hitbox.parent._mesh;                
                const normal = collision.normal.clone().applyQuaternion(Q1).negate();
                
                const origin = collision.contactPoint.clone()//.applyQuaternion(Q1).add(P1);
                this._target.localToWorld(origin);
                const raycaster = new THREE.Raycaster(origin, normal);
                
                const hits = raycaster.intersectObjects([obj]);
            
                if(hits.length!=0) {
                    console.log("hit");
                    // global position
                    const position = hits[0].point.clone();
                    const norm = hits[0].face.normal.clone();
                    const eye = position.clone();
                    // position of point on hit face
                    eye.add(norm);
                    // creates rotation matrix
                    const rotation = new THREE.Matrix4();
                    // set rotation to rotate towards point hit
                    rotation.lookAt(eye, position, THREE.Object3D.DEFAULT_UP);
                    const euler = new THREE.Euler();
                    euler.setFromRotationMatrix(rotation);
                    // projectile leaves a mark
                    const decalGeometry = new DecalGeometry(obj, position, euler, new THREE.Vector3(1,1,1));
                    const decalMaterial = new THREE.MeshStandardMaterial({
                        color: 0xFF0000,
                        depthTest: true,
                        depthWrite: false,
                        polygonOffset: true, // to prevent z-fighting
                        polygonOffsetFactor: -4,
                    });
                    
                    const decal = new THREE.Mesh(decalGeometry, decalMaterial);
                    decal.receiveShadow = true;
                    
                    obj.worldToLocal(decal.position);
                    let q = new THREE.Quaternion().copy(obj.quaternion).invert();
                    decal.quaternion.multiply(q)
                    obj.parent.add(decal);
                    this._target._world.addEphemeral(decal);     

                }
            }
            this._target._delete();
            return
        }    
    }

}

// controller for drone/weapon
export class DroneController extends EntityController{
    constructor(drone) {
        super(drone);
        this._controller = new BasicInputController();
        this._FSA = new DroneFSA(this);
        this._defaultpose = this._target._offset;
        this._magazine = this._target._magazine;
        
        this._time = 0;
        
        this._acceleration = new THREE.Vector3(0.1, 0.1, 0.1);
        this._maxvelocity = new THREE.Vector3(0.5, 0.0, 0.5);
        
        this._velocity = new THREE.Vector3(0.0, 0.0, 0.0); 
        this._angular = new THREE.Vector3(0.0, 0.0, 0.0);
        
        this._amplitude = 0.1
        this._bobbingfreq = 1;
        this._prev = 0;
    }
    
    update(timeInSeconds) {

        if(!this._target) {
            return;
        }

        this._magazine = this._target._magazine;

        this._updateCollisions(timeInSeconds)

        this._FSA.update(timeInSeconds, this._controller);

        const state = this._FSA._current.getName();
        
        if(state == 'idle') {
            this._time+=timeInSeconds;
            const sinfc = this._amplitude*Math.sin(this._time*this._bobbingfreq);
            const disp = sinfc - this._prev;
            this._prev = sinfc;
                    
            this._target.position.y += disp;
            this._angular.y = 0.8*timeInSeconds;
            this._angular.x = 0.8*timeInSeconds;
        } else if (state == 'fire'){
            this._angular.y = 1.2*timeInSeconds;  
            this._angular.x = 1.2*timeInSeconds; 
            
            // check if crosshair is pointing at object
            const raycaster = new THREE.Raycaster();
            const pos = {x:0, y:0}; // crosshair is at center of screen
            
            raycaster.setFromCamera(pos, this._target._world._camera);
            const dir = raycaster.ray.direction.clone(); // it is a normal
            dir.multiplyScalar(100); 
            const p = this._target.getPosition();
            dir.sub(p).normalize();
            this._target.Fire(dir, timeInSeconds);
            
        }else {
            this._time+=timeInSeconds;
            const sinfc = (this._amplitude/2)*Math.sin(this._time*this._bobbingfreq*0.8);
            const disp = sinfc - this._prev;
            this._prev = sinfc;
            
            this._target.position.y += disp;
        }
        
        if(this._target.position.x != this._defaultpose.x) {
            this._velocity.x += Math.sign(this._defaultpose.x-this._target.position.x)*this._acceleration.x * timeInSeconds;
        }

        if(this._target.position.z != this._defaultpose.z) {
            this._velocity.z += Math.sign(this._defaultpose.z-this._target.position.z)*this._acceleration.z * timeInSeconds;
        }

        this._updateMovement(timeInSeconds);
    }
        
    _updateCollisions(timeInSeconds) {
        // checks collisions at previous frame
        const collisions = this._target._collisions;
        collisions.sort((a, b) => {
            return a.overlap < b.overlap;
        });
        
        for ( const collision of collisions) {
        
            let normal = collision.normal.clone();
            let delta = collision.overlap;
            
            this._target.translateOnAxis(normal, delta);
            ////
            let magnitude = this._velocity.dot(normal);
            let velocityAdjustment = normal.multiplyScalar(magnitude);
        
            this._velocity.sub(velocityAdjustment);
        
        }    
    }
        
    _updateMovement(timeInSeconds) {
        this._target.position.y += (this._velocity.y * timeInSeconds);
        this._target.position.x += (this._velocity.x * timeInSeconds);
        this._target.position.z += (this._velocity.z * timeInSeconds);
        
        this._target._rotationhelper.rotation.y += this._angular.y;
        this._target._rotationhelper.rotation.x += this._angular.x;
    }
}

// controller for a character
export class CharacterController extends EntityController{
    constructor(character) {
        super(character);
        this._animations = character._animations;

        this._target = character;

        this._controller = new BasicInputController();
        this._FSA = new CharacterFSA(this);
        
        // All the values below are in the Character frame of reference
        
        // tweak these values to control movement
        this._walkacceleration = new THREE.Vector3(0.5, 0.0, 0.5);
        this._runacceleration = new THREE.Vector3(0.8, 0.0, 0.8);
        this._jumpacceleration = new THREE.Vector3(0.0, 6.0, 0.0); // very high impulse
        this._fallacceleration = new THREE.Vector3(0.06, this._target.gravity, 0.06);
        this._decceleration = new THREE.Vector3(-0.07, 0.0, -0.07); // to prevent abrupt change in velocity
        
        // max velocity reached by character
        this._maxwalkvelocity = new THREE.Vector3(1.8, 5.0, 2.0);
        this._maxrunvelocity = new THREE.Vector3(3.0, 5.0, 4.0);
        
        // velocity of character
        this._velocity = new THREE.Vector3(0.0, 0.0, 0.0);
        this._angular = new THREE.Vector3(0.0, 0.0, 0.0);
        
        this.falling = true;                
    }
    
    update(timeInSeconds) {
        
        if(!this._target) {
            return;
        }

        // checks for collsions
        this._updateCollisions(timeInSeconds); 
        // updates state of character
        this._FSA.update(timeInSeconds, this._controller);
        
        // updates velocity of character based on state and input
        this._updateVelocity(timeInSeconds);
        // updates camera position based on mouse movement
        this._updateCamera(timeInSeconds);
        // updates posiiton based on computed velocity
        this._updateMovement(timeInSeconds);

        

        const keys = this._controller._keys;
        const mouse = this._controller._mouse;
        
        // updates animation mixer
        if(this._target._mixer) {
            this._target._mixer.update(timeInSeconds);
        }
                
    }
    
    _updateCollisions(timeInSeconds) {
    
        // checks collisions at current frame
        const collisions = this._target._collisions;
        // sorts collisions to deal from smallest to biggest
        collisions.sort((a, b) => {
            return a.overlap < b.overlap;
        });

        for ( const collision of collisions) {
        
            let normal = collision.normal.clone();
            let delta = collision.overlap;
           
            // fall check
            
            if ( normal.y > 0) this.falling = false;   

            // updates character velocity to get away from collided object in direction of collision normal
            this._target.translateOnAxis(normal, delta);
    
            let magnitude = this._velocity.dot(normal);
            let velocityAdjustment = normal.multiplyScalar(magnitude);
        
            this._velocity.sub(velocityAdjustment);        
            
        }    
    }
    
    _updateCamera(timeInSeconds) {
        const keys = this._controller._keys;
        const mouse = this._controller._mouse;    
    
        // Control Rotation
        const Q = new THREE.Quaternion();
        const A = new THREE.Vector3(0.0, 1.0, 0.0); // yaw axis
        
        Q.setFromAxisAngle(A, mouse.move.x * timeInSeconds);
        this._target.quaternion.multiply(Q);
        
        this._target._camera.id_Lookat.y += mouse.move.y * timeInSeconds

        this._controller.cancelMouse();    
    }
    
    _updateVelocity(timeInSeconds) {
        // Uses semi-implicit Euler integretion:
        //  v(t) is velocity at previous frame
        //  a(t) is constant in for our character
        //  dt is timeInSeconds
        //  v(t + dt) = vt + dt * a(t)
        //  s(t + dt) = [ x(t + dt), y(t + dt), z(t + dt) ] = s(t) + dt * v(t + dt)    
    
        const keys = this._controller._keys;
        const mouse = this._controller._mouse;

        if (this._FSA._current.getName() == 'idle') {
            
            this._velocity.set(0.0,0.0,0.0);
            
        } else {
            
            let acc = new THREE.Vector3();
            let m_v = new THREE.Vector3();
            
            if ( this._FSA._current.getName() == 'fall') {
                
                acc.copy(this._fallacceleration);
                if ( keys.shft.pressed ) m_v.copy(this._maxrunvelocity);
                else m_v.copy(this._maxwalkvelocity);
            
            } else {
                
                this._velocity.y = 0;
                
                if ( keys.shft.pressed ) {
                    acc.copy(this._runacceleration);
                    m_v.copy(this._maxrunvelocity);
                } else {
                    acc.copy(this._walkacceleration);   
                    m_v.copy(this._maxwalkvelocity);
                }                
            
            }
            
            // computing velocities
            if ( this._FSA._current.getName() != 'fall' ) {
                this._velocity.y = 0.0;
            }
            
            if ( this._FSA._current.getName() == 'jump' ) {
                this._velocity.y += this._jumpacceleration.y; // * timeInSeconds; // jump is instantaneus impulse thus must not consider elapsed time
            }
        
            this._velocity.y += acc.y * timeInSeconds;
            
        
            if (keys.w.pressed) this._velocity.z += acc.z * timeInSeconds;
            else if (keys.s.pressed) this._velocity.z -= acc.z * timeInSeconds;
            else this._velocity.z = 0;
        
            if (keys.a.pressed) this._velocity.x += acc.x * timeInSeconds;
            else if (keys.d.pressed) this._velocity.x -= acc.x * timeInSeconds;
            else this._velocity.x = 0;
            
            // clamping velocities (with decelleration)
            if ( this._velocity.x > m_v.x) this._velocity.x += this._decceleration.x;
            else if ( this._velocity.x < -m_v.x ) this._velocity.x -= this._decceleration.x;
            
            if ( this._velocity.z > m_v.z) this._velocity.z += this._decceleration.z;
            else if ( this._velocity.z < -m_v.z ) this._velocity.z -= this._decceleration.z; 
            
            if ( this._velocity.y < -m_v.y) this._velocity.y = -m_v.y; // no need to limit up wards velocity while falling
        
        }    
    }
    
    _updateMovement (timeInSeconds) {

        // falling follows absolute (world) frame of reference
        this._target.position.y += (this._velocity.y * timeInSeconds);
        // movement along x and z follows character frame of reference
        const movX = this._velocity.x * timeInSeconds;
        const movZ = this._velocity.z * timeInSeconds;
        
        // apply translationale movement
        this._target.translateX(movX);
        this._target.translateZ(movZ);        
        
        // make character rotate in its walking direction
        if (!(movX==0 && movZ==0)) {
        
            // compute angles fro 0 to 2pi
            let angle = Math.atan2(movZ, movX==0?movX:-movX) - Math.PI / 2;
            let current_angle = this._target._rotationhelper.rotation.y;
            if((angle<0)) angle += 2*Math.PI;
            if(current_angle<0) current_angle += 2*Math.PI;
                        
            if (current_angle>Math.PI && angle == 0) angle = 2*Math.PI;
            if (current_angle<Math.PI/2 && Math.round(angle*100)/1000 == Math.round(2*Math.PI*100)/1000) angle = 0;
            
            if(Math.round(current_angle*1000)/10000 == Math.round(2*Math.PI*1000)/10000) current_angle = 0;
            
            // check if closest transition is clock or counter-clock wise
            let clock = false
            if (
                (angle > 0 && current_angle>0 && angle <= Math.PI && current_angle <= Math.PI) || 
                (angle < 2*Math.PI && current_angle<2*Math.PI && angle > Math.PI && current_angle > Math.PI)
            ) {                
                clock = current_angle > angle;

            } else if (
                (angle > 0 && current_angle<2*Math.PI && angle <= Math.PI && current_angle > Math.PI) || 
                (angle < 2*Math.PI && current_angle>0 && angle > Math.PI && current_angle <= Math.PI)
            ) {                
                clock = (current_angle-Math.PI) < angle;

            } else if (angle == 0) {
                clock = current_angle < Math.PI;
            } else if (current_angle == 0) {
                clock = angle < Math.PI;
            }

            // compute angle of rotation
            let delta_angle = Math.abs(angle - current_angle);
            
            // fix rotation at rad/s            
            if (delta_angle > Math.PI) {
                delta_angle = Math.PI;
            }

            delta_angle*=timeInSeconds;
                    
            // apply delta clock or counter-clock wise
            if(clock) {

                if(Math.round(current_angle) == 0) current_angle = 2*Math.PI;
                
                if(current_angle-delta_angle < angle){
                    this._target._rotationhelper.rotation.y = angle;
                } else {
                    this._target._rotationhelper.rotation.y -= delta_angle;
                }
            } else {
                
                if(Math.round(current_angle*10)/100 == Math.round(2*Math.PI*10)/100) current_angle = 0.0;
            
                if(current_angle+delta_angle > angle){
                    this._target._rotationhelper.rotation.y = angle;
                } else {
                    this._target._rotationhelper.rotation.y += delta_angle;
                }                
            }
            
        }            

        this._target.rotation.y += this._angular.y;

        /*const floor = this._target.parent.position.y+this._target.parent._hitbox.height/2;
        const bottom = this._target.position.y-this._target._hitbox.height/2        
        if(bottom <= floor+0.01) this.falling=false;
        else */this.falling = true;
    }
};

// finite state automata
class BasicFSA {
    constructor(controller) {
    
        this._controller = controller
        this._states = {};
        this._current = null;
        
    }
    
    setState(name) {
        const prevState = this._current;
        
        if (prevState) {
            if (prevState.getName() == name) {
                return;
            }
            prevState.Exit();
        }
        
        const state = new this._states[name](this);
        this._current = state;
        state.Enter(prevState);
    }
    
    update(timeElapsed, input) {
        if (this._current) {
            this._current.update(timeElapsed, input);
        } else {
            this.setState('idle');
        }
        
    }
    
    _addState(name, stateclass) {
        this._states[name] = stateclass; 
    }
};

// Character specific FSA
class CharacterFSA extends BasicFSA {
    constructor(controller) {
        super(controller);

        this._addState('idle', IdleState);
        this._addState('walk', WalkState);
        this._addState('run', RunState);
        this._addState('jump', JumpState);
        this._addState('fall', FallState);
        
    }
};

// Character/Drone specific FSA
class DroneFSA extends BasicFSA {
    constructor(controller) {
        super(controller);
        
        this._addState('idle',DroneIdleState);
        this._addState('fire', FireState);
        this._addState('empty', EmptyState);
    }
}

// States
class State {
    constructor(parent) {
        this._parent = parent
    }
    
    Enter() {}
    Exit() {}
    Update() {}
}

class IdleState extends State {
    constructor(parent) {
        super(parent);
    }
    
    getName() {
        return 'idle';
    }
    
    Enter(prevState) {
        if(!this._parent._controller._animations['idle']) return;
        const idleAction = this._parent._controller._animations['idle'].action
        if (prevState) {
            const prevAction = this._parent._controller._animations[prevState.getName()].action;
            idleAction.time = 0.0;
            idleAction.enabled = true;
            idleAction.setEffectiveTimeScale(1.0);
            idleAction.crossFadeFrom(prevAction, 0.5, true);
            idleAction.play();
        } else {
            idleAction.play();
        }
    }
    
    Exit(){
    
    }
    
    update(_, input) {
    
        const condW = input._keys.w.pressed;
        const condA = input._keys.a.pressed;
        const condS = input._keys.s.pressed;
        const condD = input._keys.d.pressed;        
        
        if (
            condW || 
            condA || 
            condS || 
            condD
        ) {
                        
            if(input._keys.shft.pressed) {
                this._parent.setState('run');
            } else {
                this._parent.setState('walk');
            }
        } else if (input._keys.spc.pressed && !input._keys.spc.active) {
            input._keys.spc.active = true;
            this._parent.setState('jump');
        } else if (input._keys.spc.active || this._parent._controller.falling) {
            input._keys.spc.active = true;
            this._parent.setState('fall'); 
        }
    }
}

class WalkState extends State {
    constructor(parent) {
        super(parent);
    }
    
    getName() {
        return 'walk';
    }
   
    Enter(prevState) {
        if(!this._parent._controller._animations['walk']) return;
        const curAction = this._parent._controller._animations['walk'].action;
        if(prevState) {
            const prevAction = this._parent._controller._animations[prevState.getName()].action;
            
            curAction.enabled = true;
            
            if (prevState.getName() == 'run') {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ration;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }
            
            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } else {
            curAction.play();
        }
    }
    
    Exit() {
    
    }
    
    update(_, input) {
        
        const condW = input._keys.w.pressed;
        const condA = input._keys.a.pressed;
        const condS = input._keys.s.pressed;
        const condD = input._keys.d.pressed;
        
        if (input._keys.spc.pressed && !input._keys.spc.active) {
        
            input._keys.spc.active = true;
            this._parent.setState('jump');
            
        } else if (input._keys.spc.active || this._parent._controller.falling) {
        
            input._keys.spc.active = true;
            this._parent.setState('fall'); 
        
        } else if (
            condW || 
            condA || 
            condS || 
            condD
        ) {
            

            
            if(input._keys.shft.pressed) {
                this._parent.setState('run');
            } else {
                return;
            }
            
        } else {
        
            this._parent.setState('idle');
        
        }
    }
}

class RunState extends State {
    constructor(parent) {
        super(parent);
    }
    
    getName() {
        return 'run';
    }
    
    Enter(prevState) {
        if(!this._parent._controller._animations['run']) return;
        const curAction = this._parent._controller._animations['run'].action;
        if (prevState) {
            const prevAction = this._parent._controller._animations[prevState.getName()].action;
            
            curAction.enabled = true;
            
            if ( prevState.getName() == 'walk' ) {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }
            
            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } else {
            curAction.play();
        }
    }
    
    Exit(){
    
    }

    update(_, input) {
        
        if (input._keys.spc.pressed && !input._keys.spc.active) {
        
            input._keys.spc.active = true;
            this._parent.setState('jump');
        
        } else if (input._keys.spc.active || this._parent._controller.falling) {
            
            this._parent.setState('fall');
        
        } else if (input._keys.w.pressed || 
            
            input._keys.a.pressed || 
            input._keys.s.pressed || 
            input._keys.d.pressed) {
            
            if(input._keys.shft.pressed) {
                return;
            } else {
                this._parent.setState('run');
            }
        
        }  else {
            
            this._parent.setState('idle');
        
        }
    }
}

class JumpState extends State {
    constructor(parent) {
        super(parent);
    }
    
    getName() {
        return 'jump';
    }

    Enter(prevState) {
        if(!this._parent._controller._animations['jump']) return;
        const curAction = this._parent._controller._animations['jump'].action;
        curAction.loop = THREE.LoopOnce;
        //curAction.startAt(0.8);
        if (prevState) {
            const prevAction = this._parent._controller._animations[prevState.getName()].action;
            
            curAction.enabled = true;
            
            if ( prevState.getName() == 'walk' || prevState.getName() == 'run'  ) {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }
            
            curAction.crossFadeFrom(prevAction, 0.5, true);            
            curAction.play();
            curAction.reset();
        } else {
            
            curAction.play();
            curAction.reset();
        }    
    
    }
    
    Exit() {
    
    }

    update(_, input) {
        
        this._parent.setState('fall'); 
        
    }
}

class FallState extends State {
    constructor(parent) {
        super(parent);
    }
    
    getName() {
        return 'fall';
    }
    
    Enter(prevState) {
        if(!this._parent._controller._animations['fall']) return;
        const curAction = this._parent._controller._animations['fall'].action;
        if (prevState) {
            const prevAction = this._parent._controller._animations[prevState.getName()].action;
            
            curAction.enabled = true;
            
            if ( prevState.getName() == 'walk' ) {
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }
            
            curAction.crossFadeFrom(prevAction, 0.5, true);
            curAction.play();
        } else {
            curAction.play();
        }    
    }
    
    Exit() {
    
    }

    update(_, input) {
            
        if(!this._parent._controller.falling) {
            input._keys.spc.active = false;
            if (input._keys.w.pressed || 
                input._keys.a.pressed || 
                input._keys.s.pressed || 
                input._keys.d.pressed) {
            
                if(input._keys.shft.pressed) {
                    this._parent.setState('run');
                } else {
                    this._parent.setState('walk');
                }
            } else {
                this._parent.setState('idle');
            }
        }
    }
};

class DroneIdleState extends State {
    constructor(parent) {
        super(parent);
    }   
    
    getName() {
        return 'idle';
    }        
    
    Enter() {}
    Exit() {}
    
    update(_, input) {
        if(input._mouse.lc.pressed) {
            this._parent.setState('fire');
        }
    }
}

class FireState extends State {
    constructor(parent) {
        super(parent);
    }
    
    getName() {
        return 'fire';
    }    
    
    Enter() {
        this._parent._controller._target._mesh.material.color.setHex(0xff0000);
    }
    Exit() {}
    
    update(_,input) {
        if(this._parent._controller._magazine == 0) {
            this._parent.setState('empty');
        } else if (!input._mouse.lc.pressed) {
            this._parent.setState('idle');
        }
         
    }
}

class EmptyState extends State {
    constructor(parent) {
        super(parent);
    }
    
    getName() {
        return 'empty';
    }    
    
    Enter() {
        this._parent._controller._target._mesh.material.color.setHex(0x42c5f5);
    
    }
    Exit() {}
    
    update(_,input) {
        if(this._parent._controller._magazine != 0) {
            this._parent.setState('idle');
        }
    }
}

// Controlls
class BasicInputController {
    constructor(fov=60) {
        this._sensitivity = 60.0;
        this._fov = fov;
    
        this._keys = {
            w: {
                pressed: false
            },
            a: {
                pressed: false
            },
            s: {
                pressed: false
            },
            d: {
                pressed: false
            },
            spc: {
                pressed: false,
                active: false,
                waiting: false,
            },
            shft: {
                pressed: false
            },
            ar: {
                pressed: false            
            },
            al: {
                pressed: false            
            }
        };
        
        this._mouse = {
            move: {
                x: 0.0,
                y: 0.0,
            },
            rc: {
                pressed:false,
            },
            lc: {
                pressed:false,
            }
        }
          
        document.addEventListener('keydown', (event) => this._onKeyDown(event), false);
        document.addEventListener('keyup', (event) => this._onKeyUp(event), false);  
        document.addEventListener('mousemove', (event) => this._onMouseMove(event), false);
        document.addEventListener('mousedown', (event) => this._onMouseDown(event), false);
        document.addEventListener('mouseup', (event) => this._onMouseUp(event), false);
    }
    
    _onKeyDown(event) {
        this._keys.shft.pressed = event.shiftKey;

        switch(event.code) {
            case 'KeyA':
                this._keys.a.pressed = true;
                break;
            case 'KeyD':
                this._keys.d.pressed = true;
                break;
            case 'KeyS':
                this._keys.s.pressed = true;
                break;  
            case 'KeyW':
                this._keys.w.pressed = true;
                break;  
            case 'Space':
                if (!this._keys.spc.waiting) this._keys.spc.pressed = true;
                else this._keys.spc.pressed = false;
                this._keys.spc.waiting = true;
                break;
            case 'ArrowLeft':
                this._keys.al.pressed = true;
                break;
            case 'ArrowRight':
                this._keys.ar.pressed = true;
                break;
            default:
                break;
        }
        
    }
    
    _onKeyUp(event){
        this._keys.shft.pressed = event.shiftKey;

        switch(event.code) {
            case 'KeyA':
                this._keys.a.pressed = false;
                break;
            case 'KeyD':
                this._keys.d.pressed = false;
                break;
            case 'KeyS':
                this._keys.s.pressed = false;
                break;
            case 'KeyW':
                this._keys.w.pressed = false;
                break;
            case 'Space':
                this._keys.spc.pressed = false;
                this._keys.spc.waiting = false;
                break;
            case 'ArrowLeft':
                this._keys.al.pressed = false;
                break;
            case 'ArrowRight':
                this._keys.ar.pressed = false;         
                break;
            default:
                break;
        } 
    }

    _onMouseMove(event) {
        const w = window.innerWidth;
        const h = window.innerHeight; 
        
        const fov = this._fov; //TODO: make fov a parameter
        const coeff = (Math.PI / 180)
        
        let x = -event.movementX;
        let y = -event.movementY;
        
        x /= w;
        x *= fov;
        y /= h;
        y *= fov;
        this._mouse.move.x = this._sensitivity * x * coeff;
        this._mouse.move.y = this._sensitivity * y * coeff;
    }

    _onMouseDown(event) {
        switch(event.button) {
            case 0: 
                this._mouse.lc.pressed = true;
                break;
            case 2:
                this._mouse.rc.pressed = true;
        }
    }

    _onMouseUp(event) {
        switch(event.button) {
            case 0: 
                this._mouse.lc.pressed = false;
                break;
            case 2:
                this._mouse.rc.pressed = false;
        }    
    }

    setSensitivity(n) {
        this._sensitivity = n;
    }
    
    cancelMouse(){
        this._mouse.move.x = 0.0;
        this._mouse.move.y = 0.0;
    }
};

