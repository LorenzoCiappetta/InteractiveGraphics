// World Gridmap
export default class SpatialHashGrid {
    constructor(bounds, dimension) {
        this._bounds = bounds;
        this._dimension = dimension;
        this._cells = new Map();
    }
    
    NewClient(entity, position, dimension){
        const client = {
            entity: entity,
            position: position,
            dimension: dimension,
            indices: null
        };
        
        this._Insert(client);
        
        return client;
    }
    
    _Insert(client) {
        const [x, y] = client.position;
        const [w, h] = client.dimension;
        
        const i1 = this._GetCellIndex([x - w /2, y - h / 2]);
        const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);
        
        client.indices = [i1, i2];
        
        for(let x = i1[0], xn = i2[0]; x <= xn; ++x){
            for(let y = i1[0], yn = i2[0]; y <= yn; ++y){
                const k = this._Key(x,y);
                
                if(!(k in this._cells)){
                    this._cells[k] = new Set();
                }
                
                this._cells[k].add(client);
            }
        }
    }
    
    _Key(x, y){
        return x + '.' + y;
    }
    
    _GetCellIndex(position){
        const x = Math.sat((position[0] - this._bounds[0]) / (this._bounds[1][0] - this._bounds[0][0]));
        const y = Math.sat((position[1] - this._bounds[1]) / (this._bounds[1][1] - this._bounds[0][1]));
        
        const xIndex = Math.floor(x * (this._dimension[0] - 1));
        const yIndex = Math.floor(y * (this._dimension[1] - 1));
        
        return [xIndex, yIndex];
    }
    
    FindNear(position, bounds) {
        const [x, y] = position;
        const [w, h] = bounds;
        
        const i1 = this._GetCellIndex([x - w /2, y - h / 2]);
        const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);
        
        const clients = new Set();
        
        for(let x = i1[0], xn = i2[0]; x <= xn; ++x){
            for(let y = i1[0], yn = i2[0]; y <= yn; ++y){
                const k = this._Key(x,y);
                
                if(k in this._cells){
                    for(let v of this._cells[k]){
                        clients.add(v);
                    }
                }
            }
        }
        return clients;
    }
    
    UpdateClient(client) {
        this.RemoveClient(client)
        this._Insert(client);
    }
    
    RemoveClient(client) {
        const [i1, i2] = client.indices;
        
        for(let x = i1[0], xn = i2[0]; x <= xn; ++x){
            for(let y = i1[0], yn = i2[0]; y <= yn; ++y){
                const k = this._Key(x,y);
                
                this._cells[k].delete(client);
            }
        }        
    }
    
    // this might defeat the point of the structure but for now is necessary...
    IterateOverClients(fcn) {
        this._cells.forEach((value, key) => {
            value.forEach( value => {
                fcn(value);
            })
        })
    }
}
