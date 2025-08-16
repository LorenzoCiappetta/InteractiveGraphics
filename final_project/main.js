import * as THREE from 'three';
import SpacialHashGrid from './utils.js'
import World from './entities.js'

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

const ground_geometry = new THREE.BoxGeometry(10,0.5,50);
const ground_material = new THREE.MeshStandardMaterial({ color: 'white' });
const ground_mesh = new THREE.Mesh(ground_geometry, ground_material);
ground_mesh.receiveShadow = true;

const char_geometry = new THREE.BoxGeometry(1,1,1);
const char_material = new THREE.MeshStandardMaterial({ color: 'green' });
const char_mesh = new THREE.Mesh(char_geometry, char_material);
char_mesh.castShadow = true;

const grid = new SpacialHashGrid(null, null);
const world = new World({ 
    mesh:ground_mesh, 
    hitbox:{
        height:0.5, 
        width:50}, 
    grid: grid
});

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
scene.add(ground_mesh);
