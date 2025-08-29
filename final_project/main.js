import * as THREE from 'three';
import Grid from './world.js'
import {Drone, Character, Enemy, Platform, Obstacle,Pillar, MovingPlatform} from './entities.js'
import {object_VS, object_FS} from './shaders.js'
import {SmokeParticles, SmokeTrailParticles, ExplosionParticles} from './particles.js';

class World extends Grid {
    constructor(bounds = [[-1000,-1000],[1000,1000]], dimensions = [200,200], gravity = -9.8) {
    
        super(bounds, dimensions);        
        this.gravity = gravity;   
        this._ephemeralhead = null;
        this._ephemeraltail = null;
        this.globaltime = 0;
        this.hidehitbox = false;
        this._delete_list = [];
        
        // initialize scene
        const w = window.innerWidth;
        const h = window.innerHeight;

        const fov = 60;
        const aspect = w / h;
        const near = 1.0;
        const far = 1000.0;
        
        this._scene = new THREE.Scene();
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        
        // for ui elements 
        this._uicamera = new THREE.OrthographicCamera(-1, 1, 1 * aspect, -1 * aspect, 1, 1000); 
        this._uiscene = new THREE.Scene();
    
        this._renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true
        });
        this._renderer.shadowMap.enabled = true;
        this._renderer.setSize(w, h);
        this._renderer.shadowMap.enabled = true;
        
        this._renderer.domElement.addEventListener("click", async () => {
            await this._renderer.domElement.requestPointerLock();
        });
        document.body.appendChild( this._renderer.domElement ); // canvas
        
        window.addEventListener('resize', () => {
            this._onWindowResize();
        }, false);
        
        let light = new THREE.DirectionalLight( 0xffffff, 1);
        light.position.set(-100,100,0);
        light.target.position.set(0,0,0);
        light.castShadow = true;
        
        this._scene.add(light);
        
        light = new THREE.AmbientLight(0x404040);
        this._scene.add(light);
        
        const skyloader = new THREE.CubeTextureLoader();
        const texture = skyloader.load([
            './resources/miramar_ft.jpg',
            './resources/miramar_bk.jpg',        
            './resources/miramar_up.jpg',
            './resources/miramar_dn.jpg',            
            './resources/miramar_rt.jpg',
            './resources/miramar_lf.jpg',
        ]);
        this._scene.background = texture;
                
        // for loading textures
        const texloader = new THREE.TextureLoader();
        
        const maxAnisotropy = this._renderer.capabilities.getMaxAnisotropy();
        
        // Crosshair
        const crosshair = texloader.load('resources/target.png');
        crosshair.anisotropy = maxAnisotropy;

        this._sprite = new THREE.Sprite(new THREE.SpriteMaterial({map: crosshair, color: 0xffffff, fog: false, depthTest: false, depthWrite: false}));
        this._sprite.scale.set(0.15, 0.15 * this._camera.aspect, 1)
        this._sprite.position.set(0, 0, -10);

        this._uiscene.add(this._sprite);       
        
        this.explosion_particles = new ExplosionParticles(this._camera, this._scene);
        
        this._previousRAF = null;                        
    }
    
    _onWindowResize(){
        const w = window.innerWidth;
        const h = window.innerHeight;
        this._camera.aspect = w / h;
        this._camera.updateProjectionMatrix();
        
        this._uicamera.left = -this._camera.aspect;
        this._uicamera.right = this._camera.aspect;
        this._uicamera.updateProjectionMatrix();        
        
        this._renderer.setSize( w, h );
    }
    
    // Request Animation Frame
    _RAF(iteration) {

        //if( iteration >= 400 ) return;

        requestAnimationFrame((t) => {
            if(this._previousRAF === null) {
                this._previousRAF = t;
            }

            this._step(t - this._previousRAF);
            this._renderer.autoClear = true;
            this._renderer.render(this._scene, this._camera);
            this._renderer.autoClear = false;
            this._renderer.render(this._uiscene, this._uicamera);
            
            this._previousRAF = t;
            
            this._RAF(iteration+1);
        });
    }
    
    _step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001; //convert to seconds
        this.globaltime+=timeElapsedS;
        this.update(timeElapsedS);
    }
    
    start() {
        this._RAF(0.0);
    }
    
    update(timeElapsed) {
        // first check on ephemeral objects
        let head = this._ephemeralhead;
        
        while(head && (head.time+head.lifespan <= this.globaltime)){
            this.popEphemeral();
            head = this._ephemeralhead;
        }
        
        this.explosion_particles.update(timeElapsed);
                
        const w = this._bounds[1][0] - this._bounds[0][0];
        const h = this._bounds[1][1] - this._bounds[0][1];
        let clients = this.FindNear([0, 0],[w, h]);
        
        clients.forEach((client) => {
            const e = client.entity;
            if(e.expired || e._expired) {
                this.RemoveClient(client);
                client.entity = null;
            }        
        })
        
        clients = this.FindNear([0, 0],[w, h]);
        clients.forEach( (client) => {
            const e = client.entity; 
            if(this.hidehitbox) e.hideHitBox();
            else e.showHitBox();

            const p = e.getPosition();
            const x = p.x;
            const y = p.z;
            if (e._collider) {
                const candidates = this.FindNear([x,y],[50, 50]); // checks all objects in 50m square

                for (const candidate of candidates) {
                    e.checkCollision(candidate.entity);
                    if(candidate.entity._canbehit) e.addToRange(candidate.entity);
                }                
            }
            e.update(timeElapsed);
            e.clearCollisions();
            e.clearRange();

            this.UpdateClient(client);
        
        });  
        
        this._delete_list.forEach((a) => {
            if(a._delete != undefined) a._delete();
        });
        
    }
    
    addToDeleteList(a) {
        this._delete_list.push(a);
    }
    
    addEntity(e) {
        this.newClient(e);
    }
    
    addPlayerCharacter(c) {
        this._character = c;
        this.addEntity(c);

    }
    
    addToScene(e) {
        this._scene.add(e);
    }    
    
    addEphemeral(e) {
        
        const n = {
            prev: null,
            next: null,
            time: this.globaltime,
            lifespan: 20,
            ephemeral: e
        }    
    
        const tail = this._ephemeraltail;
        if(tail) {
            tail.next = n;
            n.prev = tail;
            this._ephemeraltail = n;            
        } else {
            this._ephemeraltail = n;
            this._ephemeralhead = n;
        }

    }
    
    popEphemeral() {        
        const head = this._ephemeralhead;
        if(head) {
            this._ephemeralhead = head.next;
            if(head.next == null) this._ephemeraltail = this._ephemeralhead;
            if(this._ephemeralhead) this._ephemeralhead.prev = null;
            head.next = null;    
        }
        
        const e = head.ephemeral
        e.parent.remove(e);
    }
        
}

export function createMesh({
    width,
    height,
    depth,
    radius=-1.,
    color=0xffffff,
    isbox=true,
    VS = object_VS,
    FS = object_FS,
} ){
    // create geometries
    let geometry = null;
    if(isbox) {
        geometry = new THREE.BoxGeometry(width,height,depth);
    } else {
        geometry = new THREE.CylinderGeometry(radius, radius, height, 16); 
    }
    // create materials
    const stencil_material = new THREE.ShaderMaterial({
        uniforms:{
            time:{
                value: 0.0,
            },
            shimmer:{
                value: true,
            },
            width: {
                value: width
            },
            radius: {
                value: radius
            },
            origin: {
                value: new THREE.Vector2(0.,0.),
            }
        },
        vertexShader: VS,
        fragmentShader: FS, 
        transparent:true,
        blending: THREE.AdditiveBlending,
    });
    const base_material = new THREE.MeshStandardMaterial({ color: color });
    // create meshes
    const stencil_mesh = new THREE.Mesh(geometry,stencil_material);
    const base_mesh = new THREE.Mesh(geometry,base_material);
    
    base_mesh.receiveShadow = true;
    base_mesh.castShadow = true;
    
    base_mesh.add(stencil_mesh);
    return base_mesh;
}

// create world
const world = new World();

const ground_mesh = createMesh({
    width:100,
    height:0.5,
    depth:100,
    color:0xc6f5f7
});

const moving_mesh =createMesh({
    width:-1,
    height:0.3,
    radius:3,
    depth:-1,
    color:0x00ff00,
    isbox:false
});

const moving_dir = new THREE.Vector3(1,0,0)
moving_dir.normalize();

const pillar_geometry = new THREE.CylinderGeometry(2.5,2.5,10,16);
const pillar_material = new THREE.MeshStandardMaterial({ 
    map: new THREE.TextureLoader().load('./resources/wall.png'),
});
const pillar_mesh = new THREE.Mesh(pillar_geometry,pillar_material);

const drone_geometry = new THREE.BoxGeometry(0.2,0.2,0.2);
const drone_material = new THREE.MeshStandardMaterial({ 
    map: new THREE.TextureLoader().load('./resources/drone.jpg')    
});
const drone_mesh = new THREE.Mesh(drone_geometry,drone_material);


/*const debug = new THREE.Mesh(new THREE.BoxGeometry(1,1,1),drone_material)
debug.position.set(1,1,1);
world._scene.add(debug);
*/

const moving_platform = new MovingPlatform({
    mesh: moving_mesh,
    position: new THREE.Vector3(11.6, 1.10, 5.0),
    encumberance: {
        width:10,
        depth:10
    },
    height:0.3,
    radius:3,
    parent: world._scene,
    world: world,
    frequency: 0.5,
    amplitude: 6,
    direction: moving_dir
});

// create entities (world objects);
const platform = new Platform({
    mesh: ground_mesh,
    position: new THREE.Vector3(0.0, 0.0, 0.0),
    encumbrance: {
        width: 100,
        depth: 100
    },    
    height:0.5,
    width:100,
    depth:100,
    parent: world._scene,
    world: world,
});

const pillar = new Pillar({
    mesh: pillar_mesh,
    position: new THREE.Vector3(0.0, 5.25, 15.0),
    encumbrance: {
        width: 5,
        depth: 5
    },    
    height:10,
    radius:2.5,
    parent: platform,
    world: world
});

const crtr = new Character({
    path:'Y_Bot.fbx',
    camera: world._camera,
    position: new THREE.Vector3(0.0, 5.5, 0.0),
    encumbrance: {
        width: 0.8,
        depth: 0.8
    },
    height: 1.8,
    radius: 0.4,
    parent: platform,
    world: world
});

const drone = new Drone({
    mesh: drone_mesh,
    position: new THREE.Vector3(0.0, 0.0, 0.0),
    encumberance: {
        width: 0.2,
        depth: 0.2
    },
    radius: 0.1,
    height: 0.2,
    parent:crtr,
    world: world
});

crtr.addWeapon(drone);

world.addEntity(moving_platform);
world.addEntity(platform);
world.addEntity(pillar);
world.addEntity(drone);
world.addPlayerCharacter(crtr);

for (let i = 0; i < 5; ++i) {
    const pos = new THREE.Vector3((Math.random()*2)+5, (Math.random()*2)+2, (Math.random()*2)+5)
    const e = new Enemy({
    path:'Y_Bot.fbx',
    position:pos,
    encumbrance: {
        width: 1,
        depth: 1
    },
    height: 1.0,
    radius: 0.6,
    parent: world._scene,
    world: world    
    });
    
    world.addEntity(e);
}

world.start();

