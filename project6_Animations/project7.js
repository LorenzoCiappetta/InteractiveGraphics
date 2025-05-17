// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	// [TO-DO] Modify the code below to form the transformation matrix.
	var trans = [
		Math.cos(rotationY), Math.sin(rotationY)*Math.sin(rotationX), -Math.cos(rotationX)*Math.sin(rotationY), 0,
		0, Math.cos(rotationX), Math.sin(rotationX), 0,
		Math.sin(rotationY), -Math.cos(rotationY)*Math.sin(rotationX), Math.cos(rotationX)*Math.cos(rotationY), 0,
		translationX, translationY, translationZ, 1
	];
		
	var mv = trans;
	return mv;
}


// [TO-DO] Complete the implementation of the following class.

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		// [TO-DO] initializations
		//shader program
	    this.prog = InitShaderProgram( objVS, objFS );
	    
	    //uniform variables
	    //projection
	    this.mvp = gl.getUniformLocation( this.prog, 'mvp' );
	    //transformation
	    this.mv = gl.getUniformLocation( this.prog, 'mv' );
	    //normal
	    this.mn = gl.getUniformLocation( this.prog, 'mn' );
	    
	    this.sampler = gl.getUniformLocation(this.prog, 'tex');
	    
	    this.swap = gl.getUniformLocation(this.prog, 'swap');
	    this.show = gl.getUniformLocation(this.prog, 'show');
	    
	    this.light_dir = gl.getUniformLocation(this.prog, 'light_dir');
	    this.shiny = gl.getUniformLocation(this.prog, 'shiny');
	    
	    //attributes
	    this.vertPos = gl.getAttribLocation( this.prog, 'pos' );
	    this.texCoords = gl.getAttribLocation(this.prog, 'txc');
	    this.normals = gl.getAttribLocation(this.prog, 'norm');
	    
	    //create Buffers for vertex position, texture coordinates and normals
	    this.position_buffer = gl.createBuffer();
	    this.tex_buffer = gl.createBuffer();
	    this.norm_buffer = gl.createBuffer();
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords, normals )
	{
		// [TO-DO] Update the contents of the vertex buffer objects.
		this.numTriangles = vertPos.length / 3;
		this.numVertices = vertPos.length;
		this.vertPos = vertPos;
		this.texCoords = texCoords;
		this.normals = normals;
		        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.norm_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);		 
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.texCoords), gl.STATIC_DRAW);
		        
		gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertPos), gl.STATIC_DRAW);
		        	
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap )
	{
		// [TO-DO] Set the uniform parameter(s) of the vertex shader
        gl.useProgram(this.prog);
        gl.uniform1i(this.swap,swap);
	}
	
	// This method is called to draw the triangular mesh.
	// The arguments are the model-view-projection transformation matrixMVP,
	// the model-view transformation matrixMV, the same matrix returned
	// by the GetModelViewProjection function above, and the normal
	// transformation matrix, which is the inverse-transpose of matrixMV.
	draw( matrixMVP, matrixMV, matrixNormal )
	{
		// [TO-DO] Complete the WebGL initializations before drawing
		gl.useProgram( this.prog );
		gl.uniformMatrix4fv( this.mvp, false, matrixMVP );
		gl.uniformMatrix4fv( this.mv, false, matrixMV );
		gl.uniformMatrix3fv( this.mn, false, matrixNormal );
		
		//pass normal buffer to shader
		gl.bindBuffer(gl.ARRAY_BUFFER, this.norm_buffer);
        gl.vertexAttribPointer( this.normals, 3, gl.FLOAT, false, 0, 0 );

		gl.enableVertexAttribArray( this.normals );
		
        //pass texture buffer to shader
		gl.bindBuffer(gl.ARRAY_BUFFER, this.tex_buffer);
        gl.vertexAttribPointer( this.texCoords, 2, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.texCoords );
		
        //pass position buffer to shader
		gl.bindBuffer(gl.ARRAY_BUFFER, this.position_buffer);
        gl.vertexAttribPointer( this.vertPos, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.vertPos );
				
        //		    
		gl.drawArrays( gl.TRIANGLES, 0, this.numTriangles );
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img )
	{
        // [TO-DO] Bind the texture
        this.tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.tex);
        	    
		// You can set the texture image data using the following command.
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
		
		// [TO-DO] Now that we have a texture, it might be a good idea to set
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
		gl.uniform1f(this.shiny,1.0);

	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify if it should use the texture.
		gl.useProgram(this.prog);
        gl.uniform1i(this.show,show);
	}
	
	// This method is called to set the incoming light direction
	setLightDir( x, y, z )
	{
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the light direction.
		var light_dir = new Float32Array([x,y,z]);
		gl.useProgram(this.prog);
		gl.uniform3fv(this.light_dir,light_dir);
	}
	
	// This method is called to set the shininess of the material
	setShininess( shininess )
	{

		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the shininess.
		gl.useProgram(this.prog);
        gl.uniform1f(this.shiny,shininess);
	}
}

// This function is called for every step of the simulation.
// Its job is to advance the simulation for the given time step duration dt.
// It updates the given positions and velocities.
function SimTimeStep( dt, positions, velocities, springs, stiffness, damping, particleMass, gravity, restitution )
{
	var forces = Array( positions.length ); // The total for per particle

	// [TO-DO] Compute the total force of each particle
	
	// [TO-DO] Update positions and velocities
	
	// [TO-DO] Handle collisions
	
}

// Vertex shader source code
var objVS = `
	attribute vec3 pos;
	attribute vec3 norm;
	attribute vec2 txc;
	
	uniform mat4 mvp;
	
	uniform bool swap;
	
	varying vec3 normals;
	varying vec3 position;
	varying vec2 texCoord;
	
	void main()

	{
	    vec3 swap_pos = pos;
	    vec3 swap_normals = norm;

	    //swap y and z coordinates
	    if(swap){

		    float temp = swap_pos.y;
		    swap_pos.y = swap_pos.z;
		    swap_pos.z = temp;

            temp = swap_normals.y;
		    swap_normals.y = swap_normals.z;
		    swap_normals.z = temp;
		}
			    
		texCoord = txc;
		normals = swap_normals;
		position = swap_pos;
		
		gl_Position = mvp * vec4(swap_pos,1);
		
	}
`;
// Fragment shader source code
var objFS = `
    
	precision mediump float;
	
	uniform sampler2D tex;
	uniform bool show;
	uniform float shiny;
	
	uniform mat3 mn;

	uniform mat4 mv;

	

    uniform vec3 light_dir;
	

	varying vec2 texCoord;

	varying vec3 position;

	varying vec3 normals;

	

	void main()

	

	{

	    vec3 v = normalize(-(mv*vec4(position,1.0)).xyz);	    	    

	    vec3 n = normalize(mn*normals);

	    vec3 l = normalize(light_dir);

			    

        vec4 texColor = vec4(1.0);

        float opacity = 1.0;

	    if(show){

	        //show texture

	        texColor = texture2D(tex, texCoord);

	        opacity = texColor.a;

	    }else{

	        texColor = vec4(1.0);

	    }

	    

	    float diffuse = max(dot(l,n),0.0);



	    vec3 h = normalize(l+v);



	    float cos_fi = max(dot(h,n),0.0);



	    float specular = pow(cos_fi,shiny);

	    vec4 reflection = vec4((diffuse*texColor+specular*vec4(1.0)).rgb,opacity);

	    

	    gl_FragColor = reflection;
	}


`;
