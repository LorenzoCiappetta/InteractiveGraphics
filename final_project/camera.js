import * as THREE from 'three';

export default class ThirdPersonCamera {
    constructor(camera, mesh){

        this._camera = camera;
        this._mesh = mesh;
        
        this._currentPosition = new THREE.Vector3();
        this._currentLookat = new THREE.Vector3();
    }
    
    _CalculateIdeal(v){
        
        v.applyQuaternion(this._mesh.quaternion);
        v.add(this._mesh.position);        
    }
    
    update(timeElapsed) {
    
        const idealLookat = new THREE.Vector3(-1.5,1.0,5.0);
        this._CalculateIdeal(idealLookat);
        const idealOffset = new THREE.Vector3(-1,2.5,-10.5);    
        this._CalculateIdeal(idealOffset);
        
        const t = 1.0 - Math.pow(0.001, timeElapsed); //TODO: add time elapsed to simulation
        
        this._currentPosition.lerp(idealOffset, t);
        this._currentLookat.lerp(idealLookat, t);
        
        this._camera.position.copy(this._currentPosition);
        this._camera.lookAt(this._currentLookat);
    }
}
