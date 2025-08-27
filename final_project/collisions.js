// contains collision detection primitives
import * as THREE from 'three'

// abstract class for objects hitboxes
class HitBox extends THREE.Mesh {
    constructor({
        geometry,
        material,
    }) {
        super(geometry, material);
        this.castShadow = false;
        this.receiveShadow = false;
    }
    
    hideHitBox() {
        this.visible = false;
    }
    
    showHitBox() {
        this.visible = true;
    }
        
    getPosition(){
        if( this.parent ) {
            return this.parent.getPosition();
        } 
    }    
    
    getRotation(){
        if( this.parent ) {
            return this.parent.getRotation();
        }
    }

};

export class CylinderHitBox extends HitBox {
    constructor({
        radius,
        height,
    }) {
        const geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
        const material = new THREE.MeshBasicMaterial({ wireframe: true });
        super({geometry, material});
        this.radius = radius;
        this.height = height;
    }
    
};

export class BoxHitBox extends HitBox {
    constructor({
        width,
        height,
        depth,
    }) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshBasicMaterial({ wireframe: true });    
        super({geometry, material});
        this.width = width;
        this.height = height;
        this.depth = depth;
    }
};


// classes for collision detection managment
class Collider {
    constructor() {
        if(this.collision == undefined) {
            throw new Error("collision method must be implemented");        
        }
    }

    pointInBoundingCylinder(closestPoint, p, hitbox) {

        const dx = closestPoint.x - p.x;
        const dy = closestPoint.y - p.y;
        const dz = closestPoint.z - p.z;
        const r_sq = dx * dx + dz * dz;
        
        return (Math.abs(dy) <= hitbox.height / 2 + 0.01) && (r_sq < hitbox.radius * hitbox.radius);
    }

    pointInBoundingBox(closestPoint, p, hitbox) {
        const dx = closestPoint.x - p.x;
        const dy = closestPoint.y - p.y;
        const dz = closestPoint.z - p.z;

        return (Math.abs(dy) <= hitbox.height / 2) && (Math.abs(dx) < hitbox.width / 2) && (Math.abs(dz) < hitbox.depth / 2)
    }

};

export class StandardCollider extends Collider {
    constructor() {
        super();
        this.visualizer=null;
        this.p = null;
    }

    // functions for collision deection
    // given a set of collision candidates checks which ones are actually hitting
    // TODO: if there's time make this code more readable;
    collision(entity1, entity2) {
    
        const hitbox1 = entity1.getHitBox();
        const hitbox2 = entity2.getHitBox();
    
        let collision = null;
 
        if( !hitbox1 || !hitbox2 || hitbox1 == hitbox2) return collision;
        
        if (hitbox1 instanceof CylinderHitBox) {
            
            if (hitbox2 instanceof BoxHitBox) {
                
                // get Global transforms
                const Q2 = hitbox2.getRotation();
                const Q2_con = Q2.clone().conjugate();
                const P2 = hitbox2.getPosition();
            
                // p is position of hitbox1 relative to hitbox2's frame of reference
                const p = hitbox1.getPosition().sub(P2).applyQuaternion(Q2_con);    
            
                // find closest point between hitboxes
                const closestPoint = new THREE.Vector3(
                    Math.max( -hitbox2.width / 2, Math.min(p.x, hitbox2.width / 2)),
                    Math.max( - hitbox2.height / 2, Math.min(p.y, hitbox2.height / 2)), // a hit is considered only from below for now...
                    Math.max( - hitbox2.depth / 2, Math.min(p.z, hitbox2.depth / 2))
                )
            
                // find displacement between point and hitbox1
                const dx = closestPoint.x - p.x;
                const dy = closestPoint.y - p.y ;
                const dz = closestPoint.z - p.z;
                
                // compute overlap with hitbox1 radius
                if (this.pointInBoundingCylinder(closestPoint, p, hitbox1)) {
                    const overlapY = (hitbox1.height / 2) - Math.abs(dy);
                    const overlapXZ = hitbox1.radius - Math.sqrt(dx * dx + dz * dz);
    
                    let normal, overlap;
                    if (overlapY < overlapXZ) {                
                        normal = new THREE.Vector3(0, -Math.sign(dy), 0);// sign may need to be changed
                        overlap = overlapY;
                    } else {
                        normal = new THREE.Vector3(-dx, 0, -dz).normalize();
                        overlap = overlapXZ;
                    }
                
                    // put everything back to hitbox1 frame of reference
                    // back to world coords
                    closestPoint.applyQuaternion(Q2).add(P2);
                    normal.applyQuaternion(Q2);
                                
                    const Q1 = hitbox1.getRotation();
                    const Q1_con = Q1.clone().conjugate();
                    const P1 = hitbox1.getPosition();     
                
                    closestPoint.sub(P1).applyQuaternion(Q1_con);
                    // normal only need to apply quaternion
                    normal.applyQuaternion(Q1_con);

                    collision=({
                        hitbox: hitbox2,
                        contactPoint: closestPoint,
                        normal,
                        overlap
                    });
                }
            } else if (hitbox2 instanceof CylinderHitBox){
            
                // get Global transforms
                const Q1 = hitbox1.getRotation();
                const Q1_con = Q1.clone().conjugate();
                const P1 = hitbox1.getPosition();
                
                // in this case is better to have p as the position of hitbox2 relative to hitbox1's frame of reference
                const p = hitbox2.getPosition()//.sub(P1).applyQuaternion(Q1_con); 
                
                hitbox1.worldToLocal(p);
                
                // find closest point between hitboxes                
                const Y = Math.max(p.y - hitbox2.height / 2, Math.min(0.0, p.y + hitbox2.height / 2)); // this is the same as seen before but in a different frame of reference
                
                // takes vector on xz plane between two points and shortens it until closest point is reached
                const XZ_close = new THREE.Vector2(p.x, p.z);
                const XZ_far = XZ_close.clone();
                const XZ_hit = XZ_close.clone();
                XZ_close.setLength(XZ_close.length()-hitbox2.radius);
                XZ_far.setLength(XZ_far.length()+hitbox2.radius);
                XZ_hit.setLength(hitbox1.radius);
                
                const closestPoint = new THREE.Vector3(XZ_close.x, Y, XZ_close.y);                                            
                const furthestPoint = new THREE.Vector3(XZ_far.x, Y, XZ_far.y);                                
                const hitPoint = new THREE.Vector3(XZ_hit.x, Y, XZ_hit.y);
                
                // find displacement between point and hitbox1
                const dx = closestPoint.x;
                const dy = closestPoint.y;
                const dz = closestPoint.z;

                const conditionR = hitbox1.radius*hitbox1.radius >= dx * dx + dz * dz;

                const conditionX = conditionR || 
                                (hitPoint.x <= furthestPoint.x && hitPoint.x >= closestPoint.x) || 
                                (hitPoint.x >= furthestPoint.x && hitPoint.x <= closestPoint.x);
                
                const conditionZ = conditionR || 
                                (hitPoint.z <= furthestPoint.z && hitPoint.z >= closestPoint.z) || 
                                (hitPoint.z >= furthestPoint.z && hitPoint.z <= closestPoint.z);

                const conditionY = Math.abs(closestPoint.y) <= hitbox1.height/2 + 0.01;
                                
                const condition = conditionX && conditionY && conditionZ;

                if (condition) {     
                                                     
                    let overlapY = (hitbox1.height / 2) - Math.abs(dy);
                    
                    let overlapXZ = hitbox1.radius - Math.sqrt(dx * dx + dz * dz);                    
                    if(overlapXZ < 0) overlapXZ = hitbox1.radius;

                    let normal, overlap;
                    if (Math.abs(overlapY) < Math.abs(overlapXZ)) {   
                        
                        normal = new THREE.Vector3(0, -Math.sign(dy!=0?dy:1), 0);
                        overlap = overlapY;
                    } else {
                        normal = new THREE.Vector3(-dx, 0, -dz).normalize();
                        overlap = overlapXZ;
                    }
                    
                    // no need to put everything back to hitbox1 frame of reference, we were already there.

                    collision=({
                        hitbox: hitbox2,
                        contactPoint: hitPoint,
                        normal,
                        overlap
                    });                
                }   
            }   
        } else if (hitbox1 instanceof BoxHitBox) {
            if ( hitbox2 instanceof CylinderHitBox ) {
                // this case is a mix of the previous ones, it will be treated directly from frame of reference of hitbox1
                
                // get Global transforms
                const Q1 = hitbox1.getRotation();
                const Q1_con = Q1.clone().conjugate();
                const P1 = hitbox1.getPosition();
                                
                const Q2 = hitbox2.getRotation();
                const Q2_con = Q2.clone().conjugate();
                // in this case is better to have p as the position of hitbox2 relative to hitbox1's frame of reference
                const p = hitbox2.getPosition().sub(P1).applyQuaternion(Q1_con);
                
                // closest point on box, we need closest on cylinder though
                const P = new THREE.Vector3(
                    Math.max( - hitbox1.width / 2, Math.min(p.x, hitbox1.width / 2)),
                    Math.max( - hitbox1.height / 2, Math.min(p.y, hitbox1.height / 2)), 
                    Math.max( - hitbox1.depth / 2, Math.min(p.z, hitbox1.depth / 2))
                )
                
                const helper = P.clone().sub(p).applyQuaternion(Q2_con); 

                const _p = p.clone().sub(P);
                
                // takes vector on xz plane between two points and shortens it until closest point is reached
                const XZ_close = new THREE.Vector2(_p.x, _p.z);
                XZ_close.setLength(XZ_close.length()-hitbox2.radius);
                
                const closestPoint = new THREE.Vector3(XZ_close.x, 0.0, XZ_close.y).add(P); 
                
                closestPoint.y = Math.max(p.y - hitbox2.height / 2, Math.min(0.0, p.y + hitbox2.height / 2)); // bring back Y to right frame of reference// P.y 
                
                // find displacement between point and hitbox1
                const dx = closestPoint.x;
                const dy = closestPoint.y;
                const dz = closestPoint.z;  
                
                const dirx = p.x-closestPoint.x;
                const dirz = p.z-closestPoint.z;
                  
                let condition = helper.x*helper.x+helper.z*helper.z < hitbox2.radius*hitbox2.radius;
                
                // compute overlap with hitbox1 radius
                if (condition && Math.abs(dy)<=hitbox1.height/2+0.01) {            
                    
                    const overlapY = (hitbox1.height / 2) - Math.abs(dy);
                    
                    let overlapX = 0;
                    if(Math.sign(dirx) == Math.sign(dx)){
                        overlapX = (hitbox1.width / 2) - Math.abs(dx);
                    }else {
                        overlapX = (hitbox1.width) - Math.abs(dx);
                    }
                    let overlapZ = 0;
                    if(Math.sign(dirz) == Math.sign(dz)){
                        overlapZ = (hitbox1.depth / 2) - Math.abs(dz);
                    }else {
                        overlapZ = (hitbox1.depth) - Math.abs(dz);
                    }        
        
                    let normal, overlap;
                    if (Math.abs(overlapY) < Math.abs(overlapX) && Math.abs(overlapY) < Math.abs(overlapZ)) {                
                        normal = new THREE.Vector3(0, -Math.sign(dy), 0);
                        overlap = overlapY;
                    } else {
                        normal = new THREE.Vector3(-dirx,0,-dirz);
                        normal.normalize();
                        overlap = overlapX>overlapZ?overlapZ:overlapX;
                    }
                    
                    // no need to put everything back to hitbox1 frame of reference, we were already there.
                        
                    collision=({
                        hitbox: hitbox2,
                        contactPoint: closestPoint,
                        normal,
                        overlap
                    });                
                }            
            
            } else if ( hitbox2 instanceof BoxHitBox ) {
                // this is the hardest case, it will be treted slightly differently
                
                const Q2 = hitbox2.getRotation(); // rotation of hitbox2 in global
                const P2 = hitbox2.getPosition(); // position of hitbox2 in global
                const Q2_con = Q2.clone().conjugate();
                
                const Q1 = hitbox1.getRotation(); // rotation of hitbox1 in global
                const P1 = hitbox1.getPosition(); // position of hitbox1 in global
                const Q1_con = Q1.clone().conjugate();                                  
                
                const w1 = hitbox1.width;
                const h1 = hitbox1.height;
                const d1 = hitbox1.depth; 
                
                const w2 = hitbox2.width;
                const h2 = hitbox2.height;
                const d2 = hitbox2.depth;
                
                const v1_2 = new THREE.Vector3(w2/2,- h2/2,d2/2).applyQuaternion(Q2_con).add(P2);
                const v2_2 = new THREE.Vector3(-w2/2,- h2/2,d2/2).applyQuaternion(Q2_con).add(P2);
                const v3_2 = new THREE.Vector3(-w2/2,- h2/2,-d2/2).applyQuaternion(Q2_con).add(P2);
                const v4_2 = new THREE.Vector3(w2/2,- h2/2,-d2/2).applyQuaternion(Q2_con).add(P2);
         
                // -switch everything to local 1
                // for simplicity we go to frame of reference 1
         
                v1_2.sub(P1).applyQuaternion(Q1_con);
                v2_2.sub(P1).applyQuaternion(Q1_con);
                v3_2.sub(P1).applyQuaternion(Q1_con);
                v4_2.sub(P1).applyQuaternion(Q1_con); 
                const v_X_min_2 = [v1_2, v2_2, v3_2, v4_2];
                const v_Z_min_2 = [v1_2, v2_2, v3_2, v4_2];
                const v_X_max_2 = [v1_2, v2_2, v3_2, v4_2];
                const v_Z_max_2 = [v1_2, v2_2, v3_2, v4_2];            
                v_X_min_2.sort(function(v1,v2){return v1.x-v2.x});
                v_Z_min_2.sort(function(v1,v2){return v1.z-v2.z});
                v_X_max_2.sort(function(v1,v2){return v2.x-v1.x});
                v_Z_max_2.sort(function(v1,v2){return v2.z-v1.z});
                
                // -compute verteces of 1 in local 1
                // -check for collision with SAT
                let overlap = 999;
                const normal = new THREE.Vector3(0,0,0);
                if (v_X_min_2[0].x < w1/2 && 
                    v_Z_min_2[0].z < d1/2 && 
                    v_X_max_2[0].x > -w1/2 && 
                    v_Z_max_2[0].z > -d1/2 && 
                    P2.y-h2/2 <= P1.y+h1/2 && 
                    P2.y+h2/2 >= P1.y-h1/2
                ) {
                    //possible collision

                    let overlapY_1 = P2.y + h2/2 - (P1.y - h1/2);
                    let overlapY_2 = P1.y + h1/2 - (P2.y - h2/2);
                    if (overlapY_1 < overlapY_2 ) {
                        overlap = overlapY_1;
                        normal.set(0,1,0);
                    } else {
                        overlap = overlapY_2;
                        normal.set(0,-1,0);
                    }

                    // now we need to check if there's a superposition also in local 2
                    // put everything back to global
                
                    ///
                    
                    const v1_1 = new THREE.Vector3(w1/2,-h1/2,d1/2).applyQuaternion(Q1).add(P1);
                    const v2_1 = new THREE.Vector3(-w1/2,-h1/2,d1/2).applyQuaternion(Q1).add(P1);
                    const v3_1 = new THREE.Vector3(-w1/2,-h1/2,-d1/2).applyQuaternion(Q1).add(P1);
                    const v4_1 = new THREE.Vector3(w1/2,-h1/2,-d1/2).applyQuaternion(Q1).add(P1);                   
                    
                    // and then to local 2
                    v1_1.sub(P2).applyQuaternion(Q2_con);
                    v2_1.sub(P2).applyQuaternion(Q2_con);
                    v3_1.sub(P2).applyQuaternion(Q2_con);
                    v4_1.sub(P2).applyQuaternion(Q2_con); 
                    const v_X_min_1 = [v1_1, v2_1, v3_1, v4_1];
                    const v_Z_min_1 = [v1_1, v2_1, v3_1, v4_1];
                    const v_X_max_1 = [v1_1, v2_1, v3_1, v4_1];
                    const v_Z_max_1 = [v1_1, v2_1, v3_1, v4_1];            
                    v_X_min_1.sort(function(v1,v2){return v1.x-v2.x});
                    v_Z_min_1.sort(function(v1,v2){return v1.z-v2.z});
                    v_X_max_1.sort(function(v1,v2){return v2.x-v1.x});
                    v_Z_max_1.sort(function(v1,v2){return v2.z-v1.z});

                    let change_normal = false;
                    if (v_X_min_1[0].x < w2/2 &&
                        v_Z_min_1[0].z < d2/2 &&
                        v_X_max_1[0].x > -w2/2 &&
                        v_Z_max_1[0].z > -d2/2
                    ) {
                        // collision found!
                        const overlapX_max_2 = v_X_max_1[0].x - (-w2/2);
                        const overlapX_min_2 = (w2/2) - v_X_min_1[0].x;
                        
                        // TODO: if there's time update normal to reduce jitter
                        
                        let overlapZ_max_2 = v_Z_max_1[0].z - (-d2/2);
                        let overlapZ_min_2 = (d2/2) - v_Z_min_1[0].z;                        
                        
                        if (overlapX_max_2 < overlapX_min_2 &&  overlapX_max_2 < overlap ) {
                            overlap = overlapX_max_2;
                            normal.set(-1,0,0);
                            change_normal = true;
                        } else if (overlapX_min_2 < overlapX_max_2 &&  overlapX_min_2 < overlap ) {
                            overlap = overlapX_min_2;
                            normal.set(1,0,0);
                            change_normal = true;                    
                        }
                    
                        if( overlapZ_max_2 < overlapZ_min_2 &&  overlapZ_max_2 < overlap) {
                            overlap = overlapZ_max_2;
                            normal.set(0,0,-1);
                            change_normal = true;                        
                        } else if (overlapZ_min_2 < overlapZ_max_2 && overlapZ_min_2 < overlap){
                            overlap = overlapZ_min_2;
                            normal.set(0,0,1);
                            change_normal = true;
                        }                    

                    
                        if (change_normal) {
                            // need to put normal back in local 1
                            normal.applyQuaternion(Q2);
                            normal.applyQuaternion(Q1_con);
                        }
                        
                        collision=({
                            hitbox: hitbox2,
                            contactPoint: normal.clone().multiplyScalar(
                                (hitbox1.width>((hitbox1.height>hitbox1.depth)?
                                    hitbox1.height:hitbox1.depth)?
                                hitbox1.width:((hitbox1.height>hitbox1.depth)?
                                    hitbox1.height:hitbox1.depth))), // find contact point is too hard, this is an approxximation
                            normal: normal,
                            overlap
                        });                                        
                    }
                }            
            }
        }
        return collision;
    }
}



