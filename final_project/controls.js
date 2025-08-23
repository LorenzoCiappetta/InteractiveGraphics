// contains controls for the game
import * as THREE from 'three'
import {boxCollision} from '/utils.js'

// controller for a character
export class CharacterController {
    constructor(character) {
        
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
                
        //this._animations{};
        //this._LoadModels();
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
            
            //console.log("normal is:",normal);
            // fall check
            if ( normal.y > 0 ) this.falling = false;
            
            this._character.translateOnAxis(normal, delta);
            ////
            let magnitude = this._velocity.dot(normal);
            let velocityAdjustment = normal.multiplyScalar(magnitude);
        
            this._velocity.sub(velocityAdjustment);
        
        }        
        
        this._FSA.update(timeInSeconds, this._controller);
        //console.log(this._FSA._current.getName());

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
        
            if (keys.a.pressed) this._velocity.x += acc.x * timeInSeconds;
            else if (keys.d.pressed) this._velocity.x -= acc.x * timeInSeconds;
            
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
                
    }
    
    _updateMovement (timeInSeconds) {
    
        // checks collisions at current frame
        /*const char_bottom = this._character.bottom;
        const floor_top = this._character._parent.top;
        
        if ((char_bottom + (this._velocity.y * timeInSeconds)) - floor_top <= 0.001) {
            const disp = this._character.position.y - char_bottom
            this._character.position.y = floor_top + disp;
        } else {
            // falling follows absolute (world) frame of reference
            this._character.position.y += (this._velocity.y * timeInSeconds);        
        }*/

        // falling follows absolute (world) frame of reference
        this._character.position.y += (this._velocity.y * timeInSeconds);
        // movement along x and z follows character frame of reference
        this._character.translateX((this._velocity.x * timeInSeconds));
        this._character.translateZ((this._velocity.z * timeInSeconds));

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
            //prevState.Exit(); //TODO:
        }
        
        const state = new this._states[name](this);
        this._current = state;
        //state.Enter(prevState); //TODO:
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

// States
class State {
    constructor(parent) {
        this._parent = parent
    }
}

class IdleState extends State {
    constructor(parent) {
        super(parent);
    }
    
    getName() {
        return 'idle';
    }
    
    update(_, input) {
        
        if (input._keys.w.pressed || 
            input._keys.a.pressed || 
            input._keys.s.pressed || 
            input._keys.d.pressed) {
            
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
   
    update(_, input) {
        
        if (input._keys.spc.pressed && !input._keys.spc.active) {
        
            input._keys.spc.active = true;
            this._parent.setState('jump');
            
        } else if (input._keys.spc.active || this._parent._controller.falling) {
        
            input._keys.spc.active = true;
            this._parent.setState('fall'); 
        
        } else if (input._keys.w.pressed || 
            input._keys.a.pressed || 
            input._keys.s.pressed || 
            input._keys.d.pressed) {
            
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
        
    setSensitivity(n) {
        this._sensitivity = n;
    }
    
    cancelMouse(){
        this._mouse.move.x = 0.0;
        this._mouse.move.y = 0.0;
    }
};

