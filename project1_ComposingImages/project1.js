// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite( bgImg, fgImg, fgOpac, fgPos )
{
    //auxiliary variables
    var w = fgImg.width;
    var h = fgImg.height;
    
    var x = fgPos.x;
    var y = fgPos.y;
    
    var data = bgImg.data;
    
    //double for loop on every fgImg pixel
    for(var i = 0; i < w; i++){
        for(var j = 0; j < h; j++){
        
            //bgImg pixel is in the same position of fgImg pixel but translated by fgPos
            let xb = i+x;
            let yb = j+y;
            
            //check whether the foreground image is contained inside the background one
            if(xb >= 0 && yb >= 0 && xb < bgImg.width && yb < bgImg.height){
            
                //retrieve and normalize alpha values
                let af = (fgImg.data[(4*i) + (4*w*j) + 3]/255)*fgOpac;
                let ab = data[(4*xb) + (4*bgImg.width*yb) + 3]/255;
                
                let a = af + (1 - af)*ab;
                
                //take separately each color channel
                let cfr = fgImg.data[(4*i) + (4*w*j) + 0];
                let cfg = fgImg.data[(4*i) + (4*w*j) + 1];
                let cfb = fgImg.data[(4*i) + (4*w*j) + 2];
                
                let cbr = data[(4*xb) + (4*bgImg.width*yb) + 0]; 
                let cbg = data[(4*xb) + (4*bgImg.width*yb) + 1];
                let cbb = data[(4*xb) + (4*bgImg.width*yb) + 2];
                
                //apply alpha blending
                data[(4*xb) + (4*bgImg.width*yb) + 0] = (af*cfr + (1-af)*ab*cbr)/a;
                data[(4*xb) + (4*bgImg.width*yb) + 1] = (af*cfg + (1-af)*ab*cbg)/a;
                data[(4*xb) + (4*bgImg.width*yb) + 2] = (af*cfb + (1-af)*ab*cbb)/a;
                
                /*//alpha blending without background alpha value
                data[(4*xb) + (4*bgImg.width*yb) + 0] = (af*cfr + (1-af)*cbr);
                data[(4*xb) + (4*bgImg.width*yb) + 1] = (af*cfg + (1-af)*cbg);
                data[(4*xb) + (4*bgImg.width*yb) + 2] = (af*cfb + (1-af)*cbb);
                */
            }
        }
    }
}
