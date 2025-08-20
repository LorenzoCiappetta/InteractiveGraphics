// silly function to compute where hitbox is positioned compared to object
export function boxLimits({
    position,
    dimensions
}) {
    
    const [x, y, z] = position;
    const [w, h, d] = dimensions;
    
    const right = x + w / 2;
    const left = x - w / 2;
    
    const front = z + d / 2;
    const back = z - d / 2;
    
    const bottom = y - h / 2;
    const top = y + h / 2;

    return [right, left, front, back, bottom, top]
}

// simple box collision function
export function boxCollision({box1, box2}){
    const epsilon = 0.001; // deal with floating point imprecision
    //detect collisions
    const xCollision = box1.right - box2.left >= epsilon && box1.left - box2.right <= epsilon;
    const yCollision = box1.bottom - box2.top <= epsilon && box1.top - box2.bottom >= epsilon;
    const zCollision = box1.front - box2.back >= epsilon && box1.back - box2.front <= epsilon;
    
    return xCollision && yCollision && zCollision;
        
}
