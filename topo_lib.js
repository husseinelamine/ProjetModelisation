"use strict"


function vecStringify(v_data)
{
	let str = "(" + v_data[0].toFixed(3);
	for(let k=1;k<v_data.length;++k)
	{
		str+=","+v_data[k].toFixed(3);
	}
	str+=")";
	return str;
}

/**
 * Couture de 2 brins par phi2 (lie 2 faces le lon d'une arête)
 * @param {brin_1} d1 
 * @param {brin_2} d2 
 */
function phi2Sew(d1,d2)
{
	d1.phi2 = d2;
	d2.phi2 = d1;
}

function phi2Unsew(d)
{
	let e = d.phi2;
	e.phi2 = e;
	d.phi2 = d;
}

function phi1Sew(d1,d2)
{
	let a1 = d1.phi1;
	let a2 = d2.phi1;
	d1.phi1 = a2;
	a2.phi_1 = d1;
	d2.phi1 = a1;
	a1.phi_1 = d2;
}

let Attribute_ops = {
	getValue: function(c)
	{
		return c.emb[this.cell.index].data[this.id];
	},

	setValue: function(c,x)
	{
		// if (! c.emb[this.cell.index])
		// {
		// 	embedNewCell(this.cell,c);
		// }
		c.emb[this.cell.index].data[this.id] = x;
	},

	private_swap: function(vpos)
	{
		let tmp_id = this.id;
		this.id = vpos.id;
		vpos.id = tmp_id;
		let tmp_name = this.name;
		this.name = vpos.name;
		vpos.name = tmp_name;
		let tmp_cell = this.cell;
		this.cell = vpos.cell;
		vpos.cell = tmp_cell;
	}

}
let Map2_ops=
{
	counter_id:0,

	clear: function(clear_emb_attributes = true)
	{
		this.storage.length = 0;
		this.counter_id = 0;
		if (clear_emb_attributes)
		{
			this.cells_embedding.length = 0;
			this.cell_attributes_names.length = 0;
			this.availables_cellMarkers.length = 0;
		}
	},

	newDart: function ()
	{
		if (this.storage.length>5000000)
		{
			process.exit();
		}
		let d = {id:this.counter_id++,boundary:false,phi1:null, phi_1:null, phi2:null, emb: []}
		d.phi1=d;
		d.phi_1=d;
		d.phi2=d;
		this.storage.push(d)
		return d;
	},

	deleteDart: function(d)
	{
		let i = this.storage.indexOf(d);
		if (i>=0)
		{
			this.storage.splice(i,1);
		}
	},

	newCycle: function(n)
	{
		let d0 = this.newDart();
		let dp = d0;
		for(let i=1;i<n;++i)
		{
			let dd = this.newDart();
			dd.phi_1 = dp;
			dp.phi1 = dd;
			dp = dd;
		}
		dp.phi1 = d0;
		d0.phi_1 = dp;
		return d0;
	},

	deleteCycle: function(cy)
	{
		let d = cy;
		do
		{
			let i = this.storage.indexOf(d);
			let j = i;
			do
			{
				d = d.phi1;
				++j;
			} while (d!==cy && this.storage[j]===d);
			this.storage.splice(i,(j-i));
		} while (d!==cy);
	},
	
	foreachDart: function(f)
	{
		for (let i=0; i< this.storage.length;++i)
		{
			if (f(this.storage[i]))
			{
				return;
			}
		}
	},

	dump_dart_emb:function(cellType,d)
	{
		let f= (x)=>{ return (""+x).padStart(5," ");}

		let c_emb = d.emb[cellType.index];
		if (! c_emb)
		{
			return "EMPTY / ";
		}
		let str = f(c_emb.id) + " : ";
		for (let j=0; j<c_emb.data.length;++j)
		{
			let loc = c_emb.data[j];
			if (loc === null || loc === undefined)
			{
				str += "NULL  ";
			}
			else
			{
				if (loc.data) // Vector & Matrix
				{
					str += vecStringify(loc.data);
				}
				else
				{
					str += loc;
				}
			}
			str+=" / ";
		}
		return str;
	}
,

	dump: function()
	{
		let f= (x)=>{ return (""+x).padStart(4," ");}

		let str = "  id ph1 ph_1 ph2 B EMB:";
		this.cells_embedding.forEach( C=>
		{
			str += C.name+" : ";
			this.cell_attributes_names[C.index].forEach( name => { str+= name+" ";});
		});
		console.log(str);

		this.foreachDart(d =>
		{
			str = f(d.id)+f(d.phi1.id)+f(d.phi_1.id)+f(d.phi2.id);
			str += d.boundary ? " B" : " -"

			this.cells_embedding.forEach( C=>
			{
				str += this.dump_dart_emb(C, d);
			});
			console.log(str);
		});
	},

	foreachCell: function(cellType, func, force_dart_marker=false)
	{
		let mark1 =  (! this.isCellsEmbeded(cellType)) || force_dart_marker ? DartMarker() : CellMarker(this,cellType);
		if (cellType.dim===2)
		{
			for (let i=0; i< this.storage.length;++i)
			{
				let d = this.storage[i];
				if ((!mark1.isMarked(d)) && (! d.boundary))
				{
					mark1.markCell(cellType,d)
					if (func(d))
					{
						i = this.storage.length;
					}
				}
			}
			mark1.clear();
		}
		else
		{
			for (let i=0; i< this.storage.length;++i)
			{
				let d = this.storage[i];
				if (!mark1.isMarked(d))
				{
					mark1.markCell(cellType,d)
					if (func(d))
					{
						i = this.storage.length;
					}
				}
			}
			mark1.clear();
		}

	},

	closeHole: function(e,boundmark=false)
	{
		if (e.phi2 !== e)
		{
			console.error("this is not a hole (while trying closeHole)");
			return;
		}
		let bound = [e];
		let d = e.phi1;
		do
		{
			let dd= d.phi2;
			if (dd === d)
			{
				bound.push(d);
			}
			d = dd.phi1;
		} while (d !=e)
	
		let nf = this.newCycle(bound.length);
		for(let i=0; i<bound.length;++i)
		{
			phi2Sew(nf,bound[i]);
			nf = nf.phi_1;
		}
		if (boundmark)
		{
			for(let i=0; i<bound.length;++i)
			{
				phi2Sew(nf,bound[i]);
				nf.boundary = true;
				nf = nf.phi_1;
			}
		}
		else
		{
			for(let i=0; i<bound.length;++i)
			{
				phi2Sew(nf,bound[i]);
				nf = nf.phi_1;
			}
		}
		return e.phi2;
	},
	

	closeMap: function()
	{
		this.foreachDart(d =>
		{
			if (d.phi2 === d)
			{
				this.closeHole(d,true)
			}
		});
	},

	addAttribute: function(cellType,name)
	{
		if  (this.cells_embedding.indexOf(cellType)<0)
		{
			console.error("trying to add attribute on non embedded cell");
			return;
		}

		let AttributeNames = this.cell_attributes_names[cellType.index];

		if  (AttributeNames.indexOf(name)>=0)
		{
			console.error("trying to add existing attribute name: "+name);
			return;
		}
		
		for (let i=0; i<AttributeNames.length;++i)
		{
			if (AttributeNames[i]==="")
			{
				AttributeNames[i]= name;
				return Object.assign(Object.create(Attribute_ops),
				{name, cell:cellType.index, id:i});
			}
		}
		AttributeNames.push(name);
		return Object.assign(Object.create(Attribute_ops),
				{name, cell:cellType, id:AttributeNames.length - 1});
	},

	removeAttribute: function(att)
	{
		let index = att.cell.index;
		let id = att.id;
		let AttributeNames = this.cell_attributes_names[index];
		AttributeNames[id]= "";
		this.foreachDart(d=>
		{
			d.emb[index].data[id]=null;
		});
	},

	getAttribute: function(cellType,param)
	{
		let AttributeNames = this.cell_attributes_names[cellType.index];
		if (!AttributeNames)
		{
			return null
		}
		if (Number.isInteger(param))
		{
			let name = AttributeNames[param];
			return Object.assign(Object.create(Attribute_ops), {name, cell:cellType, id:param}, dim);
		} 

		let id = AttributeNames.indexOf(param);
		if (id >= 0)
		{
			return Object.assign(Object.create(Attribute_ops), {name:param, cell:cellType, id});
		}
		return null;
	},

	swapAttributes: function(att1, att2)
	{
		if (att1.cell !== att2.cell)
		{
			console.error("can not swap attribute "+att1.name+" on "+att2.cell.name+
			" & "+att2.name+" on "+att2.cell.name)
			return; // ERROR ?
		}
		let AttributeNames = this.cell_attributes_names[att1.cell.index];
		let tmp = AttributeNames[att2.id];
		AttributeNames[att2.id] = AttributeNames[att1.id];
		AttributeNames[att1.id] = tmp;
		att1.private_swap(att2);
	},

	initAttribute: function(att,val)
	{
		this.foreachCell(att.cell, c =>
		{
			att.setValue(c,val);
		});
	},

	embedCells: function(cellType)
	{
		let index = this.cells_embedding.indexOf(cellType);
		if (index < 0)
		{
			index = 0;
			let found = false;
			while ( !found && index<this.cells_embedding.length)
			{
				if (this.cells_embedding[index]===null)
				{
					found = true;
				}
				else
				{
					++index;
				}
			}
			cellType.index = index;
			this.cells_embedding[index]=cellType;
			this.cell_attributes_names[index]=[];
			cellType.index = index;
			this.foreachCell(cellType, c =>
			{
				embedNewCell(cellType,c);
			},true);
		}
		// else
		// {
		// 	console.error(cellType.name+" is already embedded")
		// }
		
	},

	unembedCells: function(cellType)
	{
		this.cells_embedding[cellType.index] = null;
		this.foreachDart(d=>
		{
			d.emb[cellType.index]=null;
		});
		cellType.index = -1;
	},

	isCellsEmbeded: function(cellType)
	{
		return this.cells_embedding[cellType.index] != null; // WARNING DO NOT USE !== (undefined == null but not ===)
	},

}

function CMap2()
{
	let Vertex1 = 
	{
		name:"Vertex1",
		dim:-1,
		index: -1,
		counter_emb_id:0,
		foreachDart: function(c,func) {	func(c); }
	};

	let Vertex = 
	{
		name:"Vertex",
		dim:0,
		index: -1,
		counter_emb_id:0,
		foreachDart: function(c,func) {
			let v = c;
			do
			{
				func(v);
				v=v.phi2.phi1;
			} while (v!==c);
		},
	};

	let Edge = 
	{
		name:"Edge",
		dim:1,
		index: -1,
		counter_emb_id:0,
		foreachDart: function(c,func) {
			func(c);
			func(c.phi2);
		}
	};

	let Face = 
	{
		name:"Face",
		dim:2,
		index: -1,
		counter_emb_id:0,
		foreachDart: function(c,func) {
			let f = c;
			do
			{
				func(f);
				f=f.phi1;
			} while (f!==c);
		}
	};

	let Volume = 
	{
		name:"Volume",
		dim:3,
		index: -1,
		counter_emb_id:0,
		foreachDart: function(c,func) {
			let mark1 = DartMarker();
			let ld = [c];
			while (ld.length>0)
			{
				let d = ld.shift();
				if (!mark1.isMarked(d))
				{
					func(d);
					ld.push(d.phi1);
					ld.push(d.phi2);
					mark1.markDart(d);
				}
			}
			mark1.clear();
		}
	};

	return Object.assign(Object.create(Map2_ops),{Vertex1,Vertex,Edge,Face,Volume,
		storage:[],cells_embedding:[],cell_attributes_names:[],availables_cellMarkers:[]});
}
/**
 * Renvoit le plongement de type cellType du brin d_src
 * @param {in} cellType 
 * @param {in} src 
 */
function getDartEmbedding(cellType,d_src)
{
	return d_src.emb[cellType.index];
}

function copyDartEmbedding(cellType,d_src,d_dst)
{
	d_dst.emb[cellType.index] = d_src.emb[cellType.index];
}

function setDartEmbedding(cellType,d_dst,emb)
{
	d_dst.emb[cellType.index] = emb;
}


// function embed__cell(cellType, c, e)
// {
// 	e = e ? e : {id:cellType.counter_emb_id++,data:[]};
// 	cellType.foreachDart(c, d => {setDartEmbedding(cellType,d,e)});
// }

function embedNewCell(cellType, c)
{
	let e = {id:cellType.counter_emb_id++,data:[]};
	cellType.foreachDart(c, d => {setDartEmbedding(cellType,d,e)});
}

function embedCell(cellType, c, e)
{
	cellType.foreachDart(c, d => {setDartEmbedding(cellType,d,e)});
}


function valence(cellType, c)
{
	let n=0;
	cellType.foreachDart(c,d => {++n;});
	return n;
}


let DartMarker_ops =
{
	counter:0,
	
	markDart:function(d)
	{
		if (! d[this.name])
		{
			d[this.name]=true;
			this.list.push(d);
		}
	},

	unmarkDart:function(d)
	{
		delete d[this.name];
	},

	isMarked: function(d)
	{
		return d[this.name];
	},
	
	markCell: function(cellType,c)
	{
		cellType.foreachDart(c, (d)=>{this.markDart(d);});
	},
	
	unmarkCell: function(cellType, c)
	{
		cellType.foreachDart(c, (d)=>{this.unmarkDart(d);});
	},

	clear: function()
	{
		while (this.list.length)
		{
			let d = this.list.pop();
			delete d[this.name];
		}
	}
}

function DartMarker()
{
	return Object.assign(Object.create(DartMarker_ops),{
			name:"mark"+DartMarker_ops.counter++, list:[]});
}

let CellMarker_ops =
{
	counter:0,
	availables:[],
	
	isMarked: function(c)
	{
		return this.attribute.getValue(c);
	},

	markCell: function(cellType,c)
	{
		if (! this.attribute.getValue(c))
		{
			this.attribute.setValue(c,true);
			this.list.push(c);
		}
	},
	
	unmarkCell: function(cellType, c)
	{
		this.attribute.setValue(c,true);
	},

	clear: function()
	{
		while (this.list.length)
		{
			this.attribute.setValue(this.list.pop(),false);
		}

		this.parent_map.availables_cellMarkers.push(this.attribute.name);
	}
}


function CellMarker(m,cellType)
{
	let cm_att = (m.availables_cellMarkers.length > 0) ? m.getAttribute(cellType,m.availables_cellMarkers.pop()) :
													  m.addAttribute(cellType,"cellmark"+CellMarker_ops.counter++);
	return Object.assign(Object.create(CellMarker_ops),{parent_map:m,
			attribute:cm_att, list:[]});
}

function foreachIncidentCells(cellTypeI, cellType, m, c, func)
{
	if (cellTypeI.dim<cellType.dim)
	{
		let mark1 = CellMarker(cellTypeI,m);
		cellType.foreachDart(c, (d)=>
		{
			if (!mark1.isMarked(d))
			{
				mark1.markCell(cellTypeI, d);
				func(d);
			}
		});
		mark1.clear();
	}
	else
	{
		if (cellTypeI.dim === 3)
		{
			func(c);
		}
		else
		{
			cellType.foreachDart(c, (d)=> { func(d); });
		}
	}
}

function foreachAjacentCellThrough(cellTypeThru, cellType, m, c, func)
{
	let mark1 = CellMarker(m,cellType);
	mark1.markCell(cellType, c);
	foreachIncidentCells(cellTypeThru, cellType, c, tc=>
	{
		foreachIncidentCells(cellType, cellTypeThru, m, ct, ac=>
		{
			if (!mark1.isMarked(ac))
			{
				let act = {cellType:cellTypeThru,dart:ac};
				func(act);
			}
		});
	});
	mark1.clear();
}



function faceCentroid(m,f,vpos)
{
	let n = 0;
	let center = Vec3(0,0,0);
	m.Face.foreachDart(f, d=>
	{
		center.self_add(vpos.getValue(d));
		n++;
	});
	return center.scalarmult(1.0/n);
}

// function computeFaceNormal(m,f,vpos)
// {
// 	let normal = Vec3(0,0,0);
// 	m.Face.foreachDart(f, d=>
// 	{
// 		let A = vpos.getValue(d);
// 		let B = vpos.getValue(d.phi1);
// 		let C = vpos.getValue(d.phi_1);
// 		normal.self_add(B.sub(A).cross(C.sub(A)));
// 	})
// 	return normal.normalized();
// }




function verticesPosition(m, vpos)
{
	let verts = [];
	m.foreachCell(m.Vertex, v =>
	{
		verts.push(v);
	});

	let buff = create_Vec_buffer(3,verts.length);
	verts.forEach(v => {buff.push(vpos.getValue(v));});
	return buff;
}

function edgesPosition(m, vpos)
{
	let edges = [];
	m.foreachCell(m.Edge, e =>
	{
		edges.push(e);
		edges.push(e.phi2);
	});

	let buff = create_Vec_buffer(3,edges.length);
	edges.forEach(d => {buff.push(vpos.getValue(d));});
	return buff;
}

function facesPosition(m,vpos)
{
	let faces = [];
	m.foreachCell(m.Face, f =>
	{
		let d1 = f.phi1;
		let d2 = d1.phi1;
		while (d1 !== f)
		{
			faces.push(f);
			faces.push(d1);
			faces.push(d2);
			d1=d2;
			d2=d1.phi1;
		}
	});

	let buff = create_Vec_buffer(3,faces.length);
	faces.forEach(d => {buff.push(vpos.getValue(d));});
	return buff;
}


function dartHighlightPosition(m,d,explf,expld,vpos,Ce)
{
	expld = Math.min(1,expld*1.1);
	let explF = Math.min(1,explf*1.1);
	explf = explf*0.9;
	Ce = Ce ? Ce : faceCentroid(m,d,vpos);

	let Pa = vpos.getValue(d);
	let Pb = mix(vpos.getValue(d),vpos.getValue(d.phi1),expld);
	let A = mix(Ce,Pa,explf);
	let B = mix(Ce,Pb,explf);
	let C = mix(Ce,Pb,explF);
	let D = mix(Ce,Pa,explF);

	return [A,B,C,D];
}

function someDartsHighlightPosition(m,explf,expld, f_sel, vpos)
{
	let n=0;
	let darts = [];
	m.foreachCell(m.Face, f=>
	{
		let fdarts=[];
		m.Face.foreachDart(f, d=>
		{
			if (f_sel(d))
			{
				fdarts.push(d);
				n++;
			}
		});
		if (fdarts.length>0)
		{
			darts.push(fdarts);
		}
	});

	let buff = create_Vec_buffer(3,n*6);

	darts.forEach( f =>
	{
		let C = faceCentroid(m,f[0],vpos);
		f.forEach( d =>
		{
			let fd = dartHighlightPosition(m,d,explf,expld,vpos,C);
			buff.push(fd[0]);
			buff.push(fd[1]);
			buff.push(fd[2]);
			buff.push(fd[0]);
			buff.push(fd[2]);
			buff.push(fd[3]);
		});
	});
	return buff;
}

function nbCells(m, cellType)
{
	let nb = 0;
	m.foreachCell(cellType,c =>	{ nb++; });
	return nb;
}

