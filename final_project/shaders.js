// keep all shaders in one place

export const decal_VS = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`;

export const decal_FS = `
uniform sampler2D diffuseTexture;
uniform float angle;
varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(diffuseTexture, vUv);
}`;


export const particles_VS = `
uniform float pointMultiplier;

attribute float size;
attribute float angle;
attribute vec4 colour;

varying vec4 vColour;
varying vec2 vAngle;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size * pointMultiplier / gl_Position.w;

  vAngle = vec2(cos(angle), sin(angle));
  vColour = colour;
}`;

export const particles_FS = `

uniform sampler2D diffuseTexture;

varying vec4 vColour;
varying vec2 vAngle;

void main() {
  vec2 coords = (gl_PointCoord - 0.5) * mat2(vAngle.x, vAngle.y, -vAngle.y, vAngle.x) + 0.5;
  gl_FragColor = texture2D(diffuseTexture, coords) * vColour;
}`;


export const object_VS = `

varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`;

export const object_FS = `

varying vec2 vUv;
uniform float time;
uniform bool shimmer;
uniform float width;
uniform float radius;
uniform vec2 origin;

float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    bool s = shimmer;
    float t = sin(time*1.5) * 0.5 + 0.5;
    float t_shimmer = sin(time*1.5) * 0.5 + 0.5;
    vec3 final_color = mix(vec3(0.5,0.5,1.),vec3(0.,0.,1.),t);
    float x = mix(-1.,1.,t_shimmer);
    
    float amp = 0.;
    
    if(radius >= 0.) {
        amp = radius;
        gl_FragColor = vec4(t,t,1.,0.5);
        return;
    } else {
        amp = width;
    }
    
    vec2 o = origin + vec2(amp/2.,amp/2.);
    o /= amp;
    
    if( vUv.x >= (width-0.5) / (width) || vUv.x <= (0.5) / (width)|| vUv.y >=(width-0.5) / (width) || vUv.y <= (0.5) / (width)) {
        gl_FragColor = vec4(final_color,1);
    } else if (s) {
        vec2 distance =  o-vUv;
        float d = distance.x*distance.x + distance.y*distance.y;
        if(vUv.x <= vUv.y+x+0.1 && vUv.x >= vUv.y+x-0.1) {
            gl_FragColor = vec4(1,1,1,1);
        } else if (d<=0.000025){
            gl_FragColor = vec4(1.,0.,0.,0.5); 
        }
    }
}
`


