import * as THREE from 'three'
import {particles_VS,  particles_FS} from './shaders.js'

class LinearSpline {
  constructor(lerp) {
    this._points = [];
    this._lerp = lerp;
  }

  AddPoint(t, d) {
    this._points.push([t, d]);
  }

  Get(t) {
    let p1 = 0;

    for (let i = 0; i < this._points.length; i++) {
      if (this._points[i][0] >= t) {
        break;
      }
      p1 = i;
    }

    const p2 = Math.min(this._points.length - 1, p1 + 1);

    if (p1 == p2) {
      return this._points[p1][1];
    }

    return this._lerp(
        (t - this._points[p1][0]) / (
            this._points[p2][0] - this._points[p1][0]),
        this._points[p1][1], this._points[p2][1]);
  }
}

class Particles {
    constructor(camera, parent) {
        const uniforms = {
            diffuseTexture: {
                value: new THREE.TextureLoader().load('./resources/smoke.png')
            },
            pointMultiplier: {
                value: window.innerHeight / (2.0 * Math.tan(0.5 * 60.0 * Math.PI / 180.0))
            }
        };

        this.time=0;
    
        this._material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: particles_VS,
            fragmentShader: particles_FS,
            blending: THREE.AdditiveBlending,
            depthTest: true,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });

        this._camera = camera;
        this._particles = [];
    
        // set attributes for shaders
        this._geometry = new THREE.BufferGeometry();
        this._geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
        this._geometry.setAttribute('size', new THREE.Float32BufferAttribute([], 1));
        this._geometry.setAttribute('colour', new THREE.Float32BufferAttribute([], 4));
        this._geometry.setAttribute('angle', new THREE.Float32BufferAttribute([], 1));
    
        // create particle points
        this._points = new THREE.Points(this._geometry, this._material);
    
        parent.add(this._points);
        
    }
}

export class SmokeParticles extends Particles {
    constructor(camera, parent) {
        super(camera, parent);
            
        // this is used for changing texture's alpha value
        this._alphaSpline = new LinearSpline((t, a, b) => {
          return a + t * (b - a);
        });
        this._alphaSpline.AddPoint(0.0, 0.0);
        this._alphaSpline.AddPoint(0.1, 1.0);
        this._alphaSpline.AddPoint(0.6, 1.0);
        this._alphaSpline.AddPoint(1.0, 0.0);
    
        // this is used for changing texture's colour
        this._colourSpline = new LinearSpline((t, a, b) => {
          const c = a.clone();
          return c.lerp(b, t);
        });
        this._colourSpline.AddPoint(0.0, new THREE.Color(0xdb563b));
        this._colourSpline.AddPoint(0.5, new THREE.Color(0xf5d167));
        this._colourSpline.AddPoint(0.75, new THREE.Color(0xf4f5e1));
    
        // this is used for changing particle's size
        this._sizeSpline = new LinearSpline((t, a, b) => {
          return a + t * (b - a);
        });
        this._sizeSpline.AddPoint(0.0, 1.0);
        this._sizeSpline.AddPoint(0.5, 5.0);
        this._sizeSpline.AddPoint(1.0, 1.0);
    
    }
    
    // adds a new particle 
    addParticles(timeElapsed, origin, direction) {

        this.time += timeElapsed;
        const n = 8;
        //this.time -= n / 75.0;
        
        // particle lifetime
        const life = (Math.random() * 0.75)+1;
        const o = origin.clone();
        const d = direction.clone();
        const pos = [];
        const dir = [];

        // place 8 particles around origin            
        pos.push(new THREE.Vector3(0.05,0,0));
        pos.push(new THREE.Vector3(-0.05,0,0));
        pos.push(new THREE.Vector3(0,0.05,0));
        pos.push(new THREE.Vector3(0,-0.05,0));
        pos.push(new THREE.Vector3(0.03,0.03,0));
        pos.push(new THREE.Vector3(-0.03,0.03,0));
        pos.push(new THREE.Vector3(0.03,-0.03,0));
        pos.push(new THREE.Vector3(-0.03,-0.03,0));
        // each particle moves a different direction
        dir.push(new THREE.Vector3(0.08,0,0));
        dir.push(new THREE.Vector3(-0.08,0,0));
        dir.push(new THREE.Vector3(0,0.08,0));
        dir.push(new THREE.Vector3(0,-0.08,0));
        dir.push(new THREE.Vector3(0.06,0.06,0));
        dir.push(new THREE.Vector3(-0.06,0.06,0));
        dir.push(new THREE.Vector3(0.06,-0.06,0));
        dir.push(new THREE.Vector3(-0.06,-0.06,0));        
        
        for(let i = 0; i < n; ++i) {
            this._particles.push({
                position: o.clone().add(pos[i]),
                size: (Math.random() * 0.5 + 0.5) * 0.1,
                colour: new THREE.Color(),
                alpha: 1.0,
                life: life,
                maxLife: life,
                rotation: Math.random() * 2.0 * Math.PI,
                velocity: d.clone().add(dir[i]),
            });
        }
        
        this._updateParticles(timeElapsed);
        this._updateGeometry();        
    }
    
    _updateParticles(timeElapsed) {
        // ages the particles cfr decals
        for (let p of this._particles) {
            p.life -= timeElapsed;
        }

        // removes expired particles
        this._particles = this._particles.filter(p => {
            return p.life > 0.0;
        });

        for (let p of this._particles) {
            const t = 1.0 - p.life / p.maxLife;

            // rotates, and changes the colors of the particles
            p.rotation += timeElapsed * 0.5;
            p.alpha = this._alphaSpline.Get(t);
            p.currentSize = p.size * this._sizeSpline.Get(t);
            p.colour.copy(this._colourSpline.Get(t));

            // updates position
            p.position.add(p.velocity.clone().multiplyScalar(timeElapsed));

            // adds a drag factor // TODO: may need some touch-ups
            const drag = p.velocity.clone();
            drag.multiplyScalar(timeElapsed * 0.1);
            drag.x = Math.sign(p.velocity.x) * Math.min(Math.abs(drag.x), Math.abs(p.velocity.x));
            drag.y = Math.sign(p.velocity.y) * Math.min(Math.abs(drag.y), Math.abs(p.velocity.y));
            drag.z = Math.sign(p.velocity.z) * Math.min(Math.abs(drag.z), Math.abs(p.velocity.z));
            p.velocity.sub(drag);
        }

        // sorts particles so that ones closest to camera appear closer
        this._particles.sort((a, b) => {
        const d1 = this._camera.position.distanceToSquared(a.position);
        const d2 = this._camera.position.distanceToSquared(b.position);
    
        if (d1 > d2) {
            return -1;
        }
        if (d1 < d2) {
            return 1;
        }
            return 0;
        }); 
    }


    // manifest changes applied to particles via shaders
    _updateGeometry() {
        const positions = [];
        const sizes = [];
        const colours = [];
        const angles = [];

        for (let p of this._particles) {
            positions.push(p.position.x, p.position.y, p.position.z);
            colours.push(p.colour.r, p.colour.g, p.colour.b, p.alpha);
            sizes.push(p.currentSize);
            angles.push(p.rotation);
        }
        
        // pass new values to shaders
        this._geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        this._geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        this._geometry.setAttribute('colour', new THREE.Float32BufferAttribute(colours, 4));
        
        this._geometry.setAttribute('angle', new THREE.Float32BufferAttribute(angles, 1));
        
        this._geometry.attributes.position.needsUpdate = true;
        this._geometry.attributes.size.needsUpdate = true;
        this._geometry.attributes.colour.needsUpdate = true;
        this._geometry.attributes.angle.needsUpdate = true;
    }
    
    update(timeInSeconds) {
        if(this._particles.length == 0) return;
        this._updateParticles(timeInSeconds);
        this._updateGeometry();
    }
    
}

export class SmokeTrailParticles extends Particles {
    constructor(camera, parent) {
        super(camera, parent);
            
        // this is used for changing texture's alpha value
        this._alphaSpline = new LinearSpline((t, a, b) => {
          return a + t * (b - a);
        });
        this._alphaSpline.AddPoint(0.0, 0.0);
        this._alphaSpline.AddPoint(0.1, 1.0);
        this._alphaSpline.AddPoint(0.6, 1.0);
        this._alphaSpline.AddPoint(1.0, 0.0);
    
        // this is used for changing texture's colour
        this._colourSpline = new LinearSpline((t, a, b) => {
          const c = a.clone();
          return c.lerp(b, t);
        });
        this._colourSpline.AddPoint(0.0, new THREE.Color(0xe0e0e0));
        this._colourSpline.AddPoint(0.5, new THREE.Color(0xffffff));
    
        // this is used for changing particle's size
        this._sizeSpline = new LinearSpline((t, a, b) => {
          return a + t * (b - a);
        });
        this._sizeSpline.AddPoint(0.0, 1.0);
        this._sizeSpline.AddPoint(0.5, 3.0);
        this._sizeSpline.AddPoint(0.75, 2.0);
        this._sizeSpline.AddPoint(1.0, 0.5);
    
    }
    
    // adds a new particle 
    addParticles(timeElapsed, origin, direction) {

        this.time += timeElapsed;
        //this.time -= n / 75.0;
        
        // particle lifetime
        const life = (Math.random() * 0.75)+1;
        const o = origin.clone();
        const d = direction.clone();             
        
        this._particles.push({
            position: o.clone(),
            size: (Math.random() * 0.5 + 0.5) * 0.1,
            colour: new THREE.Color(),
            alpha: 1.0,
            life: life,
            maxLife: life,
            rotation: Math.random() * 2.0 * Math.PI,
            velocity: d.clone(),
        });
        
        this._updateParticles(timeElapsed);
        this._updateGeometry();        
    }
    
    _updateParticles(timeElapsed) {
        // ages the particles cfr decals
        for (let p of this._particles) {
            p.life -= timeElapsed;
        }

        // removes expired particles
        this._particles = this._particles.filter(p => {
            return p.life > 0.0;
        });

        for (let p of this._particles) {
            const t = 1.0 - p.life / p.maxLife;

            // rotates, and changes the colors of the particles
            p.rotation += timeElapsed * 0.5;
            p.alpha = this._alphaSpline.Get(t);
            p.currentSize = p.size * this._sizeSpline.Get(t);
            p.colour.copy(this._colourSpline.Get(t));

            // updates position
            p.position.add(p.velocity.clone().multiplyScalar(timeElapsed));

            // adds a drag factor // TODO: may need some touch-ups
            const drag = p.velocity.clone();
            drag.multiplyScalar(timeElapsed * 0.1);
            drag.x = Math.sign(p.velocity.x) * Math.min(Math.abs(drag.x), Math.abs(p.velocity.x));
            drag.y = Math.sign(p.velocity.y) * Math.min(Math.abs(drag.y), Math.abs(p.velocity.y));
            drag.z = Math.sign(p.velocity.z) * Math.min(Math.abs(drag.z), Math.abs(p.velocity.z));
            p.velocity.sub(drag);
        }

        // sorts particles so that ones closest to camera appear closer
        this._particles.sort((a, b) => {
        const d1 = this._camera.position.distanceToSquared(a.position);
        const d2 = this._camera.position.distanceToSquared(b.position);
    
        if (d1 > d2) {
            return -1;
        }
        if (d1 < d2) {
            return 1;
        }
            return 0;
        }); 
    }


    // manifest changes applied to particles via shaders
    _updateGeometry() {
        const positions = [];
        const sizes = [];
        const colours = [];
        const angles = [];

        for (let p of this._particles) {
            positions.push(p.position.x, p.position.y, p.position.z);
            colours.push(p.colour.r, p.colour.g, p.colour.b, p.alpha);
            sizes.push(p.currentSize);
            angles.push(p.rotation);
        }
        
        // pass new values to shaders
        this._geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        this._geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        this._geometry.setAttribute('colour', new THREE.Float32BufferAttribute(colours, 4));
        
        this._geometry.setAttribute('angle', new THREE.Float32BufferAttribute(angles, 1));
        
        this._geometry.attributes.position.needsUpdate = true;
        this._geometry.attributes.size.needsUpdate = true;
        this._geometry.attributes.colour.needsUpdate = true;
        this._geometry.attributes.angle.needsUpdate = true;
    }
    
    update(timeInSeconds) {
        if(this._particles.length == 0) return;
        this._updateParticles(timeInSeconds);
        this._updateGeometry();
    }
    
}

export class ExplosionParticles extends Particles {
    constructor(camera, parent) {
        super(camera, parent);
            
        // this is used for changing texture's alpha value
        this._alphaSpline = new LinearSpline((t, a, b) => {
          return a + t * (b - a);
        });
        this._alphaSpline.AddPoint(0.0, 0.0);
        this._alphaSpline.AddPoint(0.1, 1.0);
        this._alphaSpline.AddPoint(0.6, 1.0);
        this._alphaSpline.AddPoint(1.0, 0.0);
    
        // this is used for changing texture's colour
        this._colourSpline = new LinearSpline((t, a, b) => {
          const c = a.clone();
          return c.lerp(b, t);
        });
        this._colourSpline.AddPoint(0.0, new THREE.Color(0x030bfc));
        this._colourSpline.AddPoint(0.5, new THREE.Color(0x4296db));
        this._colourSpline.AddPoint(0.75, new THREE.Color(0xd6f5ff));
    
        // this is used for changing particle's size
        this._sizeSpline = new LinearSpline((t, a, b) => {
          return a + t * (b - a);
        });
        this._sizeSpline.AddPoint(0.0, 3.0);
        this._sizeSpline.AddPoint(0.5, 2.75);
        this._sizeSpline.AddPoint(1.0, 2.5);
    
    }
    
    // adds a new particle 
    addParticles(timeElapsed, origin, direction) {

        const n = 16
        // particle lifetime
        const life = (Math.random() * 0.75)+1;
        const o = origin.clone();
        const d = direction.clone();
        const pos = [];
        const dir = [];

        // place 8 particles around origin            
        pos.push(new THREE.Vector3(0.5,0,0));
        pos.push(new THREE.Vector3(-0.5,0,0));
        pos.push(new THREE.Vector3(0,0.5,0));
        pos.push(new THREE.Vector3(0,-0.5,0));
        pos.push(new THREE.Vector3(0.3,0.3,0));
        pos.push(new THREE.Vector3(-0.3,0.3,0));
        pos.push(new THREE.Vector3(0.3,-0.3,0));
        pos.push(new THREE.Vector3(-0.3,-0.3,0));
        
        pos.push(new THREE.Vector3(0.5,0,0));
        pos.push(new THREE.Vector3(-0.5,0,0));
        pos.push(new THREE.Vector3(0,0,0.5));
        pos.push(new THREE.Vector3(0,0,-0.5));
        pos.push(new THREE.Vector3(0.5,0,0.5));
        pos.push(new THREE.Vector3(-0.5,0,0.5));
        pos.push(new THREE.Vector3(0.5,0,-0.5));
        pos.push(new THREE.Vector3(-0.5,0,-0.5));
        // each particle moves a different direction
        dir.push(new THREE.Vector3(0.8,0,0));
        dir.push(new THREE.Vector3(-0.8,0,0));
        dir.push(new THREE.Vector3(0,0.8,0));
        dir.push(new THREE.Vector3(0,-0.8,0));
        dir.push(new THREE.Vector3(0.6,0.6,0));
        dir.push(new THREE.Vector3(-0.6,0.6,0));
        dir.push(new THREE.Vector3(0.6,-0.6,0));
        dir.push(new THREE.Vector3(-0.6,-0.6,0)); 
        
        dir.push(new THREE.Vector3(0.8,0,0));
        dir.push(new THREE.Vector3(-0.8,0,0));
        dir.push(new THREE.Vector3(0,0,0.8));
        dir.push(new THREE.Vector3(0,0,-0.8));
        dir.push(new THREE.Vector3(0.6,0,0.6));
        dir.push(new THREE.Vector3(-0.6,0,0.6));
        dir.push(new THREE.Vector3(0.6,0,-0.6));
        dir.push(new THREE.Vector3(-0.6,0,-0.6));          
        
        for(let i = 0; i < n; ++i) {
            this._particles.push({
                position: o.clone().add(pos[i]),
                size: (Math.random() * 0.5 + 0.5) * 3.,
                colour: new THREE.Color(),
                alpha: 1.0,
                life: life,
                maxLife: life,
                rotation: Math.random() * 2.0 * Math.PI,
                velocity: d.clone().add(dir[i]),
            });
        }
        
        this._updateParticles(timeElapsed);
        this._updateGeometry();        
    }
    
    _updateParticles(timeElapsed) {
        // ages the particles cfr decals
        for (let p of this._particles) {
            p.life -= timeElapsed;
        }

        // removes expired particles
        this._particles = this._particles.filter(p => {
            return p.life > 0.0;
        });

        for (let p of this._particles) {
            const t = 1.0 - p.life / p.maxLife;

            // rotates, and changes the colors of the particles
            p.rotation += timeElapsed * 0.5;
            p.alpha = this._alphaSpline.Get(t);
            p.currentSize = p.size * this._sizeSpline.Get(t);
            p.colour.copy(this._colourSpline.Get(t));

            // updates position
            p.position.add(p.velocity.clone().multiplyScalar(timeElapsed));

            // adds a drag factor // TODO: may need some touch-ups
            const drag = p.velocity.clone();
            drag.multiplyScalar(timeElapsed * 0.1);
            drag.x = Math.sign(p.velocity.x) * Math.min(Math.abs(drag.x), Math.abs(p.velocity.x));
            drag.y = Math.sign(p.velocity.y) * Math.min(Math.abs(drag.y), Math.abs(p.velocity.y));
            drag.z = Math.sign(p.velocity.z) * Math.min(Math.abs(drag.z), Math.abs(p.velocity.z));
            p.velocity.sub(drag);
        }

        // sorts particles so that ones closest to camera appear closer
        this._particles.sort((a, b) => {
        const d1 = this._camera.position.distanceToSquared(a.position);
        const d2 = this._camera.position.distanceToSquared(b.position);
    
        if (d1 > d2) {
            return -1;
        }
        if (d1 < d2) {
            return 1;
        }
            return 0;
        }); 
    }


    // manifest changes applied to particles via shaders
    _updateGeometry() {
        const positions = [];
        const sizes = [];
        const colours = [];
        const angles = [];

        for (let p of this._particles) {
            positions.push(p.position.x, p.position.y, p.position.z);
            colours.push(p.colour.r, p.colour.g, p.colour.b, p.alpha);
            sizes.push(p.currentSize);
            angles.push(p.rotation);
        }
        
        // pass new values to shaders
        this._geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        this._geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        this._geometry.setAttribute('colour', new THREE.Float32BufferAttribute(colours, 4));
        
        this._geometry.setAttribute('angle', new THREE.Float32BufferAttribute(angles, 1));
        
        this._geometry.attributes.position.needsUpdate = true;
        this._geometry.attributes.size.needsUpdate = true;
        this._geometry.attributes.colour.needsUpdate = true;
        this._geometry.attributes.angle.needsUpdate = true;
    }
    
    update(timeInSeconds) {
        if(this._particles.length == 0) return;
        this._updateParticles(timeInSeconds);
        this._updateGeometry();
    }
}
