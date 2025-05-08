// This function takes the projection matrix, the translation, and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// The given projection matrix is also a 4x4 matrix stored as an array in column-major order.
// You can use the MatrixMult function defined in project4.html to multiply two 4x4 matrices in the same format.
function GetModelViewProjection( projectionMatrix, translationX, translationY, translationZ, rotationX, rotationY )
{
	// [TO-DO] Modify the code below to form the transformation matrix.
	var trans = [
		Math.cos(rotationY), Math.sin(rotationY)*Math.sin(rotationX), -Math.cos(rotationX)*Math.sin(rotationY), 0,
		0, Math.cos(rotationX), Math.sin(rotationX), 0,
		Math.sin(rotationY), -Math.cos(rotationY)*Math.sin(rotationX), Math.cos(rotationX)*Math.cos(rotationY), 0,
		translationX, translationY, translationZ, 1
	];
	var mvp = MatrixMult( projectionMatrix, trans );
	return mvp;
}


// [TO-DO] Complete the implementation of the following class.

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		//initializations like in BoxDrawer constructor() from html file
		
		//shader program
	    this.prog = InitShaderProgram( objVS, objFS );
	    
	    //uniform variables
	    this.mvp = gl.getUniformLocation( this.prog, 'mvp' );
	    this.sampler = gl.getUniformLocation(this.prog, 'tex');
	    
	    this.swap = gl.getUniformLocation(this.prog, 'swap');
	    this.show = gl.getUniformLocation(this.prog, 'show');
	    
	    //attributes
	    this.vertPos = gl.getAttribLocation( this.prog, 'pos' );
	    this.texCoords = gl.getAttribLocation(this.prog, 'txc');
	    
	    //create Buffers for vertex position and texture coordinates
	    this.position_buffer = gl.createBuffer();
	    this.tex_buffer = gl.createBuffer();
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions
	// and an array of 2D texture coordinates.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords )
	{
	    //Update the contents of the vertex buffer objects.
		this.numTriangles = vertPos.length / 3;
		this.vertPos = vertPos;
		this.texCoords = texCoords;
        			    
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
		//changes orientations every time function is called
        gl.useProgram(this.prog);
        gl.uniform1i(this.swap,swap);
        
	}
	
	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw( trans )
	{
		// [TO-DO] Complete the WebGL initializations before drawing
		gl.useProgram( this.prog );
		gl.uniformMatrix4fv( this.mvp, false, trans );

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
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );
		
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
	
}

// Vertex shader source code
var objVS = `
	attribute vec3 pos;
	attribute vec2 txc;
	
	uniform mat4 mvp;
	uniform bool swap;
	
	varying vec2 texCoord;
	
	void main()
	{
	    vec3 swap_pos = pos;
	    //swap y and z coordinates
	    if(swap){
		    float temp = swap_pos.y;
		    swap_pos.y = swap_pos.z;
		    swap_pos.z = temp;
		}
		gl_Position = mvp * vec4(swap_pos,1);
		texCoord = txc;
	}
`;
// Fragment shader source code
var objFS = `
	precision mediump float;
	
	uniform sampler2D tex;
	uniform bool show;
	
	varying vec2 texCoord;
	
	void main()
	{
	    if(show){
	        //show texture
	        gl_FragColor = texture2D(tex, texCoord);
	    }else{
	        //show some nice colours
	        gl_FragColor = vec4(gl_FragCoord.z*gl_FragCoord.z,0,0.2,1);
	    }		
	}
`;
