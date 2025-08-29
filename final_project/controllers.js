// contains classes which make up the behaviours of entities
import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import BasicInputController from './controls.js';
import {CharacterFSA, DroneFSA, EnemyFSA} from './automata.js';
import {randRange} from './utils.js'
import {Character, Enemy, Projectile, Platform, MovingPlatform, Obstacle} from './entities.js';
import {CylinderHitBox, BoxHitBox} from './collisions.js';
import {decal_VS, decal_FS} from './shaders.js'

class EntityController {
    constructor(target) {
        this._target = target;
    }
};

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
        
            if( collision.hitbox.parent instanceof Projectile ) continue;
        
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
        this.falling = true;
    }
};

export class EnemyController extends EntityController {
    constructor(character) {
        super(character);
        this._animations = character._animations;

        this._target = character;

        this._chargetime = 1 + (Math.random()/5);
        this._time = this._chargetime;

        this._controller = new BasicInputController();
        this._FSA = new EnemyFSA(this);
                
        this._wanderacceleration = 0.5; 
        this._aggroacceleration = 0.9;
        // max velocity reached by character
        this._maxwandersteering = 3;
        this._maxwanderspeed = 2.2;
        
        this._maxaggrosteering = 4;
        this._maxaggrospeed = 3;
        
        // velocity of character
        this._velocity = new THREE.Vector3(0.0, 0.0, 0.0);
        this._direction = new THREE.Vector3(
            randRange(-1, 1),
            0,
            randRange(-1, 1)
        );
        
        this._wanderangle = 0,
        this._origin = this._target.origin;
        
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
        
        const p = this._target.getPosition();
        let local = this._target._world.FindNear(
            [p.x,p.z],
            [5,5] // check any object in a 5x5 square around character 
        );
        
        local = local.filter((client) => {
            return client.entity != this._target;
        });
                        
        // implements boids movement
        this._applySteering(timeInSeconds, local);
        
        this._target.position.add(this._velocity.clone().multiplyScalar(timeInSeconds));
        
        const m = new THREE.Matrix4();
        m.lookAt(
            new THREE.Vector3(0,0,0),
            this._direction,
            new THREE.Vector3(0,1,0),
        )
        this._target._rotationhelper.quaternion.setFromRotationMatrix(m);
        
    }

    _updateCollisions(timeInSeconds) {
    
        // checks collisions at current frame
        const collisions = this._target._collisions;
        // sorts collisions to deal from smallest to biggest
        collisions.sort((a, b) => {
            return a.overlap < b.overlap;
        });

        for ( const collision of collisions) {
            if( collision.hitbox.parent instanceof Projectile ) {
                this._target.receiveHit();
                continue;
            }
            let normal = collision.normal.clone();
            let delta = collision.overlap;
           
            // updates character velocity to get away from collided object in direction of collision normal
            this._target.translateOnAxis(normal, delta);
    
            let magnitude = this._velocity.dot(normal);
            let velocityAdjustment = normal.multiplyScalar(magnitude);
            if(normal.y != 0) velocityAdjustment.y -= 5;
            this._velocity.sub(velocityAdjustment);        
            
        }    
    }

    _applySteering(timeInSeconds,local) {
        const state = this._FSA._current.getName();
        
        if(state == 'shoot') {
            this._time += timeInSeconds;
            if(this._time>=this._chargetime) {
                const P1 = this._target.getPosition();
                const P2 = this._target.getTarget().getPosition();
                P2.y+=1;
                const dir = P2.clone().sub(P1).normalize();
                this._target.Fire(dir, timeInSeconds);
                this._time = 0;
            }
        } else {
            this._time = this._chargetime;
        }
        
        const forces = [];
        
        let max_speed = 0;
        let max_steering = 0;
        let acc = 0;
        
        if(state == 'aggro' || state == 'shoot') {
            const new_origin = this._target.getTarget().getPosition();
            new_origin.y+=1;
            forces.push(this._applySeek(new_origin));
            max_speed = this._maxaggrospeed;
            max_steering = this._maxaggrosteering;
            acc = this._aggroacceleration;
        } else {
            forces.push(
                this._applySeek(this._origin),
                this._applyWander()
            );
            max_speed = this._maxwanderspeed;
            max_steering = this.maxwandersteering;  
            acc = this._wanderacceleration;
        }

        forces.push(this._applySeparation(local));        
        
        // next functions only applied with other enemies
        local = local.filter((client) => {
            return client.entity instanceof(Enemy);
        });
        
        forces.push(
            this._applyAlignment(local),
            this._applyCohesion(local),
            this._applySeparation(local)
        );
                    
        const steering = new THREE.Vector3(0,0,0);
        for (const f of forces) {
            steering.add(f);
        }
                
        steering.multiplyScalar(acc*timeInSeconds);
        if (steering.length() > max_steering) {
            steering.setLength(max_steering);
        }
        
        this._velocity.add(steering);        
        if (this._velocity.length() > max_speed) {
            this._velocity.setLength(max_speed);
        }
        
        this._direction = this._velocity.clone().normalize();
    }
    
    _applyWander() {
        const angle = randRange(-2 * Math.PI, 2 * Math.PI);

        this._wanderangle += 0.1 * angle;
        const randompoint = new THREE.Vector3(
            Math.cos(this._wanderangle),
            0,
            Math.sin(this._wanderangle)
        );
        
        const pointahead = this._direction.clone();
        pointahead.multiplyScalar(0.5);
        pointahead.add(randompoint);
        pointahead.normalize();
        return pointahead.multiplyScalar(3);
    }
    
    _applySeparation(local) {
        if (local.length == 0) {
            return new THREE.Vector3(0,0,0);
        }
        
        const forcevector = new THREE.Vector3(0,0,0);
        for (let c of local) {
            const e = c.entity;
            if( e instanceof Projectile ) continue;
            
            const radius1 = this._target.getHitBox().radius;
            let radius2 = 0;
            if (e._hitbox.radius != undefined) {
                radius2=e.getHitBox().radius;
            } else {
                radius2 = e.getHitBox().width>e.getHitBox().depth?e.getHitBox().width:e.getHitBox().depth;
            }   
            
            const P1 = this._target.getPosition();
            const h1 = this._target.getHitBox().height;
            const P2 = e.getPosition();
            const h2 = e.getHitBox().height;
            
            const condition1 = (P1.y + h1/2 < P2.y - h2/2); //below
            const condition2 = (P1.y - h1/2 > P2.y + h2/2); //above
            
            if( condition1 || condition2) {
                const diff = P2.y - h2/2 -  P1.y + h1/2
                if(Math.abs(diff) < 0.5) {
                    forcevector.y = 10*diff;
                }
                
                return forcevector;
            }            
                        
            const dis = Math.max(
                e.getPosition().distanceTo(this._target.getPosition()) - 1.5 * (radius1 + radius2),
                0.001
            );
            
            const dir = new THREE.Vector3().subVectors(
                this._target.getPosition(), e.getPosition()
            );
            const multiplier = (20 / dis) * (radius1+radius2);
            dir.normalize();
            forcevector.add(dir.multiplyScalar(multiplier));

        }
        return forcevector;
    };

    _applyAlignment(local) {
        const forcevector = new THREE.Vector3(0,0,0);
        
        for (let c of local) {
            const e = c.entity;
            const dir = e._controller._direction;
            forcevector.add(dir);
        }
        
        forcevector.normalize();
        forcevector.multiplyScalar(10);
        
        return forcevector;
    }
    
    _applyCohesion(local) {
        const forcevector = new THREE.Vector3(0,0,0);
        
        if (local.length == 0) {
            return forcevector;
        }
        
        const avpos = new THREE.Vector3(0,0,0);
        for (let c of local) {
            const e = c.entity;
            avpos.add(e.getPosition());
        }
        
        avpos.multiplyScalar(1/local.length);
        
        const avdir = avpos.clone().sub(this._target.getPosition());
        avdir.normalize();
        avdir.multiplyScalar(10);
        
        return avdir;
    }
    
    _applySeek(destination) {
        const dis = Math.max(0,(this._target.getPosition().distanceTo(destination) - 3) );        
        const dir = destination.clone().sub(this._target.getPosition());
        dir.normalize();
        const forcevector = dir.multiplyScalar(10*dis);
        return forcevector;
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
            
            for (let collision of collisions) {    
                const normal = collision.normal.clone();
                const obj = collision.hitbox.parent;
                if(normal.y == 0) {
                    if(obj instanceof Platform || obj instanceof Obstacle || obj instanceof MovingPlatform) {                        
                        this._time = 0;
                        this._prev = 0;
                        let delta = collision.overlap;            
                        if(this._direction) this._target.translateOnAxis(this._direction,0.2);   
                    }
                } else {
                    if(obj instanceof Character) {    
                        const o = collision.contactPoint;
                        this._target.origin.set(o.x,-o.z);
                    
                       const p = obj.getPosition();
                       this._target.worldToLocal(p);
                       this._target.add(obj);
                       obj.position.copy(p)                    
                    }
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
    
        const c = this._updateCollisions();
        if(c || this._time >= this._lifetime) {
            this._target._world.addToDeleteList(this._target);//_delete();
            return;
        }
        
        const velocity = this._direction.clone();

        velocity.multiplyScalar(this._speed);
        velocity.multiplyScalar(timeInSeconds)
        this._target.position.add(velocity);
                
        const v = velocity.clone().negate().multiplyScalar(10);        
        this._target._trail_particles.addParticles(timeInSeconds,new THREE.Vector3(0,0,0),v);
        
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
                
                const main = collision.hitbox.parent;
                const obj = main._mesh;
                if(main == this._target._world._character || main.constructor == this._target.parent.constructor || main instanceof Enemy) {
                    return true;
                }
                
                const normal = collision.normal.clone().applyQuaternion(Q1).negate();
                
                const origin = collision.contactPoint.clone()//.applyQuaternion(Q1).add(P1);
                this._target.localToWorld(origin);
                const raycaster = new THREE.Raycaster(origin, normal);
                
                const hits = raycaster.intersectObjects([obj]);
            
                if(hits.length!=0) {
                    // global position
                    const position = hits[0].point.clone();
                    const norm = hits[0].face.normal.clone();
                    const eye = position.clone();
                    // position of point on hit face
                    // creates rotation matrix
                    const rotation = new THREE.Matrix4();
                    // set rotation to rotate towards point hit
                    rotation.lookAt(eye, position, THREE.Object3D.DEFAULT_UP);
                    const euler = new THREE.Euler();
                    euler.setFromRotationMatrix(rotation);
                    // projectile leaves a mark
                    let decalGeometry = null;
                    decalGeometry = new DecalGeometry(obj, position, euler, new THREE.Vector3(0.5,0.5,0.5));
                    
                    const decalMaterial = new THREE.ShaderMaterial({
                        vertexShader:decal_VS,
                        fragmentShader:decal_FS,
                        uniforms: {
                            diffuseTexture: {
                                value: new THREE.TextureLoader().load('./resources/hole.png'),
                            },
                            angle: {
                                value: 0,
                            },                      
                        },
                        transparent:true,
                        blending:THREE.AdditiveBlending,
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
                    obj.add(decal);
                    this._target._world.addEphemeral(decal);     

                }
            }
            return true;
        }
        return false;
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
            let dir = raycaster.ray.direction.clone();
            
            const P = this._target.getPosition();
            close = this._target._world.FindNear([P.x,P.z],[10,10]);
            
            //Too laggy
            /*close.filter((client) => {
                return client.entity instanceof Enemy;
            });
            
            const enem = [];
            close.forEach((client) => {
                enem.push(client.entity);
            });
            
            const hits = raycaster.intersectObjects(enem);
            
            if(hits.length != 0) {
                const p = hits[0].point.clone();
                dir = p.clone().sub(P).normalize(); // it is a normal
            } else {
                dir.multiplyScalar(100); 
                dir.sub(P).normalize();
            }*/

            dir.multiplyScalar(100); 
            dir.sub(P).normalize();
            
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
};
