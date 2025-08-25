// contains controls for the game
import * as THREE from 'three'
import {boxCollision} from '/utils.js'

// controller for drone/weapon
export class DroneController {
    constructor(drone) {
        this._drone = drone;
        this._controller = new BasicInputController();
        this._FSA = new DroneFSA(this);
        this._defaultpose = this._drone._offset;
        
        this._time = 0;
        
        this._acceleration = new THREE.Vector3(0.1, 0.1, 0.1);
        this._maxvelocity = new THREE.Vector3(0.5, 0.0, 0.5);
        
        this._velocity = new THREE.Vector3(0.0, 0.0, 0.0); 
        this._angular = new THREE.Vector3(0.0, 0.0, 0.0);
        
        this._amplitude = 0.002
        this._bobbingfreq = 1.5;
    }
    
    update(timeInSeconds) {

        if(!this._drone) {
            return;
        }

        this._time+=timeInSeconds;

        // checks collisions at previous frame
        const collisions = this._drone._collisions;
        collisions.sort((a, b) => {
            return a.overlap < b.overlap;
        });
        
        for ( const collision of collisions) {
        
            let normal = collision.normal.clone();
            let delta = collision.overlap;
           
            // fall check
            if ( normal.y > 0 ) this.falling = false;
            
            this._drone.translateOnAxis(normal, delta);
            ////
            let magnitude = this._velocity.dot(normal);
            let velocityAdjustment = normal.multiplyScalar(magnitude);
        
            this._velocity.sub(velocityAdjustment);
        
        }        

        this._FSA.update(timeInSeconds, this._controller);
        const mouse = this._controller._mouse;

        const state = this._FSA._current.getName();
        
        if(state == 'idle') {
            this._drone.position.y += this._amplitude*Math.sin(this._time*this._bobbingfreq);
            this._angular.y = 0.8*timeInSeconds;
            this._angular.x = 0.8*timeInSeconds;
        } else if (state == 'fire'){
            this._angular.y = 1.2*timeInSeconds;  
            this._angular.x = 1.2*timeInSeconds; 
            if(this._drone.position.y != this._defaultpose.y) {
                this._velocity.y += Math.sign(this._defaultpose.y-this._drone.position.y)*this._acceleration.y * timeInSeconds;
            }            
        }else {
            this._drone.position.y += (this._amplitude/2)*Math.sin(this._time*this._bobbingfreq*0.8);
        }
        
        if(this._drone.position.x != this._defaultpose.x) {
            this._velocity.x += Math.sign(this._defaultpose.x-this._drone.position.x)*this._acceleration.x * timeInSeconds;
        }

        if(this._drone.position.z != this._defaultpose.z) {
            this._velocity.z += Math.sign(this._defaultpose.z-this._drone.position.z)*this._acceleration.z * timeInSeconds;
        }

        this._updateMovement(timeInSeconds);
    }
    
    _updateMovement(timeInSeconds){
        this._drone.position.y += (this._velocity.y * timeInSeconds);
        this._drone.position.x += (this._velocity.x * timeInSeconds);
        this._drone.position.z += (this._velocity.z * timeInSeconds);
        
        this._drone.rotation.y += this._angular.y;
        this._drone.rotation.x += this._angular.x;
    }
}

// controller for a character
export class CharacterController {
    constructor(character) {
        this._animations = character._animations;

        this._character = character;

        this._controller = new BasicInputController();
        this._FSA = new CharacterFSA(this);        
        
        // All the values below are in the Character frame of reference
        
        // tweak these values to control movement
        this._walkacceleration = new THREE.Vector3(0.5, 0.0, 0.5);
        this._runacceleration = new THREE.Vector3(0.8, 0.0, 0.8);
        this._jumpacceleration = new THREE.Vector3(0.0, 6.0, 0.0); // very high impulse
        this._fallacceleration = new THREE.Vector3(0.06, this._character.gravity, 0.06);
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
    
        // Uses semi-implicit Euler integretion:
        //  v(t) is velocity at previous frame
        //  a(t) is constant in for our character
        //  dt is timeInSeconds
        //  v(t + dt) = vt + dt * a(t)
        //  s(t + dt) = [ x(t + dt), y(t + dt), z(t + dt) ] = s(t) + dt * v(t + dt)
        
        if(!this._character) {
            return;
        }
        
        // checks collisions at previous frame
        const collisions = this._character._collisions;
        collisions.sort((a, b) => {
            return a.overlap < b.overlap;
        });
        
        for ( const collision of collisions) {
        
            let normal = collision.normal.clone();
            let delta = collision.overlap;
           
            // fall check
            if ( normal.y > 0 ) this.falling = false;
            
            this._character.translateOnAxis(normal, delta);
            ////
            let magnitude = this._velocity.dot(normal);
            let velocityAdjustment = normal.multiplyScalar(magnitude);
        
            this._velocity.sub(velocityAdjustment);
        
        }        
        
        this._FSA.update(timeInSeconds, this._controller);

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

        // Control Rotation
        const Q = new THREE.Quaternion();
        const A = new THREE.Vector3(0.0, 1.0, 0.0); // yaw axis
        
        Q.setFromAxisAngle(A, mouse.move.x * timeInSeconds);
        this._character.quaternion.multiply(Q);
        
        this._character._camera.Lookat.y += mouse.move.y * timeInSeconds

        this._controller.cancelMouse();
        
        this._updateMovement(timeInSeconds);
        
        if(this._character._mixer) {
            this._character._mixer.update(timeInSeconds);
        }
                
    }
    
    _updateMovement (timeInSeconds) {

        // falling follows absolute (world) frame of reference
        this._character.position.y += (this._velocity.y * timeInSeconds);
        // movement along x and z follows character frame of reference
        const movX = this._velocity.x * timeInSeconds;
        const movZ = this._velocity.z * timeInSeconds;
        
        this._character.translateX(movX);
        this._character.translateZ(movZ);        
        
        if (!(movX==0 && movZ==0)) {
            let angle = Math.atan2(movZ, movX==0?movX:-movX) - Math.PI / 2;
            let current_angle = this._character._rotationhelper.rotation.y;
            if((angle<0)) angle += 2*Math.PI;
            if(current_angle<0) current_angle += 2*Math.PI;
                        
            if (current_angle>Math.PI && angle == 0) angle = 2*Math.PI;
            if (current_angle<Math.PI/2 && Math.round(angle*100)/1000 == Math.round(2*Math.PI*100)/1000) angle = 0;
            
            if(Math.round(current_angle*1000)/10000 == Math.round(2*Math.PI*1000)/10000) current_angle = 0;
            
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

            
            let delta_angle = Math.abs(angle - current_angle);
            
            
            if (delta_angle > Math.PI) {
                delta_angle = Math.PI;
            }

            delta_angle*=timeInSeconds;
                    
            if(clock) {

                if(Math.round(current_angle) == 0) current_angle = 2*Math.PI;
                
                if(current_angle-delta_angle < angle){
                    this._character._rotationhelper.rotation.y = angle;
                } else {
                    this._character._rotationhelper.rotation.y -= delta_angle;
                }
            } else {
                
                if(Math.round(current_angle*10)/100 == Math.round(2*Math.PI*10)/100) current_angle = 0.0;
            
                if(current_angle+delta_angle > angle){
                    this._character._rotationhelper.rotation.y = angle;
                } else {
                    this._character._rotationhelper.rotation.y += delta_angle;
                }                
            }
            
        }            

        this._character.rotation.y += this._angular.y;
        this.falling = true;
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
    
    Enter() {}
    Exit() {}
    
    update(_,input) {
        if(this._parent._controller._drone._magazine == 0) {
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
    
    Enter() {}
    Exit() {}
    
    update(_,input) {
        if(this._parent._controller._drone._magazine != 0) {
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
        document.addEventListener('mousemove', (event) => this._onMouseMove(event), false)

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
        
    }

    _onMouseUp(event) {
    
    }

    setSensitivity(n) {
        this._sensitivity = n;
    }
    
    cancelMouse(){
        this._mouse.move.x = 0.0;
        this._mouse.move.y = 0.0;
    }
};

