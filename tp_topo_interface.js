"use strict"

var color_vert=`#version 300 es
layout(location=0) in vec3 position_in;
uniform mat4 matrix;
uniform float point_size;
uniform float dz;
void main()
{
	vec4 P4 = matrix*vec4(position_in, 1.0);
	P4.z -= dz;
	gl_Position = P4;
	gl_PointSize = point_size;
}
`;

var color_frag=`#version 300 es
precision highp float;
out vec4 frag_out;
uniform vec3 color;
void main()
{
	frag_out = vec4(color,1);
}
`;

var flat_vert = `#version 300 es
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
layout(location=0) in vec3 position_in;
out vec3 P;
void main()
{
	vec4 P4 = viewMatrix * vec4(position_in, 1.0);
	gl_Position = projectionMatrix * P4;
	P = P4.xyz;
}`;

var flat_frag = `#version 300 es
precision highp float;
in vec3 P;
out vec4 frag_out;
uniform vec3 color;
uniform vec3 colorb;
const vec3 light_pos = vec3(0.2,0.7,0.0);

void main()
{
	vec3 N = normalize(cross(dFdx(P),dFdy(P)));
	vec3 L = normalize(light_pos-P);
	float lamb = 0.2+0.8*max(dot(N,L),0.0);
	
	frag_out = vec4((gl_FrontFacing ? color: colorb)*lamb,1);
}`;

var colorpv_vert=`#version 300 es
layout(location=0) in vec3 position_in;
layout(location=1) in vec3 color_in;
uniform mat4 matrix;
out vec3 color;
void main()
{
	vec4 P4 = matrix*vec4(position_in, 1.0);
	// P4 /= P4.w;
	// P4.z -= 0.001;
	gl_Position = P4;
	color = color_in;
}
`;

var colorpv_frag=`#version 300 es
precision highp float;
in vec3 color;
out vec4 frag_out;
void main()
{
	frag_out = vec4(color,1);
}
`;

//
// global variables
//
var prg = null;
var prg_flat = null;
var prg_pv = null;
var LoopN = null;
var vaos = [null,null,null];
var nbs = [0,0,0];
var vao_seg = null;
var vao_p = null;
var global_cmap2 = CMap2();
var sl_explf = null;
var sl_expld = null;
var drawed =[null,null,null,null];
var nb_not_boundary_darts = 0;

var mesh_render = null;

var sdarts=[];
var sid = 0;
var Colors=[Vec3(1,0,0),Vec3(0,1,0),Vec3(0,0,1),Vec3(1,1,0),Vec3(1,0,1),Vec3(0,1,1)];
var HTMLColors = ["#f44","#4f4","#66f","#ff4","#f4f","#4ff"]
var vao_sel = null;
var lab_isel = null;
var flat_cb = null;

var vao_marked = [];
var mark_for_show = [];

var vertex_position = null;
var vertex_normal = null;
var bevel_scale = 0.7;


// function computeNormalVertices(m2,vpos, vnorm)
// {
// 	m2.foreachCell(m2.Vertex, v =>
// 	{
// 		let normal = Vec3(0,0,0);
// 		m2.Vertex.foreachDart(v, d =>
// 		{
// 			let A = vpos.getValue(d);
// 			let B = vpos.getValue(d.phi1);
// 			let C = vpos.getValue(d.phi_1);
// 			normal.self_add(B.sub(A).cross(C.sub(A)));
// 		});
// 		vnorm.setValue(v,normal.normalized());
// 	});
// }


function allDartsPosition(cmap2,explf,expld, vpos)
{
	let n = cmap2.storage.length;
	let pos = create_Vec_buffer(3,2*n);
	cmap2.foreachCell(cmap2.Face, f =>
	{
		let C = faceCentroid(cmap2,f,vpos);
		cmap2.Face.foreachDart(f, d=>
		{
			const Pa = mix(C,vpos.getValue(d),explf);
			const Pb = mix(C,vpos.getValue(d.phi1),explf);
			const NPb = mix(Pa,Pb,expld);
			pos.push(Pa);
			pos.push(NPb)
		});
	});
	nb_not_boundary_darts = pos.last/6; // 2 * x,y,z
	return pos;
}



function MeshOfMap2(cmap2,vpos, vnorm, vtc)
{
	// computeNormalVertices(global_cmap2,vpos,vnorm);
	let nbv = nbCells(cmap2,cmap2.Vertex);
	let pos = create_Vec_buffer(3,nbv);
	let norm = null;//create_Vec_buffer(3,nbv);
	let tc = null;//create_Vec_buffer(2,nbv);

	let order_v = cmap2.getAttribute(cmap2.Vertex,"tempoAttributeRender");
	if (order_v === null)
	{
		order_v = cmap2.addAttribute(cmap2.Vertex,"tempoAttributeRender");
	}
	let count = 0;
	cmap2.foreachCell(cmap2.Vertex, v=>
	{
		order_v.setValue(v,count++);
		pos.push(vpos.getValue(v));
		if (vnorm)
		{
			norm.push(vnorm.getValue(v));
		}
		if (vtc)
		{
			tc.push(vtc.getValue(v));
		}
	})
	
	let nb_ind=0;
	cmap2.foreachCell(cmap2.Face, f =>
	{
		nb_ind += 3*(valence(cmap2.Face,f)-2);
	})
	let indices_tri = create_uint32_buffer(nb_ind);

	
	cmap2.foreachCell(cmap2.Face, f =>
	{
		let d1 = f.phi1;
		let d2 = d1.phi1;
		do
		{
			indices_tri.push(order_v.getValue(f));
			indices_tri.push(order_v.getValue(d1));
			indices_tri.push(order_v.getValue(d2));
			d1=d2;
			d2=d1.phi1;
		}while (d2 !== f);
	});

	nb_ind = nbCells(cmap2,cmap2.Edge);
	let indices_line = create_uint32_buffer(2*nb_ind);

	cmap2.foreachCell(cmap2.Edge, e =>
	{
		indices_line.push(order_v.getValue(e));
		indices_line.push(order_v.getValue(e.phi1));
	});

	return Object.assign(Object.create(Mesh_ops), {positions:pos, vbo_p:null, 
		normals: norm, vbo_n:null,
		texcoords:tc, vbo_t:null,
		tris: indices_tri, lines: indices_line, BB:BBofPos(pos)});
}


function update_map()
{

	if (global_cmap2.storage.length === 0)
	{
		vao_seg = VAO();
		vao_p = VAO();
		return;
	}
	
	mesh_render = MeshOfMap2(global_cmap2,vertex_position,null,null).renderer(0,1,-1,-1);

	if (drawed[3].checked)
	{
		let vbo = VBO(allDartsPosition(global_cmap2,0.01*sl_explf.value,0.01*sl_expld.value,vertex_position),3);
		vao_seg = VAO([0,vbo]);
		vao_p = VAO([0,vbo,0,6,0]);
	}
	update_sdarts();	
	update_marked();
	update_wgl();
}

function show_marked(mark)
{
	mark_for_show.push(mark);
	let buff = someDartsHighlightPosition(global_cmap2,0.01*sl_explf.value,0.01*sl_expld.value, d => mark.isMarked(d),vertex_position)
	let vbo = VBO(buff,3);
	vao_marked.push(VAO([0,vbo]));
	update_wgl();
}

function clear_marked()
{
	mark_for_show.length=0;
	vao_marked.length=0;
}

function update_marked(MAP2)
{
	for (let i=0; i<mark_for_show.length; ++i)
	{
		let buff = someDartsHighlightPosition(global_cmap2,0.01*sl_explf.value,0.01*sl_expld.value,
			 d => mark_for_show[i].isMarked(d),vertex_position)
		let vbo = VBO(buff,3);
		vao_marked[i] = VAO([0,vbo]);
	}
}


function update_sdarts()
{
	let buffp = create_Vec_buffer(3,4*sdarts.length);
	let buffc = create_Vec_buffer(3,4*sdarts.length);

	for( let i = 0; i<sdarts.length; ++i)
	{
		let dp = dartHighlightPosition(global_cmap2,sdarts[i],0.01*sl_explf.value,0.0095*sl_expld.value,vertex_position)
		dp.forEach(vec => {buffp.push(vec);});
		const col = Colors[i%6];
		buffc.push(col);
		buffc.push(col);
		buffc.push(col);
		buffc.push(col);
	}
	let vbop = VBO(buffp,3);
	let vboc = VBO(buffc,3);
	vao_sel = VAO([0,vbop],[1,vboc]);
	update_wgl();
}

function add_sel(d)
{
	if (sdarts.indexOf(d)===-1)
	{
		sdarts.push(d);
		update_sdarts();
	}
}

function clear_sel()
{
	sdarts.length=0;
	vao_sel=null;
}

function BBofPos(pos)
{
	let nb = pos.length/3;
	let Min = Vec3(pos[0],pos[1],pos[2]);
	let Max = Vec3(pos[0],pos[1],pos[2]);
	for (let i=0; i<pos.length;++i)
	{
		Min[i%3] = Math.min(Min[i%3],pos[i]);
		Max[i%3] = Math.max(Max[i%3],pos[i]);
	}
	return create_BB(Min,Max);
}

function resetMap()
{
	global_cmap2.clear();
	global_cmap2.embedCells(global_cmap2.Vertex);
	vertex_position = global_cmap2.addAttribute(global_cmap2.Vertex,"position");
}


function init_wgl()
{
	tp_init();

	UserInterface.begin(false,false);
	sl_explf = UserInterface.add_slider('Expl faces',60,100,90, update_map);
	sl_expld = UserInterface.add_slider('Expl D=arts',60,100,95,update_map);
	LoopN = UserInterface.add_slider('Loop N',1 ,10,1,update_map);
	drawed[3] = UserInterface.add_check_box("Topo",true,update_map);
	drawed[0] = UserInterface.add_check_box("Vertices",true,update_wgl);
	drawed[1] = UserInterface.add_check_box("Edges",true,update_wgl);
	drawed[2] = UserInterface.add_check_box("Faces",true,update_wgl);
	UserInterface.end();

	prg = ShaderProgram(color_vert,color_frag,'color');
	prg_flat = ShaderProgram(flat_vert,flat_frag,'flat');
	prg_pv = ShaderProgram(colorpv_vert,colorpv_frag,'colorpv');

	update_map();

	ewgl.scene_camera.set_scene_radius(5);

	gl.enable(gl.POLYGON_OFFSET_FILL);
	gl.polygonOffset(1.0,1.0);
}

function draw_wgl()
{
	gl.clearColor(0,0,0,0);
	gl.enable(gl.DEPTH_TEST);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const projection = ewgl.scene_camera.get_projection_matrix();
	const view = ewgl.scene_camera.get_view_matrix();
	const mpv = Matrix.mult(projection,view);
	
	prg.bind();
	Uniforms.matrix = mpv;
	Uniforms.dz=0;

	if (drawed[3].checked)
	{
		Uniforms.color = [1,1,1];
		vao_p.bind();
		Uniforms.point_size = 5.0;
		gl.drawArrays(gl.POINTS,0,nb_not_boundary_darts)
		vao_seg.bind();
		gl.drawArrays(gl.LINES,0,nb_not_boundary_darts*2)
	}

	if (drawed[0].checked && mesh_render)
	{
		Uniforms.color = [1,0,0];
		Uniforms.point_size = 7.0;
		mesh_render.draw(gl.POINTS);
	}

	if (drawed[1].checked && mesh_render)
	{
		Uniforms.color = [1,1,0];
		mesh_render.draw(gl.LINES);
	}

	if (drawed[2].checked && mesh_render)
	{
		gl.enable(gl.POLYGON_OFFSET_FILL);
		prg_flat.bind();
		Uniforms.projectionMatrix = projection;
		Uniforms.viewMatrix = view;
		Uniforms.color = [0.1,0.7,0.2];
		Uniforms.colorb = [0.1,0.5,0.8];
		mesh_render.draw(gl.TRIANGLES);
	}

	gl.disable(gl.POLYGON_OFFSET_FILL);

	gl.enable(gl.BLEND);
	gl.blendColor(0,0,0,0.5);
	gl.blendEquation(gl.FUNC_ADD);
	gl.blendFunc(gl.ONE_MINUS_CONSTANT_ALPHA, gl.CONSTANT_ALPHA);

	if (vao_sel !== null)
	{
		prg_pv.bind();
		Uniforms.matrix = mpv;
		vao_sel.bind();
		for (let i=0; i<sdarts.length; ++i)
		{
			gl.drawArrays(gl.TRIANGLE_FAN,i*4,4);
		}
	}

	prg.bind();
	Uniforms.dz = 0.001;
	for (let i=0; i<vao_marked.length; ++i)
	{
		Uniforms.color = Colors[i%6];
		vao_marked[i].bind();
		gl.drawArrays(gl.TRIANGLES,0,vao_marked[i].length);
	}

	gl.disable(gl.BLEND);


	unbind_vao();
	unbind_shader();
}


function squared_distance_line_seg(A, AB,  AB2, P, Q)
{
	let PQ = Q.sub(P);
	let PQ_n2 = PQ.dot(PQ);
	let X = AB.dot(PQ) ;
	let AP = P.sub(A) ;
	let beta = ( AB2 * (AP.dot(PQ)) - X * (AP.dot(AB)) ) / ( X*X - AB2 * PQ_n2 ) ;

	if(beta<0)
	{
		let W = AB.cross(AP) ;
		return W.dot(W) / AB2 ;
	}

	if(beta > 1)
	{
		let AQ = Q.sub(A) ;
		let W = AB.cross(AQ) ;
		return W.dot(W) / AB2 ;
	}

	let temp = AB.cross(PQ) ;
	let num = AP.dot(temp) ;
	let den = temp.dot(temp) ;
	return (num * num) / den ;
}



function dart_pick_ray(A,B,m,explf,expld,thre2)
{
	let mixp = (a,b,k) =>
	{
		return a.scalarmult(1-k).add(b.scalarmult(k));
	}
	
	let picked = null;
	let min_dist = 1000000;
	let AB = B.sub(A);
	let AB2 = AB.dot(AB);
	m.foreachCell(m.Face, f=>
	{
		let C = faceCentroid(m,f,vertex_position);
		m.Face.foreachDart(f, d=>
		{
			const Pv = vertex_position.getValue(d)
			const Pa = mixp(C,Pv,explf);
			const Pb = mixp(C,vertex_position.getValue(d.phi1),explf);
			const NPb = mixp(Pa,Pb,expld);
			let V = Pa.sub(Pv);
			let  thr2 = V.dot(V)/4.0;
			let dist2 = squared_distance_line_seg(A,AB,AB2,Pa,NPb);
			if (dist2 < thr2)
			{
				let dist =  Pa.sub(A).length();
				console.log("test dart "+d.id+ ":"+dist2 + " < "+thr2 + "  D: "<< dist);
				if (dist < min_dist)
				{
					min_dist = dist;
					picked = d
				}
			}
		});
	});
	return picked;
}


function mousedown_wgl(ev)
{
	if (ev.ctrlKey && ev.button===0)
	{
		let xgl = ev.x / gl.canvas.clientWidth * 2 - 1;
		let ygl = 1 - ev.y / gl.canvas.clientHeight * 2;

		const IM = Matrix.mult(ewgl.scene_camera.get_projection_matrix(),ewgl.scene_camera.get_view_matrix()).inverse();
		let PW41 = IM.vecmult(Vec4(xgl,ygl,0.1,1));
		let PW42 = IM.vecmult(Vec4(xgl,ygl,0.9,1));
		let PW1 = PW41.xyz.scalarmult(1.0/PW41.w);
		let PW2 = PW42.xyz.scalarmult(1.0/PW42.w);
	
		let dp = dart_pick_ray(PW1,PW2,global_cmap2,0.01*sl_explf.value,0.01*sl_expld.value,0.00005);
		if (dp)
		{
			console.log("Picked dart ["+sdarts.length+"] = "+dp.id);
			add_sel(dp);
		}
		return true;
	}
}

// function update_info_selected()
// {
// 	lab_isel.textContent = " Manipul "+sid+" "+sdarts[sid].phi1.id+" "+sdarts[sid].phi_1.id+" "+sdarts[sid].phi2.id+" "+sdarts[sid].v_emb.id;
// }

function onkeydown_wgl(k)
{
	let t_start=null;
	switch (k)
	{
	case '+':
		if (sdarts.length>0)
		{
			sid = (sid+1)%sdarts.length;
		}
		break;
	case '-':
		if (sdarts.length>0)
		{
			sid = (sid+sdarts.length-1)%sdarts.length;
		}
		 break;
	case ' ':
		update_map();
		break;
	case 'Backspace':
		clear_sel();
		break;
	case 'ArrowLeft':
		if (sdarts.length>0)
			{sdarts[sid] = sdarts[sid].phi_1;}
		break;
	case 'ArrowRight':
		if (sdarts.length>0)
			{sdarts[sid] = sdarts[sid].phi1;}
		break;
	case 'ArrowUp':
	case 'ArrowDown':
		if (sdarts.length>0)
			{sdarts[sid] = sdarts[sid].phi2;}
		break;
	default:
		tp_key_down(k);
		break;
	}
	update_sdarts();
	return false;
}
