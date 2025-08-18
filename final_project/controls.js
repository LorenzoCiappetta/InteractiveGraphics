// contains controls for the game

export const keys = {
    w: {
        pressed: false
    },
    a: {
        pressed: false
    },
    s: {
        pressed: false
    },
    d: {
        pressed: false
    },
    spc: {
        pressed: false,
        active: false
    },
    shft: {
        pressed: false
    }
}

window.addEventListener('keydown', (event) => {
    keys.shft.pressed = event.shiftKey;

    switch(event.code) {
        case 'KeyA':
            keys.a.pressed = true;
            break;
        case 'KeyD':
            keys.d.pressed = true;
            break;
        case 'KeyS':
            keys.s.pressed = true;
            break;  
        case 'KeyW':
            keys.w.pressed = true;
            break;  
        case 'Space':
            console.log("pressed spacebar")
            if(keys.spc.pressed == false) keys.spc.active = true;
            keys.spc.pressed = true;
            break;
        default:
            break;
    }
});

window.addEventListener('keyup', (event) => {
    keys.shft.pressed = event.shiftKey;

    switch(event.code) {
        case 'KeyA':
            keys.a.pressed = false;
            break;
        case 'KeyD':
            keys.d.pressed = false;
            break;
        case 'KeyS':
            keys.s.pressed = false;
            break;
        case 'KeyW':
            keys.w.pressed = false;
            break;
        case 'Space':
            keys.spc.pressed = false;
            break;
        default:
            break;
    }
});
