// functions used to draw objects

class Drawer {
    constructor() {
    
        if(this.constructor == Drawer) {
            throw new Error("Class is of abstract type and can't be instantiated");
        };

        if(this.setMesh == undefined) {
            throw new Error("setMesh method must be implemented");
        };

        if(this.draw == undefined) {
            throw new Error("draw method must be implemented");
        };
    }
}   

// class to draw boxes 
class BoxDrawer extends Drawer {
	constructor() {
	    super();
		// Compile the shader program
		this.prog = InitShaderProgram( boxVS, boxFS );
		
		// Get the ids of the uniform variables in the shaders
		this.mvp = gl.getUniformLocation( this.prog, 'mvp' );
		
		// Get the ids of the vertex attributes in the shaders
		this.vertPos = gl.getAttribLocation( this.prog, 'pos' );
		
		// Create the buffer objects
		
		this.vertbuffer = gl.createBuffer();
		this.linebuffer = gl.createBuffer();
	}
	
	setMesh( vertPos, texCoords ){

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		var line = [
		     0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23,   // left
		];
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.linebuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(line), gl.STATIC_DRAW);
	}
	draw( trans )
	{
		// Draw the line segments
		gl.useProgram( this.prog );
		gl.uniformMatrix4fv( this.mvp, false, trans );
		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertbuffer );
		gl.vertexAttribPointer( this.vertPos, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.vertPos );
		
		gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.linebuffer );
		gl.drawElements( gl.TRIANGLES, 36, gl.UNSIGNED_BYTE, 0);
	}
}
// Vertex shader source code
var boxVS = `
	attribute vec3 pos;
	uniform mat4 mvp;
	void main()
	{
		gl_Position = mvp * vec4(pos,1);
	}
`;
// Fragment shader source code
var boxFS = `
	precision mediump float;
	void main()
	{
		gl_FragColor = vec4(1,1,1,1);
	}
`;

// classes to draw spheres // TODO: needs to be heavily modified to fit with rest of classes
class SphereProg extends Drawer {
	init()

	{
		this.mvp     = gl.getUniformLocation( this.prog, 'mvp' );
		this.campos  = gl.getUniformLocation( this.prog, 'campos' );

		this.center  = gl.getUniformLocation( this.prog, 'center' );
		this.radius  = gl.getUniformLocation( this.prog, 'radius' );
		this.mtl_k_d = gl.getUniformLocation( this.prog, 'mtl.k_d' );

		this.mtl_k_s = gl.getUniformLocation( this.prog, 'mtl.k_s' );
		this.mtl_n   = gl.getUniformLocation( this.prog, 'mtl.n' );
		this.vp      = gl.getAttribLocation ( this.prog, 'p' );

	}
	setTrans( mvp, campos )
	{

		gl.useProgram( this.prog );
		gl.uniformMatrix4fv( this.mvp, false, mvp );

		gl.uniform3fv( this.campos, campos );

	}
	setLight( pos, intens )
	{

		gl.useProgram( this.prog );
		gl.uniform3fv( gl.getUniformLocation( this.prog, 'light.position'  ), pos    );
		gl.uniform3fv( gl.getUniformLocation( this.prog, 'light.intensity' ), intens );

	}
	draw( sphere )
	{

		gl.useProgram( this.prog );
		gl.uniform3fv( this.center,  sphere.center  );
		gl.uniform1f ( this.radius,  sphere.radius  );

		gl.uniform3fv( this.mtl_k_d, sphere.mtl.k_d );
		gl.uniform3fv( this.mtl_k_s, sphere.mtl.k_s );
		gl.uniform1f ( this.mtl_n,   sphere.mtl.n   );

		triSphere.draw( this.vp );
	}
};

class SphereDrawer extends SphereProg
{

	constructor()
	{
		super();

		this.prog = InitShaderProgramFromScripts( 'sphereVS', 'sphereFS' );
		this.init();
	}

};

// Vertex shader source code
var sphereVS = `
    attribute vec3 p;
    uniform mat4  mvp;
    uniform vec3  center;
    uniform float radius;
    varying vec3 pos;
    varying vec3 normal;
    void main()
    {
	    pos = p*radius + center;
        gl_Position = mvp * vec4(pos,1);
    	normal = p;
    }
`;
// Fragment shader source code
var sphereFS = `
    precision mediump float;
    struct Material {
	    vec3  k_d;	// diffuse coefficient
    	vec3  k_s;	// specular coefficient
	    float n;	// specular exponent
    };
    struct Light {
	    vec3 position;
    	vec3 intensity;
    };
    uniform samplerCube envMap;
    uniform Light    light;
    uniform vec3     campos;
    uniform Material mtl;
    varying vec3     pos;
    varying vec3     normal;
    void main()
    {
	    vec3 nrm = normalize(normal);
	    vec3 view = normalize( campos - pos );
	    vec3 color = vec3(0,0,0);
	    vec3 L = normalize( light.position - pos );
	    float c = dot( nrm, L );
	    if ( c > 0.0 ) {
	    	vec3 clr = c * mtl.k_d;
	    	vec3 h = normalize( L + view );
	    	float s = dot( nrm, h );
	    	if ( s > 0.0 ) {
	    		clr += mtl.k_s * pow( s, mtl.n );
	    	}
	    	color += clr * light.intensity;
	    }
	    if (mtl.k_s.r + mtl.k_s.g + mtl.k_s.b > 0.0 ) {
		    vec3 dir = reflect( -view, nrm );
		    color += mtl.k_s * textureCube( envMap, dir.xzy ).rgb;
	    }
	    gl_FragColor = vec4(color,1);
    }
`;

// MeshDrawer from project4

// utils funtion to compute tranformation matrix
function GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
{
	var trans = [
		Math.cos(rotationY), Math.sin(rotationY)*Math.sin(rotationX), -Math.cos(rotationX)*Math.sin(rotationY), 0,
		0, Math.cos(rotationX), Math.sin(rotationX), 0,
		Math.sin(rotationY), -Math.cos(rotationY)*Math.sin(rotationX), Math.cos(rotationX)*Math.cos(rotationY), 0,
		translationX, translationY, translationZ, 1
	];
	var mvp = MatrixMult( projectionMatrix, trans );
	return mvp;
}

class MeshDrawer extends Drawer {
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		//initializations like in BoxDrawer constructor() from html file
		super();
		//shader program
	    this.prog = InitShaderProgram( objVS, objFS );
	    
	    //uniform variables
	    this.mvp = gl.getUniformLocation( this.prog, 'mvp' );
	    this.sampler = gl.getUniformLocation(this.prog, 'tex');
	    
	    //attributes
	    this.vertPos = gl.getAttribLocation( this.prog, 'pos' );
	    this.texCoords = gl.getAttribLocation(this.prog, 'txc');
	    
	    //create Buffers for vertex position and texture coordinates
	    this.vertbuffer = gl.createBuffer();
	    this.texbuffer = gl.createBuffer();
	}
	
	// This method is called every time the user opens an OBJ file.
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords )
	{
	    //Update the contents of the vertex buffer objects.
		this.numTriangles = vertPos.length / 3;
        			    
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
		        
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
	}
	
	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw( trans )
	{
		gl.useProgram( this.prog );
		gl.uniformMatrix4fv( this.mvp, false, trans );

        //pass texture buffer to shader
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texbuffer);
        gl.vertexAttribPointer( this.texCoords, 2, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.texCoords );

        //pass position buffer to shader
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
        gl.vertexAttribPointer( this.vertPos, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.vertPos );
		        
        //		    
		gl.drawArrays( gl.TRIANGLES, 0, this.numTriangles );
		
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img )
	{

        this.tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
        	    
		// You can set the texture image data using the following command.
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );
		
		// some uniform parameter(s) of the fragment shader, so that it uses the texture.
		gl.generateMipmap(gl.TEXTURE_2D);
		
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		
		//activate and show texture
		gl.useProgram(this.prog);
		
        gl.activeTexture(gl.TEXTURE0);
                
        gl.uniform1i(this.show,true);
		gl.uniform1i(this.sampler,0);
	}
	
}

// Vertex shader source code
var objVS = `
	attribute vec3 pos;
	attribute vec2 txc;
	
	uniform mat4 mvp;
	
	varying vec2 texCoord;
	
	void main()
	{
	    vec3 swap_pos = pos;

		gl_Position = mvp * vec4(swap_pos,1);
		texCoord = txc;
	}
`;
// Fragment shader source code
var objFS = `
	precision mediump float;
	
	uniform sampler2D tex;
	
	varying vec2 texCoord;
	
	void main()
	{
	    
	    //show texture
	    //gl_FragColor = texture2D(tex, texCoord);
	        
	    //show some nice colours
	    gl_FragColor = vec4(gl_FragCoord.z*gl_FragCoord.z,0,0.2,1);
	    		
	}
`;
