// World Gridmap
export default class SpatialGrid {
    constructor(bounds, dimensions) {
        const [x, y] = dimensions;
        this._bounds = bounds;
        this._dimensions = dimensions;
        // preventively allocating enough space for all the cells
        this._cells = [...Array(x)].map(_ => [...Array(y)].map(_ => (null)));
        this._queryIds = 0;
    }
    
    newClient(entity){
    
        if( entity.getPosition == undefined || entity.getDimensions == undefined){
            throw new Error("Entities in grid are required to have dimensions and a position");        
        }
        
        const client = {
            entity: entity,
            _cells: {
                min: null,
                max: null,
                nodes: null,
            },
            _queryId: -1
        };
        
        this._Insert(client);
        return client;
    }
    
    _Insert(client) {

        const [x, y, z] = client.entity.getPosition();
        const [w, h, d] = client.entity.getDimensions();
        const i1 = this._GetCellIndex([x - w /2, z - d / 2]);
        const i2 = this._GetCellIndex([x + w / 2, z + d / 2]);
        //console.log("a client is between cells",i1, i2);
        const nodes = [];
        
        for(let x = i1[0], xn = i2[0]; x <= xn; ++x){
            
            nodes.push([]);
            
            for(let y = i1[1], yn = i2[1]; y <= yn; ++y){
                const xi = x - i1[0];
                const head = {
                    next: null,
                    prev: null,
                    client: client
                };
                
                nodes[xi].push(head);
                head.next = this._cells[x][y];
                if(this._cells[x][y]){
                    this._cells[x][y].prev = head;
                }
                
                this._cells[x][y] = head;
            }
        }
        
        client._cells.min = i1;
        client._cells.max = i2;
        client._cells.nodes = nodes;

    }
    
    _GetCellIndex(position){
        const x = (position[0] - this._bounds[0][0]) / (this._bounds[1][0] - this._bounds[0][0]);
        const y = (position[1] - this._bounds[0][1]) / (this._bounds[1][1] - this._bounds[0][1]);
        
        let xIndex = 0;
        let yIndex = 0;
        
        if(x < 1 && x >= 0){
            xIndex = Math.floor(x * (this._dimensions[0]));
        } else if (x >= 1){
            xIndex = this._dimensions[0] - 1;
        }
        
        if( y < 1 && y >= 0){
            yIndex = Math.floor(y * (this._dimensions[1]));
        } else if (y >= 1){
            yIndex = this._dimensions[1] - 1;
        }
        
        return [xIndex, yIndex];
    }
    
    FindNear(position, bounds) {
        const [x, y] = position;
        const [w, h] = bounds;
        
        const i1 = this._GetCellIndex([x - w /2, y - h / 2]);
        const i2 = this._GetCellIndex([x + w / 2, y + h / 2]);
        
        const clients = [];
        const queryId = this._queryIds++;
        
        for(let x = i1[0], xn = i2[0]; x <= xn; ++x){
            for(let y = i1[1], yn = i2[1]; y <= yn; ++y){
                let head = this._cells[x][y];
                
                while(head){
                    const v = head.client;
                    head = head.next;
                    if(v._queryId != queryId){
                        v._queryId = queryId;
                        clients.push(v);
                    }
                }
            }
        }
        return clients;
    }
    
    UpdateClient(client) {
        
        const [x, y, z] = client.entity.getPosition();
        const [w, h, d] = client.entity.getDimensions();
        
        const i1 = this._GetCellIndex([x - w / 2, z - d / 2]);
        const i2 = this._GetCellIndex([x + w / 2, z + d / 2]);
        
        // check if client moved to different cell
        if( client._cells.min[0] == i1[0] &&
            client._cells.min[1] == i1[1] &&
            client._cells.max[0] == i2[0] &&
            client._cells.max[1] == i2[1]){
            return;   
        }
    
        this.RemoveClient(client);
        this._Insert(client);

    }
    
    RemoveClient(client) {
        const i1 = client._cells.min;
        const i2 = client._cells.max;
        
        for(let x = i1[0], xn = i2[0]; x <= xn; ++x){
            for(let y = i1[1], yn = i2[1]; y <= yn; ++y){
                const xi = x - i1[0];
                const yi = y - i1[1];
                const node = client._cells.nodes[xi][yi];
            
                if (node.next){
                    node.next.prev = node.prev;
                }
                
                if (node.prev){
                    node.prev.next = node.next;
                }
                
                if (!node.prev) {
                    this._cells[x][y] = node.next;
                }
            }
        }    
        client._cells.min = null;
        client._cells.max = null;
        client._cells.nodes = null; 
    }
    
}
