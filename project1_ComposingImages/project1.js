// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite( bgImg, fgImg, fgOpac, fgPos )
{
    //alert(fgPos.x);
    var w = fgImg.width;
    var h = fgImg.height;
    
    var x = fgPos.x;
    var y = fgPos.y;
    
    var data = bgImg.data;
    
    for(var i = 0; i < w; i++){
        for(var j = 0; j < h; j++){
            for(var c = 0; c < 4; c++){
                xb = i+x;
                yb = j+y;
                if(xb >= 0 && yb >= 0 && xb < bgImg.width && yb < bgImg.height){
                    if(c < 3){
                        data[(4*xb) + (4*bgImg.width*yb) + c] += fgImg.data[(4*i) + (4*w*j) + c];
                    }
                    else {
                        data[(4*xb) + (4*bgImg.width*yb) + c] += fgImg.data[(4*i) + (4*w*j) + c]*fgOpac;
                    }
                }
            }
        }
    }
}
