// finite state automata
import * as THREE from 'three';

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
        }
    }
    
    _addState(name, stateclass) {
        this._states[name] = stateclass; 
    }
};

// Character specific FSA
export class CharacterFSA extends BasicFSA {
    constructor(controller) {
        super(controller);

        this._addState('idle', IdleState);
        this._addState('walk', WalkState);
        this._addState('run', RunState);
        this._addState('jump', JumpState);
        this._addState('fall', FallState);
        
        this.setState('idle');
        
    }
};

// Weapon/Drone specific FSA
export class DroneFSA extends BasicFSA {
    constructor(controller) {
        super(controller);
        
        this._addState('idle',DroneIdleState);
        this._addState('fire', FireState);
        this._addState('empty', EmptyState);
        
        this.setState('idle');
    }
};

// Enemy specific FSA
export class EnemyFSA extends BasicFSA {
    constructor(controller) {
        super(controller);
        
        this._addState('wander',WanderState);
        this._addState('aggro',AggroState);
        this._addState('shoot',ShootState);
        
        this.setState('wander');
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

class WanderState extends State {
    constructor(parent) {
        super(parent);
    }
    
    getName() {
        return 'wander'
    }
    
    Enter() {}
    
    Exit() {}
    
    update(_,input) {
        const self = this._parent._controller._target;
        const target = this._parent._controller._target.getTarget();
        const grid = this._parent._controller._target._world;
        
        const angle = self._fov;
        
        const P1 = self.getPosition();
        const P2 = target.getPosition();
        
        const direction = P2.clone().sub(P1);
        const normal = new THREE.Vector3(0,0,1);
        const peep = this._parent._controller._direction.clone().normalize().applyQuaternion(self.getRotation());
        
        const distance = direction.length();
        if(distance > self._far){
            return;
        } else if(Math.abs(normal.angleTo(peep))>angle) {
            return;
        }

        if(distance <= self._close) {
            this._parent.setState('aggro');
        }

        const midway = P1.clone().add(P2).multiplyScalar(1/2);
        let near = grid.FindNear([midway.x, midway.z], [Math.abs(midway.x/2),Math.abs(midway.z/2)]);
        near = near.filter((client) => {
            return client.entity.constructor != self.constructor;
        });
        
        const objs = [];
        near.forEach((entry) => {
            objs.push(entry.entity.getHitBox());
        });
        
        const raycaster = new THREE.Raycaster(P1, direction.clone().normalize());
        const hit = raycaster.intersectObjects(objs,false);
        if(hit.length != 0) {
            const obj = hit[0].object;
            if (obj != target.getHitBox()) {
                return;
            } else {
                this._parent.setState('aggro');
            }
        }
        
        
    }
}

class AggroState extends State {
    constructor(parent) {
        super(parent);
        this._maxaggrotime = 25;
        this._aggrotime = 0.0;
    }
    
    getName() {
        return 'aggro'
    }
    
    Enter() {}
    
    Exit() {}
    
    update(timeElapsed, input) {
        if(this._aggrotime >= this._maxaggrotime) {
            this._aggrotime = 0.0;
            this._parent.setState('wander');
        }
        
        const self = this._parent._controller._target;
        const target = this._parent._controller._target.getTarget();
        const grid = this._parent._controller._target._world;
        
        const angle = self._fov;
        
        const P1 = self.getPosition();
        const P2 = target.getPosition();
        
        const direction = P2.clone().sub(P1);
        const normal = new THREE.Vector3(0,0,1);
        const peep = direction.clone().normalize().applyQuaternion(self.getRotation());
        
        const distance = direction.length();
        if(distance > self._far){
            this._aggrotime+=timeElapsed;
        } else if(Math.abs(normal.angleTo(peep))>angle) {
            this._aggrotime+=timeElapsed;
            return;
        }
        
        if(distance <= self._far/2) {
            this._parent.setState('shoot');
        }        

        const midway = P1.clone().add(P2).multiplyScalar(1/2);
        let near = grid.FindNear([midway.x, midway.z], [Math.abs(midway.x/2),Math.abs(midway.z/2)]);
        near = near.filter((client) => {
            return client.entity.constructor != self.constructor;
        });
        
        const objs = [];
        near.forEach((entry) => {
            objs.push(entry.entity.getHitBox());
        });
        
        const raycaster = new THREE.Raycaster(P1, direction.clone().normalize());
        const hit = raycaster.intersectObjects(objs,false);
        if(hit.length != 0) {
            const obj = hit[0].object;
            if (obj != target.getHitBox()) {
                this._aggrotime+=timeElapsed;
                return;
            }
        }        
    }
}

class ShootState extends State {

    constructor(parent) {
        super(parent);
    }
    
    getName() {
        return 'shoot'
    }
    
    Enter() {}
    
    Exit() {}
    
    update(_, input) {
        const self = this._parent._controller._target;
        const target = this._parent._controller._target.getTarget();
        const grid = this._parent._controller._target._world;
        
        const angle = self._fov;
        
        const P1 = self.getPosition();
        const P2 = target.getPosition();
        
        const direction = P2.clone().sub(P1);
        const distance = direction.length();
        if(distance > self._far/2) {
            this._parent.setState('aggro');
        }
    }
}
