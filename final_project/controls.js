// contains controls for the game
export class BasicController {
    constructor() {
        this._sensitivity = 1;
    
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
                active: false
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
                console.log("pressed spacebar")
                if(this._keys.spc.pressed == false) this._keys.spc.active = true;
                this._keys.spc.pressed = true;
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
        // TODO: change this to add a velocity based on offset from center
        const w = window.innerWidth;
        const h = window.innerHeight; 
        
        const fov = 60; //TODO: make fov a parameter
        const coeff = (Math.PI / 180)
        
        let x = -event.movementX;
        let y = -event.movementY;
        
        x /= w;
        x *= fov;
        y /= h;
        y *= fov;
        this._mouse.move.x = x * coeff;
        this._mouse.move.y = y * coeff;
    }
}

export class BasicFSA {
    constructor(controller) {
    
        this._controller = controller
        this._STATES = Object.freeze({ // trying to replicate C's enum types
            JUMPING:   Symbol("jumping"),
            IDLE:  Symbol("idle"),
            WALKING: Symbol("walking"),
            RUNNING: Symbol("running"),
            FALLING: Symbol("falling")
        });
        
        this._current = this._STATES.IDLE;
        
    }
    
    _transition(){
        switch(this._current){
            case this._STATES.IDLE:
                break;
            case this._STATES.WALKING:
                break;
            case this._STATES.RUNNING:
                break;
            case this._STATES.JUMPING:
                break;
            case this._STATES.FALLING:
                break;                
        }
    }
}
