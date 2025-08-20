import * as THREE from 'three';
import Grid from './world.js'
import {Character, Walkable, Obstacle} from './entities.js'

class World extends Grid {
    constructor(bounds = [[-1000,-1000],[1000,1000]], dimensions = [101,101], gravity = -9.8) {
    
        super(bounds, dimensions);        
        this.gravity = gravity;        
        
        // initialize scene
        const w = window.innerWidth;
        const h = window.innerHeight;

        const fov = 60;
        const aspect = w / h;
        const near = 1.0;
        const far = 1000.0;
        
        this._scene = new THREE.Scene();
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    
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
        
        const loader = new THREE.CubeTextureLoader();
        const texture = loader.load([
            './resources/miramar_lf.jpg',
            './resources/miramar_rt.jpg',
            './resources/miramar_up.jpg',
            './resources/miramar_dn.jpg',
            './resources/miramar_ft.jpg',
            './resources/miramar_bk.jpg'
        ]);
        this._scene.background = texture;
        
        this._previousRAF = null;
        //this._RAF();
    }
    
    _onWindowResize(){
        const w = window.innerWidth;
        const h = window.innerHeight;
        this._camera.aspect = w / h;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize( w, h );
    }
    
    // Request Animation Frame
    _RAF() {
        requestAnimationFrame((t) => {
            if(this._previousRAF === null) {
                this._previousRAF = t;
            }
            
            this._renderer.render(this._scene, this._camera);
            this._step(t - this._previousRAF);
            this._previousRAF = t;
            
            this._RAF();
        });
    }
    
    _step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001; //convert to seconds
        this.update(timeElapsedS);
    }
    
    start() {
        this._RAF();
    }
    
    addEntity(e) {
        this._scene.add(e);
        this.newClient(e);
    }
    
    addPlayerCharacter(c) {
        this._scene.add(c);        
        this._character = c;
        this.newClient(c);

    }
    
    // TODO: For now it updates worldwide, later may need to be modified to update only around the character 
    update(timeElapsed) {
    
        const w = this._bounds[1][0] - this._bounds[0][0];
        const h = this._bounds[1][1] - this._bounds[0][1];
        const clients = this.FindNear([0, 0],[w, h]);
        clients.forEach( (client) => {        
            client.entity.update(timeElapsed);
            this.UpdateClient(client);
        });
    }
    
}

// create world
const world = new World();

// initialize meshes
const ground_geometry = new THREE.BoxGeometry(100,0.5,100);
const ground_material = new THREE.MeshStandardMaterial({ color: 0xffffff });

const pillar_geometry = new THREE.BoxGeometry(5,30,5);
const pillar_material = new THREE.MeshStandardMaterial({ color: 'blue' });

const char_geometry = new THREE.BoxGeometry(0.8,1.7,0.8);
const char_material = new THREE.MeshStandardMaterial({ color: 'green' });

// create entities (world objects);
const platform = new Walkable({
    geometry: ground_geometry,
    material: ground_material,
    position: {
        x: 0.0,
        y: 0.0,
        z: 0.0
    },
    encumbrance: {
        width: 100,
        depth: 100
    },    
    hitbox: {
        height: 0.5,
        radius: 50
    },
    parent: null,
    world: world
});

const pillar = new Obstacle({
    geometry: pillar_geometry,
    material: pillar_material,
    position: {
        x: 40.0,
        y: 16.0,
        z: 40.0
    },
    encumbrance: {
        width: 5,
        depth: 5
    },    
    hitbox: {
        height: 30,
        radius: 2.5
    },
    parent: platform,
    world: world
});

const crtr = new Character({
    geometry: char_geometry,
    material: char_material,
    camera: world._camera,
    position: {
        x: 0.0,
        y: 1.5,
        z: 0.0
    },
    encumbrance: {
        width: 0.8,
        depth: 0.8
    },
    hitbox: {
        height: 1.7,
        radius: 0.4
    },
    parent: platform,
    world: world
});


world.addEntity(platform);
world.addEntity(pillar);
world.addPlayerCharacter(crtr);

world.start();

