"use strict"
let first = true;

function phi1(d) {
	return d.phi1;
}
function phi2(d) {
	return d.phi2;
}

function phi1_1(d) {
	return d.phi1_1;
}

function mix(a, b, k) {
	return a.scalarmult(1 - k).add(b.scalarmult(k));
}




function flipEdge(m, e) {
	let é = e.phi2;
	let ephi1 = e.phi1;
	let ephi_1 = e.phi_1;
	let éphi1 = é.phi1;
	let éphi_1 = é.phi_1;
	let éphi1phi1 = éphi1.phi1;
	let ephi1phi1 = ephi1.phi1;

	phi1Sew(e, éphi_1);
	phi1Sew(é, ephi_1);

	phi1Sew(e, ephi1);
	phi1Sew(é, éphi1);

	copyDartEmbedding(m.Vertex, éphi1phi1, e);
	copyDartEmbedding(m.Vertex, ephi1phi1, é);



}

function cutEdge(m, e, vpos) {
	let e_bis = e.phi2;

	// Milieu de l'arête
	let middle = mix(vpos.getValue(e), vpos.getValue(e_bis), 0.5);

	// Nouveaux brins
	let t = m.newDart();
	let t_bis = m.newDart();

	// Déconnecte les deux brins de l'arête sélectionnée
	phi2Unsew(e);
	// Les reconnecte aux nouveaux brins
	phi2Sew(e, t);
	phi2Sew(e_bis, t_bis);

	// Les ajoute en phi1
	phi1Sew(e, t_bis);
	phi1Sew(e_bis, t);

	// Le nouveau sommet
	embedNewCell(m.Vertex, t_bis);
	vpos.setValue(t_bis, middle);

}

function unCutEdge(m, e, vpos) {
	// Remarque: inverse de la fonction cutEdge
	let t = e.phi2;
	let e_bis = t.phi_1;
	let t_bis = e.phi1;

	// Détache les deux brins créés dans cutEdge du phi1
	phi1Sew(e_bis, t);
	phi1Sew(e, t_bis);

	// Détache les deux sous-arêtes et rattache les arêtes qui resteront (phi2)
	phi2Unsew(e_bis);
	phi2Unsew(e);
	phi2Sew(e, e_bis);

	// Supprime les deux brins totalement déconnectées (qui ne sont plus que des points fixes)
	m.deleteDart(t);
	m.deleteDart(t_bis);
}

function cutFace(m, da, db) {
	// Créé les deux brins attachés en phi1 et phi_1
	let ea = m.newCycle(2);
	let eb = ea.phi1;

	// Copie le sommet du suivant des deux brins sélectionnés pour l'attribuer aux nouveaux
	copyDartEmbedding(m.Vertex, da, eb);
	copyDartEmbedding(m.Vertex, db, ea);

	// Déconnecte les deux brins pour les attachés aux brins sélectionnés
	phi1Sew(da.phi_1, ea);
	phi1Sew(db.phi_1, eb);

	// Attache les deux brins créés en phi2 pour en faire une arête
	phi2Sew(ea, eb);
}

function mergeFaces(m, e) {
	// Remarque: Inverse de la fonction cutFace
	let e_bis = e.phi2;

	// Détache l'arête de séparation
	phi1Sew(e, e_bis.phi_1);
	phi1Sew(e_bis, e.phi_1);
	// phi2Unsew(e);

	// Supprime l'arête de séparation
	m.deleteCycle(e);
}





function createTetra(m2, vpos) {
	// 4 triangles (newCycle)
	var t0 = m2.newCycle(3);
	var t1 = m2.newCycle(3);
	var t2 = m2.newCycle(3);
	var t3 = m2.newCycle(3);

	// 6 coutures (phi2Sew)
	phi2Sew(t0, t1);
	phi2Sew(t0.phi1, t2);
	phi2Sew(t0.phi_1, t3);
	phi2Sew(t1.phi_1, t2.phi1);
	phi2Sew(t2.phi_1, t3.phi1);
	phi2Sew(t3.phi_1, t1.phi1);

	// plonger les 4 sommets (embedNewCell, vpos.setValue)
	embedNewCell(m2.Vertex, t1);
	embedNewCell(m2.Vertex, t2);
	embedNewCell(m2.Vertex, t3);
	embedNewCell(m2.Vertex, t1.phi_1);

	vpos.setValue(t1, Vec3(-1, -1, -1));
	vpos.setValue(t2, Vec3(0, 1, -1));
	vpos.setValue(t3, Vec3(1, -1, -1));
	vpos.setValue(t1.phi_1, Vec3(0, 0, 1));

	return m2;
}

function createCube(m2, vpos) {
	var t0 = m2.newCycle(4);
	var t1 = m2.newCycle(4);
	var t2 = m2.newCycle(4);
	var t3 = m2.newCycle(4);
	var t4 = m2.newCycle(4);
	var t5 = m2.newCycle(4);

	phi2Sew(t0, t1.phi1.phi1);
	phi2Sew(t1, t2.phi1.phi1);
	phi2Sew(t2, t3.phi1.phi1);
	phi2Sew(t3, t0.phi1.phi1);

	phi2Sew(t0.phi_1, t4.phi1);
	phi2Sew(t1.phi_1, t4);
	phi2Sew(t2.phi_1, t4.phi_1);
	phi2Sew(t3.phi_1, t4.phi_1.phi_1);

	phi2Sew(t0.phi1, t5.phi1);
	phi2Sew(t1.phi1, t5);
	phi2Sew(t2.phi1, t5.phi_1);
	phi2Sew(t3.phi1, t5.phi_1.phi_1);

	embedNewCell(m2.Vertex, t0.phi_1);
	embedNewCell(m2.Vertex, t1.phi_1);
	embedNewCell(m2.Vertex, t2.phi_1);
	embedNewCell(m2.Vertex, t3.phi_1);
	embedNewCell(m2.Vertex, t0.phi1);
	embedNewCell(m2.Vertex, t1.phi1);
	embedNewCell(m2.Vertex, t2.phi1);
	embedNewCell(m2.Vertex, t3.phi1);

	vpos.setValue(t0.phi_1, Vec3(-1, 1, -1));
	vpos.setValue(t1.phi_1, Vec3(1, 1, -1));
	vpos.setValue(t2.phi_1, Vec3(1, 1, 1));
	vpos.setValue(t3.phi_1, Vec3(-1, 1, 1));
	vpos.setValue(t0.phi1, Vec3(1, -1, -1));
	vpos.setValue(t1.phi1, Vec3(1, -1, 1));
	vpos.setValue(t2.phi1, Vec3(-1, -1, 1));
	vpos.setValue(t3.phi1, Vec3(-1, -1, -1));




}

function createPyramid(m2, vpos) {
	let f;
	var t0 = m2.newCycle(3);
	var t1 = m2.newCycle(3);
	var t2 = m2.newCycle(3);
	var t3 = m2.newCycle(3);
	let t4 = m2.newCycle(4);

	phi2Sew(t0, t1);
	phi2Sew(t0.phi_1, t2);
	phi2Sew(t2.phi_1, t3);
	phi2Sew(t1.phi1, t3.phi_1);

	phi2Sew(t3.phi1, t4);
	phi2Sew(t4.phi_1, t1.phi_1);
	phi2Sew(t4.phi1, t2.phi1);
	phi2Sew(t4.phi1.phi1, t0.phi1);

	/*
		embedNewCell(m2.Vertex, t0);
		embedNewCell(m2.Vertex, t4);
		embedNewCell(m2.Vertex, t4.phi_1);
		embedNewCell(m2.Vertex, t4.phi_1.phi_1);
		embedNewCell(m2.Vertex, t4.phi1);
	
	
		vpos.setValue(t0, Vec3(0, 0, 0));
		vpos.setValue(t4, Vec3(1, -1, 1));
		vpos.setValue(t4.phi_1, Vec3(1, -1, -1));
		vpos.setValue(t4.phi_1.phi_1, Vec3(-1, -1, -1));
		vpos.setValue(t4.phi1, Vec3(-1, -1, 1));
	
	*/

	embedNewCell(m2.Vertex, t0);
	embedNewCell(m2.Vertex, t0.phi1);
	embedNewCell(m2.Vertex, t2.phi1);
	embedNewCell(m2.Vertex, t3.phi1);
	embedNewCell(m2.Vertex, t1.phi_1);

	vpos.setValue(t0, Vec3(0, 0, 0));
	vpos.setValue(t0.phi1, Vec3(1, -1, 1));
	vpos.setValue(t2.phi1, Vec3(1, -1, -1));
	vpos.setValue(t3.phi1, Vec3(-1, -1, -1));
	vpos.setValue(t1.phi_1, Vec3(-1, -1, 1));
}

function createOcta(m2, vpos) {
	// 8 triangles (newCycle)
	let f;
	var t0 = m2.newCycle(3);
	var t1 = m2.newCycle(3);
	var t2 = m2.newCycle(3);
	var t3 = m2.newCycle(3);
	var t4 = m2.newCycle(3);
	var t5 = m2.newCycle(3);
	var t6 = m2.newCycle(3);
	var t7 = m2.newCycle(3);

	phi2Sew(t0, t1.phi1);
	phi2Sew(t1, t2.phi1);
	phi2Sew(t2, t3.phi1);
	phi2Sew(t3, t0.phi1);

	phi2Sew(t0.phi_1, t4.phi1);
	phi2Sew(t1.phi_1, t5.phi1);
	phi2Sew(t2.phi_1, t6.phi1);
	phi2Sew(t3.phi_1, t7.phi1);

	phi2Sew(t4, t5.phi_1);
	phi2Sew(t5, t6.phi_1);
	phi2Sew(t6, t7.phi_1);
	phi2Sew(t7, t4.phi_1);
	// plonger les 6 sommets de l'octaèdre (embedNewCell, vpos.setValue)


	embedNewCell(m2.Vertex, t0.phi1);

	embedNewCell(m2.Vertex, t0.phi_1);
	embedNewCell(m2.Vertex, t1.phi_1);
	embedNewCell(m2.Vertex, t2.phi_1);
	embedNewCell(m2.Vertex, t3.phi_1);

	embedNewCell(m2.Vertex, t4);


	vpos.setValue(t4, Vec3(0, 2, 0));

	vpos.setValue(t0.phi_1, Vec3(1, 0, -1));
	vpos.setValue(t1.phi_1, Vec3(1, 0, 1));
	vpos.setValue(t2.phi_1, Vec3(-1, 0, 1));
	vpos.setValue(t3.phi_1, Vec3(-1, 0, -1));

	vpos.setValue(t0.phi1, Vec3(0, -2, 0));
}



function faceValence(v) {
	let valence = 0;
	let v0 = v;
	do {
		v = v.phi1;
		valence++;
	} while (v0 != v);
	return valence;
}


function vertexValence(v) {
	let valence = 0;
	let v0 = v;
	do {
		v = v.phi2.phi1;
		valence++;
	} while (v0 != v);
	return valence;
}
function vertexPointsPos(v, beta, vpos) {
	let pos = Vec3(0, 0, 0);
	let valence = 0;
	let v0 = v;
	do {
		v = v.phi2.phi1;
		pos = pos.add(vpos.getValue(v.phi1));
		valence++;
	} while (v0 != v);
	pos = pos.scalarmult(beta);
	pos = pos.add(vpos.getValue(v0).scalarmult(1 - valence * beta));
	return pos;
}

function computeEnergy(m, vpos) {
	let energy = 0;
/*	m.foreachCell(m.Vertex, v1 => {
		SolidEdgeIterator eiter(_nmesh); !eiter.end(); ++eiter) {
			Solid::tEdge edge = *eiter;
			Solid::tVertex v1 = _nmesh->edgeVertex1(edge);
			Solid::tVertex v2 = _nmesh->edgeVertex2(edge);
			Point uv = v1->point() - v2->point();
			if (type == HARMONIC) {
				energy += e_k(edge) * uv.norm2();
			}
			else energy += uv.norm2();
	});
	return energy;*/
}

function computeFaceCenter(f, vpos) {

	let center = Vec3(0, 0, 0);
	let count = 0;
	let f0 = f;
	do {

		center = center.add(vpos.getValue(f));
		count++;
		f = f.phi1;
	} while (f != f0);
	center = center.scalarmult(1 / count);
	return center;
}

/*function addEdge(v1, v2){
	if(v1.phi1 == v2 || v1.phi_1 == v2){
		console.error("please choose Darts of different edge");
		return;
	}
	let e = m.newCycle(2);
	phi2Sew(e, e.phi1);


}*/

function triangulateFace0(m, f, vpos) {

	let f2 = f.phi1.phi1
	let center = computeFaceCenter(f, vpos);
	let newEdge1 = m.newCycle(2);
	phi2Sew(newEdge1, newEdge1.phi1);

	copyDartEmbedding(m.Vertex, f, newEdge1.phi2);
	copyDartEmbedding(m.Vertex, f.phi1, newEdge1);
	phi1Sew(newEdge1, f.phi_1);
	cutEdge(m, newEdge1, vpos);
	vpos.setValue(newEdge1.phi1, center)
	/*
	embedNewCell(m.Vertex, newEdge1);
	vpos.setValue(newEdge1, center);
	let newEdge2 = m.newCycle(2);
	phi2Sew(newEdge2, newEdge2.phi1);
	copyDartEmbedding(m.Vertex, f.phi1, newEdge2);
	copyDartEmbedding(m.Vertex, newEdge1, newEdge2.phi2);

	phi1Sew(newEdge2.phi2, f);
	*/
	let e2 = newEdge1.phi2;
	while (f2 != f) {
		//	cutFace(m, e2, f2);
		//	e2 = e2.phi_1.phi2;
		f2 = f2.phi1;
		// add edge from the already center to the rest of polygon points
	}


}

function triangulateFace2(m, f, vpos) {
	let f2 = f.phi1.phi1;
	let f_1 = f.phi_1;
	let f1 = f.phi1;
	let center = computeFaceCenter(f, vpos);
	let e1 = m.newDart();
	let e1_bis = m.newDart();
	phi2Sew(e1, e1_bis);
	let e2 = m.newDart();
	let e2_bis = m.newDart();
	phi2Sew(e2, e2_bis);

	phi1Sew2(f_1, e1_bis)
	phi1Sew2(e1_bis, e2_bis);
	phi1Sew2(e2_bis, f1);
	phi1Sew2(e2, e1);
	phi1Sew2(e1, f);
	phi1Sew2(f, e2);

	embedNewCell(m.Vertex, e1);
	vpos.setValue(e1, center);
	embedNewCell(m.Vertex, e2_bis);
	vpos.setValue(e2_bis, center);
	embedNewCell(m.Vertex, e1_bis);
	vpos.setValue(e1_bis, vpos.getValue(f));
	embedNewCell(m.Vertex, e2);
	vpos.setValue(e2, vpos.getValue(f1));
	//copyDartEmbedding(m.Vertex, f, e1_bis);
	//copyDartEmbedding(m.Vertex, f1, e2);	 
	//	copyDartEmbedding(m.Vertex, e1, e2_bis);


	//let e2 = newEdge1.phi2;

	while (f2 != f) {
		cutFace(m, e2_bis, f2);
		f = f.phi1.phi2.phi1;
		//	e2 = e2.phi_1.phi2;
		// add edge from the already center to the rest of polygon points
	}

}

function triangulateFace3(m, f, vpos) {
	let center = computeFaceCenter(f, vpos);
	//center = center.add(Vec3(0, 0, 0.1));
	let f_1 = f.phi_1;
	let f1 = f.phi1;
	let e1 = m.newCycle(2);
	let e2 = m.newCycle(2);
	phi2Sew(e1, e1.phi1);
	phi2Sew(e2, e2.phi1);
	phi1Sew(e1, f_1);
	phi1Sew(e2.phi2, f);
	phi1Sew2(e2, e1);
	phi1Sew2(e1.phi2, e2.phi2);

	embedNewCell(m.Vertex, e1);
	vpos.setValue(e1, center);
	copyDartEmbedding(m.Vertex, e1, e2.phi2);
	copyDartEmbedding(m.Vertex, f1, e2);
	copyDartEmbedding(m.Vertex, f, e1.phi2);


}

function triangulateFace(m, f, vpos) {
	let f11 = f.phi1.phi1;
	let center = computeFaceCenter(f, vpos);
	let f_1 = f.phi_1;
	let f1 = f.phi1;
	let edge = m.newCycle(2);
	phi2Sew(edge, edge.phi1);
	phi1Sew(edge, f_1);
	phi1Sew(edge.phi2, f);
	copyDartEmbedding(m.Vertex, f1, edge);
	copyDartEmbedding(m.Vertex, f, edge.phi2);
	cutEdge(m, edge, vpos);
	vpos.setValue(edge.phi1, center);

	let e = edge.phi2;
	let i = 0;
	while (true) {
		cutFace(m, e, f11);
		if (f11 == f_1)
			break;
		f11 = f11.phi1;
		e = e.phi_1.phi2;
	}

}

function triangulateFaces(m, vpos) {
	let faces = [];
	m.foreachCell(m.Face, f => {
		faces.push(f);
	});
	for (let i = 0; i < faces.length; i++) {
		triangulateFace(m, faces[i], vpos);
	}
}

function embedSphere(m, vpos) {
	let vertices = [];
	let radius = 1;
	let i = 0;
	m.foreachCell(m.Vertex, v => {
		vertices.push(v);
	});
	for(i = 0; i<vertices.length;i++){
		const theta = Math.acos(1 - 2 * i / vertices.length);
		const phi = Math.PI * (1 + Math.sqrt(5)) * i;
		// Update vertex embeddings
		const x = radius * Math.sin(theta) * Math.cos(phi);
		const y = radius * Math.sin(theta) * Math.sin(phi);
		const z = radius * Math.cos(theta);
		vpos.setValue(vertices[i], Vec3(x, y, z));
	}
/*	for (const vertex of mesh.vertices) {
		// Calculate spherical coordinates
		const theta = Math.acos(1 - 2 * vertex.index / mesh.vertices.length);
		const phi = Math.PI * (1 + Math.sqrt(5)) * vertex.index;
	
		// Update vertex embeddings
		const x = radius * Math.sin(theta) * Math.cos(phi);
		const y = radius * Math.sin(theta) * Math.sin(phi);
		const z = radius * Math.cos(theta);
	
		// Update vertex position
		vpos.setValue(vertex.dart, Vec3(x, y, z));
	  }*/
}

function triangulateNonTriangularFaces(m, f, vpos) {
	let faces = [];
	m.foreachCell(m.Face, f => {
		if (!checkTriangularFace(f))
			faces.push(f);
	});
	for (let i = 0; i < faces.length; i++) {
		triangulateFace(m, faces[i], vpos);
	}
}


function phi1Sew2(d1, d2) {
	d1.phi1 = d2;
	d2.phi_1 = d1;
}

function checkTriangularFace(f) {
	let f0 = f;
	let v = 1;
	while (f.phi1 != f0) {
		v++;
		f = f.phi1;
		if (v > 3) {
			return false;
		}
	}
	return true;
}
function Loop(m, vpos) {
	let newEdges = [];
	let oldEdges = [];
	let faces = [];
	let n = LoopN.value;
	let beta = (1 / n) * (5 / 8 - Math.pow(3 / 8 + 1 / 4 * Math.cos(2 * Math.PI / n), 2));
	let valid = true;
	m.foreachCell(m.Face, d => {
		if (!checkTriangularFace(d)) {
			console.error("Loop subdivision only works on triangular meshes");
			console.info("to triangulate the mesh use t key");
			valid = false;
		}
		faces.push(d);
	});
	if (!valid)
		return;
	m.foreachCell(m.Edge, d => {
		newEdges.push(d);
	});
	m.foreachCell(m.Vertex, d => {
		oldEdges.push(d);
	});



	for (let i = 0; i < newEdges.length; i++) {
		//4 vertices around the edge
		let a = newEdges[i];
		let b = newEdges[i].phi2;
		let midAB = mix(vpos.getValue(a), vpos.getValue(b), 0.5);
		let c = newEdges[i].phi_1;
		let d = newEdges[i].phi2.phi_1;
		let midCD = mix(vpos.getValue(c), vpos.getValue(d), 0.5);
		let newPos = mix(midAB, midCD, 0.25);

		cutEdge(m, newEdges[i], vpos);
		vpos.setValue(newEdges[i].phi1, newPos);

	}

	for (let i = 0; i < oldEdges.length; i++) {
		let newPos = vertexPointsPos(oldEdges[i], beta, vpos);
		vpos.setValue(oldEdges[i], newPos);
	}

	for (let i = 0; i < faces.length; i++) {
		// triangle faces with 6 edges in trigonometric order
		let top = faces[i].phi_1; // 
		let top_ = top.phi1;
		let left = top_.phi1;
		let left_ = left.phi1;
		let right = left_.phi1;
		let right_ = right.phi1;
		// get embeddings of edge midpoints
		let e1 = getDartEmbedding(m.Vertex, left)
		let e2 = getDartEmbedding(m.Vertex, right)
		let e3 = getDartEmbedding(m.Vertex, top)

		// new center face
		let edge1 = m.newCycle(2);
		phi2Sew(edge1, edge1.phi1);
		let edge2 = m.newCycle(2);
		phi2Sew(edge2, edge2.phi1);
		let edge3 = m.newCycle(2);
		phi2Sew(edge3, edge3.phi1);


		phi1Sew(edge1, right_);
		phi1Sew(edge1.phi2, top_);

		phi1Sew(edge2, edge1.phi2);
		phi1Sew(edge2.phi2, left_);

		phi1Sew(edge3, right_);
		phi1Sew(edge3.phi2, edge2.phi2);

		copyDartEmbedding(m.Vertex, left, edge1);
		copyDartEmbedding(m.Vertex, top, edge1.phi2);

		copyDartEmbedding(m.Vertex, right, edge2);
		copyDartEmbedding(m.Vertex, left, edge2.phi2);

		copyDartEmbedding(m.Vertex, right, edge3);
		copyDartEmbedding(m.Vertex, top, edge3.phi2);

	}

}
function KobbeltAlpha(n) {
	return (4 - 2 * Math.cos(2 * Math.PI / n)) / 9;
}
function racine3(m, vpos) {
	let faces = [];
	let vpositons = [];
	let edges = [];
	let vertices = [];
	m.foreachCell(m.Edge, e => {
		edges.push(e);
	});
	m.foreachCell(m.Vertex, v => {
		vertices.push(v);
		let v0 = v;
		let valence = 0;
		let sum = Vec3(0, 0, 0);
		do {
			v = v.phi2.phi1;
			valence++;
			sum = sum.add(vpos.getValue(v));
		} while (v0 != v);
		let alpha = KobbeltAlpha(valence);
		sum = sum.scalarmult(alpha/valence).add(vpos.getValue(v0).scalarmult(1 - alpha));
		vpositons[v0.id] = sum;
	});
	for(let i = 0; i < vertices.length; i++){
		vpos.setValue(vertices[i], vpositons[vertices[i].id]);
	}
	m.foreachCell(m.Face, f => {
		faces.push(f);
	});
	for (let i = 0; i < faces.length; i++) {
		triangulateFace(m, faces[i], vpos);
	}
	for (let i = 0; i < edges.length; i++) {
		flipEdge(m, edges[i]);
	}
}

// la carte
let CM = null;
// l'attribut de position
let VPOS = null;


// code d'initialisation
function tp_init() {
	// initialise la carte (global_cmap2), le plongement de sommet, et cree l'attribut vertex_position
	resetMap();
	CM = global_cmap2;
	VPOS = vertex_position;

	let myobject;
	if (first) {
		myobject = createOcta(CM, VPOS);
	}
	else {
		myobject = createPyramid(CM, VPOS);
	}
}

// raccourci clavier
function tp_key_down(k) {
	switch (k) {
		case 'v':
			console.log(vertexValence(sdarts[0]));
			break
		case 'f':
			console.log(faceValence(sdarts[0]));
			break
		case 'c':
			cutEdge(CM, sdarts[0], VPOS);
			break;
		case 'd':
			cutFace(CM, sdarts[0], sdarts[1]);
			break;
		case 'e':
			flipEdge(CM, sdarts[0]);
			break;
		case 'l':
			Loop(CM, VPOS);
			break;
		case 't':
			triangulateFaces(CM, VPOS);
			break;
		case 'y':
			triangulateNonTriangularFaces(CM, sdarts[0], VPOS);
			break;
		case 'r':
			racine3(CM, VPOS);
			break;
		case 'p':
			embedSphere(CM, VPOS);
			break;
		case 's':
			first = !first;
			resetMap();

			if (first) {
				createOcta(CM, VPOS);
			}
			else {
				createPyramid(CM, VPOS);
			}
		default:
			break;
	}
	update_map();
}

ewgl.loadRequiredFiles(["topo_lib.js", "tp_topo_interface.js"], ewgl.launch_3d);



