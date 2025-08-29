import * as THREE from 'three';

export default class ThirdPersonCamera {
    constructor(camera, parent){

        this._camera = camera;
        this._mesh = parent;
        // where the camera is in world coordinates
        this._currentPosition = new THREE.Vector3();
        // where the camera is looking in world coordinates
        this._currentLookat = new THREE.Vector3();
        
        // where the camera is in character coordinates
        this.id_Offset = new THREE.Vector3(-0.5,1,-2.5);
        // where camera is looking in character coordinates
        this.id_Lookat = new THREE.Vector3(-0.5,1.0,2.0);
    }
    
    _CalculateIdeal(v){
        v.applyQuaternion(this._mesh.quaternion);
        v.add(this._mesh.getPosition());        
    }
    
    update(timeElapsed) {
    
        const idealLookat = this.id_Lookat.clone();
        this._CalculateIdeal(idealLookat);
        const idealOffset = this.id_Offset.clone();    
        this._CalculateIdeal(idealOffset);
        
        const t = 1.0 - Math.pow(0.001, timeElapsed); 
        
        this._currentPosition.lerp(idealOffset, t);
        this._currentLookat.lerp(idealLookat, t);
        
        this._camera.position.copy(this._currentPosition);
        this._camera.lookAt(this._currentLookat);
    }
}
