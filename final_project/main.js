import * as THREE from 'three';
import Grid from './world.js'
import {Character, Walkable, Obstacle,CylinderHitBox, BoxHitBox} from './entities.js'

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
                
        // debugging purposes only
        this.debug_vector = new THREE.Vector3(0.0,0.0,5.0);
        this._mixer = null;
                
    }
    
    _onWindowResize(){
        const w = window.innerWidth;
        const h = window.innerHeight;
        this._camera.aspect = w / h;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize( w, h );
    }
    
    // Request Animation Frame
    _RAF(iteration) {

        //if( iteration >= 400 ) return;

        requestAnimationFrame((t) => {
            if(this._previousRAF === null) {
                this._previousRAF = t;
            }
            
            this._renderer.render(this._scene, this._camera);
            this._step(t - this._previousRAF);
            this._previousRAF = t;
            
            this._RAF(iteration+1);
        });
    }
    
    _step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001; //convert to seconds
        this.update(timeElapsedS);
    }
    
    start() {
        this._RAF(0.0);
    }
    
    // TODO: For now it updates worldwide, later may need to be modified to update only around the character 
    update(timeElapsed) {
        
        const w = this._bounds[1][0] - this._bounds[0][0];
        const h = this._bounds[1][1] - this._bounds[0][1];
        let clients = this.FindNear([0, 0],[w, h]);
        clients.forEach( (client) => {  
            const e = client.entity;
            const p = e.getPosition();
            const x = p.x;
            const y = p.z;
            if (e._collider) {
                const candidates = this.FindNear([x,y],[0, 0]); // checks all objects in same cell
                for (const candidate of candidates) {
                    e.checkCollision(candidate.entity);
                }
                
            }
            e.update(timeElapsed);
            e.clearCollisions();
            this.UpdateClient(client);
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
        
}

// create world
const world = new World();

// initialize meshes
const ground_geometry = new THREE.BoxGeometry(100,0.5,100);
const ground_material = new THREE.MeshStandardMaterial({ color: 0xffffff });
const ground_mesh = new THREE.Mesh(ground_geometry,ground_material);

const pillar_geometry = new THREE.BoxGeometry(5,1,5);
const pillar_material = new THREE.MeshStandardMaterial({ color: 'blue' });
const pillar_mesh = new THREE.Mesh(pillar_geometry,pillar_material);


/*const char_geometry = new THREE.BoxGeometry(0.8,2,0.8);
const char_material = new THREE.MeshStandardMaterial({ color: 'green' });
const char_mesh = new THREE.Mesh(char_geometry,char_material);*/
//const char_hitbox = new CylinderHitBox(0.57,2);

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
    world: world
});

const pillar = new Obstacle({
    mesh: pillar_mesh,
    position: new THREE.Vector3(0.0, 0.75, 5.0),
    encumbrance: {
        width: 5,
        depth: 5
    },    
    height:1,
    width:5,
    depth:5,
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
    height: 2.0,
    radius: 0.4,
    parent: platform,
    world: world
});

world.addEntity(platform);
world.addEntity(pillar);
world.addPlayerCharacter(crtr);

world.start();

