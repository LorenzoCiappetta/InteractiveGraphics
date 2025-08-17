import * as THREE from 'three';
import {World, Character} from './entities.js'

// initialize scene
const w = window.innerWidth;
const h = window.innerHeight;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.set(4.61, 2.74, 8);

const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
});
renderer.shadowMap.enabled = true;
renderer.setSize( w, h );
document.body.appendChild( renderer.domElement ); // canvas

// initialize objects
const ground_geometry = new THREE.BoxGeometry(5,0.5,5);
const ground_material = new THREE.MeshStandardMaterial({ color: 0xffffff });
const ground_mesh = new THREE.Mesh(ground_geometry, ground_material);
ground_mesh.receiveShadow = true;

const char_geometry = new THREE.BoxGeometry(0.8,1.7,0.8);
const char_material = new THREE.MeshStandardMaterial({ color: 'green' });
const char_mesh = new THREE.Mesh(char_geometry, char_material);
char_mesh.castShadow = true;

const world = new World({ 
    mesh:ground_mesh, 
    hitbox:{
        width:5, 
        height:0.5, 
        depth:5
    },
});

const crtr = new Character({
    mesh: char_mesh,
    position: {
        x:0,
        y:1.5,
        z:0
    },
    hitbox: {
        width: 1,
        height: 1.7,
        depth: 1
    },
    parent: world
});

world.addEntity(crtr);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirlight = new THREE.DirectionalLight( 0xffffff, 1);
dirlight.position.y = 3;
dirlight.position.z = 1;
dirlight.castShadow = true;
scene.add(dirlight);
scene.add(ground_mesh);
scene.add(char_mesh);

let frames = 0;

function animate(){
    const animationId = requestAnimationFrame(animate);
    renderer.render(scene, camera);
    
    world.update();

    frames++;
}

animate()

