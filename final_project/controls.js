// contains controls for the game

export default class BasicInputController {
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

