import * as THREE from 'three';
import Grid from './world.js'
import {Drone, Character, Walkable, Obstacle,Pillar, MovingPlatform} from './entities.js'

class World extends Grid {
    constructor(bounds = [[-1000,-1000],[1000,1000]], dimensions = [101,101], gravity = -9.8) {
    
        super(bounds, dimensions);        
        this.gravity = gravity;   
        this._ephemeralhead = null;
        this._ephemeraltail = null;
        this.globaltime = 0;
        this.hidehitbox = true;
        
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
        light.position.set(100,100,100);
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
            './resources/miramar_lf.jpg',
            './resources/miramar_rt.jpg',
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
    
    // TODO: For now it updates worldwide, later may need to be modified to update only around the character 
    update(timeElapsed) {
        
        // first check on ephemeral objects
        let head = this._ephemeralhead;
        
        while(head && (head.time+head.lifespan <= this.globaltime)){
            this.popEphemeral();
            head = this._ephemeralhead;
        }
                
        const w = this._bounds[1][0] - this._bounds[0][0];
        const h = this._bounds[1][1] - this._bounds[0][1];
        let clients = this.FindNear([0, 0],[w, h]);
        clients.forEach( (client) => {
            const e = client.entity; 
            
            if(this.hidehitbox) e.hideHitBox();
            else e.showHitBox();
            
            if(e.expired) {
                this.RemoveClient(client);
            } else {
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
            }
        });
        
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

// create world
const world = new World();

// initialize meshes
const ground_geometry = new THREE.BoxGeometry(100,0.5,100);
const ground_material = new THREE.MeshStandardMaterial({ color: 0xffffff });
const ground_mesh = new THREE.Mesh(ground_geometry,ground_material);

const moving_geometry = new THREE.BoxGeometry(6,0.3,6);
const moving_material = new THREE.MeshStandardMaterial({ color: 0x00ffff });
const moving_mesh = new THREE.Mesh(moving_geometry,moving_material);
const moving_dir = new THREE.Vector3(1,0,0)
moving_dir.normalize();

const pillar_geometry = new THREE.CylinderGeometry(2.5,2.5,1,16);
const pillar_material = new THREE.MeshStandardMaterial({ color: 'blue' });
const pillar_mesh = new THREE.Mesh(pillar_geometry,pillar_material);

const drone_geometry = new THREE.BoxGeometry(0.2,0.2,0.2);
const drone_material = new THREE.MeshStandardMaterial({ color: 'red' });
const drone_mesh = new THREE.Mesh(drone_geometry,drone_material);

const moving_platform = new MovingPlatform({
    mesh: moving_mesh,
    position: new THREE.Vector3(11.6, 1.10, 5.0),
    encumberance: {
        width:10,
        depth:10
    },
    height:0.3,
    width:6,
    depth:6,
    parent: world._scene,
    world: world,
    frequency: 0.5,
    amplitude: 6,
    direction: moving_dir
})

// create entities (world objects);
const platform = new Walkable({
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
    position: new THREE.Vector3(0.0, 0.75, 5.0),
    encumbrance: {
        width: 5,
        depth: 5
    },    
    height:1,
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


world.start();

