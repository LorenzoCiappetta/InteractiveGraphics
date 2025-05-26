var raytraceFS = `
struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

bool IntersectRay( inout HitInfo hit, Ray ray );

// Shades the given point and returns the computed color.
vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
{
	vec3 color = vec3(0,0,0);
	for ( int i=0; i<NUM_LIGHTS; ++i ) {
		// TO-DO: Check for shadows
		Light l = lights[i];
		vec3 light_dir = normalize(l.position-position);
		vec3 light_intensity = l.intensity;
		
		Ray r;
		r.pos = position;
		r.dir = light_dir;
		HitInfo hit;
		if(IntersectRay(hit,r)){
		    return color;
		}
		
		// TO-DO: If not shadowed, perform shading using the Blinn model
		float diffuse = max(dot(normal,light_dir),0.0);
		if(diffuse > 0.0){
		    vec3 clr = diffuse * mtl.k_d;
		    vec3 h = normalize(light_dir+view);
		    float specular = max(dot(normal,h),0.0);
		    if(specular > 0.0){
		        clr += mtl.k_s*pow(specular,mtl.n);
		    }
		    color += clr * light_intensity;
		}
	}
	return color;
}

// Intersects the given ray with all spheres in the scene
// and updates the given HitInfo using the information of the sphere
// that first intersects with the ray.
// Returns true if an intersection is found.
bool IntersectRay( inout HitInfo hit, Ray ray )
{
	hit.t = 1e30;
	bool foundHit = false;
	for ( int i=0; i<NUM_SPHERES; ++i ) {
		// TO-DO: Test for ray-sphere intersection
		Sphere s = spheres[i];
		vec3 c = s.center;
		float r = s.radius;
		
		vec3 p = ray.pos;
		vec3 d = ray.dir;
		
		float a = dot(d,d);
		float b = dot(d,p-c);
		float cc = dot(p-c,p-c)-pow(r,2.0);
		
		float delta = pow(b,2.0)-a*cc;
		
		// TO-DO: If intersection is found, update the given HitInfo
		if(delta >= 0.0){
		    //Hit found
		    float t1 = (-b-sqrt(delta))/a;
		    float t2 = (-b+sqrt(delta))/a;
		    float t = t1<t2?t1:t2;
		    
		    //add bias
		    if(t > 2e-4 && t < hit.t){
		        foundHit = true;
		    
		        vec3 x = p + t*d;
		        vec3 n = normalize(x-c);
		    
    		    hit.t = t;
		        hit.mtl = s.mtl;
		        hit.position = x;
		        hit.normal = n;
		        
            }
	    }
	}
	return foundHit;
}

// Given a ray, returns the shaded color where the ray intersects a sphere.
// If the ray does not hit a sphere, returns the environment color.
vec4 RayTracer( Ray ray )
{
	HitInfo hit;
	if ( IntersectRay( hit, ray ) ) {
		vec3 view = normalize( -ray.dir );
		vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );
		
		// Compute reflections
		vec3 k_s = hit.mtl.k_s;
		for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
			if ( bounce >= bounceLimit ) break;
			if ( hit.mtl.k_s.r + hit.mtl.k_s.g + hit.mtl.k_s.b <= 0.0 ) break;
			
			Ray r;	// this is the reflection ray
			HitInfo h;	// reflection hit info
			
			// TO-DO: Initialize the reflection ray
			r.pos = hit.position;
			r.dir = reflect(-view,hit.normal);
			
			if ( IntersectRay( h, r ) ) {
				// TO-DO: Hit found, so shade the hit point
				clr += k_s*Shade(h.mtl,h.position,h.normal,view);
				// TO-DO: Update the loop variables for tracing the next reflection ray
				view = normalize(-r.dir);
				k_s *= h.mtl.k_s;
				hit = h;
			} else {
				// The refleciton ray did not intersect with anything,
				// so we are using the environment color
				clr += k_s * textureCube( envMap, r.dir.xzy ).rgb;
				break;	// no more reflections
			}
		}
		return vec4( clr, 1 );	// return the accumulated color, including the reflections
	} else {
		return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 0 );	// return the environment color
	}
}
`;
