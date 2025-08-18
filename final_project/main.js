import * as THREE from 'three';
import World from './world.js'
import {Character, Walkable} from './entities.js'
import {BasicController} from './controls.js'

// initialize scene
const w = window.innerWidth;
const h = window.innerHeight;

const fov = 60;
const aspect = w / h;
const near = 1.0;
const far = 1000.0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
});
renderer.shadowMap.enabled = true;
renderer.setSize( w, h );
document.body.appendChild( renderer.domElement ); // canvas

// initialize objects
const ground_geometry = new THREE.BoxGeometry(100,0.5,100);
const ground_material = new THREE.MeshStandardMaterial({ color: 0xffffff });
const ground_mesh = new THREE.Mesh(ground_geometry, ground_material);
ground_mesh.receiveShadow = true;

const char_geometry = new THREE.BoxGeometry(0.8,1.7,0.8);
const char_material = new THREE.MeshStandardMaterial({ color: 'green' });
const char_mesh = new THREE.Mesh(char_geometry, char_material);
char_mesh.castShadow = true;

const world = new World([[-1000,-1000],[1000,1000]],[101,101]);

const platform = new Walkable({
    mesh: ground_mesh,
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

const crtr = new Character({
    mesh: char_mesh,
    camera: camera,
    controller: new BasicController(),
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

const temp = new THREE.Vector3();
char_mesh.getWorldDirection(temp);
console.log(temp);
ground_mesh.getWorldDirection(temp);
console.log(temp);


world.addPlayerCharacter(crtr);
world.NewClient(platform);

//scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirlight = new THREE.DirectionalLight( 0xffffff, 1);
dirlight.position.y = 30;
dirlight.position.z = -100;
dirlight.castShadow = true;
scene.add(dirlight);
scene.add(ground_mesh);
scene.add(char_mesh);

let frames = 0;

function windowResize(){
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize( w, h );
    renderer.render(scene, camera);
}

function animate(){
    const animationId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
    
    world.update();

    frames++;
}

animate()

