// State entities can be in the game (cfr finite state automaton)
export const STATE = Object.freeze({ // trying to replicate C's enum types
    JUMPING:   Symbol("jumping"),
    IDLE:  Symbol("idle"),
    WALKING: Symbol("walking"),
    RUNNING: Symbol("running"),
    FALLING: Symbol("falling")
});

// silly function to compute where hitbox is positioned compared to object
export function boxLimits({
    position = {
        x,
        y,
        z
    },
    dimensions = {
        width,
        height,
        depth
    }
}) {

    const right = position.x + dimensions.width / 2;
    const left = position.x - dimensions.width / 2;
    
    const front = position.z + dimensions.depth / 2;
    const back = position.z - dimensions.depth / 2;
    
    const bottom = position.y - dimensions.height / 2;
    const top = position.y + dimensions.height / 2;
    
    return [right, left, front, back, bottom, top]
}

// simple box collision function
export function boxCollision({box1, box2}){
    //detect collisions
    const xCollision = box1.right >= box2.left && box1.left <= box2.right;
    const yCollision = box1.bottom + box1.velocity.y <= box2.top && box1.top >= box2.bottom;
    const zCollision = box1.front >= box2.back && box1.back <= box2.front;
    
    return xCollision && yCollision && zCollision;
        
}
