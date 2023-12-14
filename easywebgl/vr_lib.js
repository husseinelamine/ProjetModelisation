"use strict";


var promises_ressources = [];
var vr_widget_intercept_ray = false;

var tex_alphabet=null;

var prg_one_char = null;

const OneChar_ops =
{
	click_down: function()
	{
		let m = this.frame_inv.mult(gamepad.frame);
		let a = -m.data[14]/m.data[10];
		let x = m.data[12]+m.data[8]*a;
		let y = -(m.data[13]+m.data[9]*a);
		return (Math.abs(x-0.5) < 0.5 && Math.abs(y-0.5) < 0.3);
	},

	set_frame: function(m)
	{
		this.frame = m.mult(scale(19/34,1,1));
		this.frame_inv = this.frame.inverse();
	},

	draw: function(proj,view)
	{
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		prg_one_char.bind();
		Uniforms.projectionMatrix = proj;
		Uniforms.viewMatrix = view.mult(this.frame);
		Uniforms.char_code = this.code;
		Uniforms.color = this.color;
		Uniforms.TU0 = tex_alphabet.bind(0);
		gl.bindVertexArray(vao_vide);
		gl.drawArrays(gl.TRIANGLE_FAN,0,4);
		gl.bindVertexArray(null);
		unbind_shader();
		unbind_texture2d();
		gl.disable(gl.BLEND);
	},

	update_char: function(char_code)
	{
		this.code = char_code;
	},
	
	update_color: function(col)
	{
		this.color = col;
	},

	width:  function() { return 1; },
	height: function() { return 1; },

};


function OneChar(code,color) 
{
	if (prg_one_char === null)
	{
		prg_one_char = VRShaders.Program('one_char');
	}

	let frame = Matrix.scale(1,34/19,1);
	let frame_inv = frame.inverse();
	return Object.assign(Object.create(OneChar_ops),{code, color, frame, frame_inv, clickable:false});
}



var prg_mlabel = null;

const MultiLabel_ops =
{
	init: function()
	{
		tex_alphabet = Texture2d([gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],
			[gl.TEXTURE_WRAP_T,gl.REPEAT]);
		return new Promise((resolve,reject) => 
		{
			tex_alphabet.load('../Common/fonte32.png',gl.R8,gl.RED).then(() => 
			{
				resolve();
			});
		});
	},
	
	click_x: function()
	{
		let m = this.frame_inv.mult(gamepad.frame);
		let a = -m.data[14]/m.data[10];
		let x = m.data[12]+m.data[8]*a;
		let y = -(m.data[13]+m.data[9]*a);

		if (Math.abs(x-0.5) < 0.5 && Math.abs(y-0.5) < 0.5)
		{
			return Math.floor(this.w*x);
		}
		return -1;
	},

	click_down: function()
	{
		let m = this.frame_inv.mult(gamepad.frame);
		let a = -m.data[14]/m.data[10];
		let x = m.data[12]+m.data[8]*a;
		let y = -(m.data[13]+m.data[9]*a);

		if (Math.abs(x-0.5) < 0.5 && Math.abs(y-0.5) < 0.5)
		{
			return Math.floor(this.h*y);
		}
		return -1;
	},

	set_frame(m)
	{
		this.frame = m.mult(scale(this.w*19/34,this.h,1));
		this.frame_inv = this.frame.inverse();
	},

	draw: function(proj,view,tr=0)
	{
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		prg_mlabel.bind();
		uniforms.projectionMatrix = proj;
		uniforms.viewMatrix = view.mult(this.frame);
		uniforms.nb = [this.w,this.h];
		uniforms.dec = this.l>this.h?(this.l%this.h)/this.h:0;
		uniforms.tr = tr;
	
		Uniforms.TU0 = this.tex_str.bind(0);
		Uniforms.TU1 = tex_alphabet.bind(1);
		// gl.bindVertexArray(vao_vide);
		gl.drawArrays(gl.TRIANGLE_FAN,0,4);
		// gl.bindVertexArray(null);
		unbind_shader(prg_mlabel);
		gl.disable(gl.BLEND);
	},

	add_line: function(str,col=[1,1,1])
	{
		let lines = str.split('\n');
		if (lines.length > 1)
		{
			for (let i=0; i<lines.length; ++i)
			{
				this.add_line(lines[i],col);
			}
			return;
		}
		
		let w = this.w;
		const first_char = -32;
		const R = 255*col[0];
		const G = 255*col[1];
		const B = 255*col[2];
		let nl = Math.ceil(str.length / w);
		let nc = str.length;
		this.tex_str.bind();
		gl.pixelStorei(gl.UNPACK_ROW_LENGTH, w);
		let k=0;
		for (let j=0; j<nl; j++)
		{
			let p = 4*w*(this.l%this.h);
			let chars = this.buffer.subarray(p,p+4*w);
			let i=0;
			let j=0;
			for (; i<w && k<nc; i++)
			{
				chars[j++] = R;
				chars[j++] = G;
				chars[j++] = B;
				chars[j++] = str.charCodeAt(k++)+first_char;
			}
			chars.fill(0,j);
			gl.texSubImage2D(gl.TEXTURE_2D,0, 0, this.l%this.h, w, 1, gl.RGBA, gl.UNSIGNED_BYTE, chars);
			this.l++;
		}

		this.tex_str.unbind();
		this.c = 0;
	},

	add_word: function(str,col=[1,1,1],endl=false)
	{
		const first_char = inv?68:-32;
		const R = 255*col[0];
		const G = 255*col[1];
		const B = 255*col[2];
		let p = 4*(this.w*(this.l%this.h)+this.c);
		let chars = this.buffer.subarray(p,p+4*str.length);
		
		let j = 0;
		for (let i=0; i<str.length; i++)
		{
			chars[j++] = R;
			chars[j++] = G;
			chars[j++] = B;
			chars[j++] = str.charCodeAt(i)+first_char;
		}
		this.tex_str.bind();
//		gl.pixelStorei(gl.UNPACK_ROW_LENGTH, str.length);
		gl.texSubImage2D(gl.TEXTURE_2D,0, this.c, this.l%this.h, str.length, 1, gl.RGBA, gl.UNSIGNED_BYTE, chars);
		this.tex_str.unbind();
		this.c += str.length; 
		if (this.c == this.w || endl)
		{
			this.l++;
			this.c = 0;
		}
	},

	update: function(str,line=0,column=0)
	{
		let p = 4*(this.w*(line)+column);
		let nb = Math.min(this.w,str.length)
		let chars = this.buffer.subarray(p,p+4*nb);
		for (let i=0; i<nb; i++)
		{
			if (chars[4*i+3]>100){
				chars[4*i+3] = str.charCodeAt(i)+68;
			}else{
				chars[4*i+3] = str.charCodeAt(i)-32;}
		}
		this.tex_str.bind();
		gl.pixelStorei(gl.UNPACK_ROW_LENGTH, nb);
		gl.texSubImage2D(gl.TEXTURE_2D,0, column, line, nb, 1, gl.RGBA, gl.UNSIGNED_BYTE, chars);
		this.tex_str.unbind();
	},

	change_color_line: function(line,color)
	{
		let w = this.w;
		const R = 255*color[0];
		const G = 255*color[1];
		const B = 255*color[2];
		let p = 4*(w*line);
		let chars = this.buffer.subarray(p,p+4*w);
		let j = 0;
		for (let i=0; i<w; i++)
		{
			chars[j++] = R;
			chars[j++] = G;
			chars[j++] = B;
			j++;
		}
		this.tex_str.bind();
		gl.pixelStorei(gl.UNPACK_ROW_LENGTH, w);
		gl.texSubImage2D(gl.TEXTURE_2D,0, 0, line, w, 1, gl.RGBA, gl.UNSIGNED_BYTE, chars);
		this.tex_str.unbind();
	},

	width:  function() { return this.w*19/34; },
	height: function() { return this.h; },

};


function MultiLabel(w,h) 
{
	if (prg_mlabel === null)
	{
		prg_mlabel = Shader.Program('multi_label');
	}

	let tex_str = Texture2d([gl.TEXTURE_MIN_FILTER,gl.NEAREST],	[gl.TEXTURE_MAG_FILTER,gl.NEAREST],
		[gl.TEXTURE_WRAP_S, gl.REPEAT],	[gl.TEXTURE_WRAP_T, gl.REPEAT]);
	tex_str.alloc(w,h,gl.RGBA8);
	let buffer = new Uint8Array(4*w*h);
	let frame = scale((19*w)/(34*h),1,1);
	let frame_inv = frame.inverse();
	return Object.assign(Object.create(MultiLabel_ops),{buffer, tex_str, w,h, l:0, c:0, frame, frame_inv, clickable:false, clickable:false});
}



var prg_slabel = null;

const SimpleLabel_ops =
{
	click_down: function()
	{
		let m = this.frame_inv.mult(gamepad.frame);
		let a = -m.data[14]/m.data[10];
		let x = m.data[12]+m.data[8]*a;
		let y = -(m.data[13]+m.data[9]*a);

		if (Math.abs(x-0.5) < 0.5 && Math.abs(y-0.5) < 0.5)
		{
			return Math.floor(this.w*x);
		}
		return -1;
	},

	set_frame(m)
	{
		this.frame = m.mult(scale(19*this.w/34,1,1));
		this.frame_inv = this.frame.inverse();
	},

	draw: function(proj,view,tr=0)
	{
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		prg_slabel.bind();
		Uniforms.projectionMatrix = proj;
		Uniforms.viewMatrix = view.mult(this.frame);
		Uniforms.nb = this.w;
		Uniforms.tr = tr;
		Uniforms.color = this.color;
		Uniforms.TU0 = this.tex_str.bind(0);
		Uniforms.TU1 = tex_alphabet.bind(1);
//		gl.bindVertexArray(vao_vide);
		gl.drawArrays(gl.TRIANGLE_FAN,0,4);
//		gl.bindVertexArray(null);
		unbind_shader();
		unbind_texture2d();
		gl.disable(gl.BLEND);
	},

	update: function(str)
	{
		let nb = Math.min(this.w,str.length)
		let chars = new Uint8Array(this.w);
		for (let i=0; i<nb; i++)
		{
			chars[i] = str.charCodeAt(i)-32;
		}
		for (let i=nb; i<this.w; i++)
		{
			chars[i] = 0;
		}
		this.tex_str.bind();
		gl.pixelStorei(gl.UNPACK_ROW_LENGTH, this.w);
		gl.texSubImage2D(gl.TEXTURE_2D,0, 0, 0, this.w, 1, gl.RED, gl.UNSIGNED_BYTE, chars);
		this.tex_str.unbind();
	},

	width:  function() { return this.w; },
	height: function() { return 1; },

};


function SimpleLabel(str, color=[1,1,1]) 
{
	if (prg_slabel === null)
	{
		prg_slabel = Shader.Program('single_label');
	}

	let tex_str = Texture2d([gl.TEXTURE_MIN_FILTER,gl.NEAREST],	[gl.TEXTURE_MAG_FILTER,gl.NEAREST],
		[gl.TEXTURE_WRAP_S, gl.REPEAT],	[gl.TEXTURE_WRAP_T, gl.REPEAT]);
	let w = str.length;
	tex_str.alloc(w,1,gl.R8);
	let frame = scale(19*w/34,1,1);
	let frame_inv = frame.inverse();
	let o = Object.assign(Object.create(SimpleLabel_ops),{tex_str, w, color, frame, frame_inv, clickable:false});
	o.update(str);
	return o;
}





const Check_Button_ops =
{
	set_frame(m)
	{
		this.button.set_frame(m.mult(scale(1.5)));
		this.lab.set_frame(m.mult(translate(1,-0.3,0.0)));
	},

	draw: function(proj,view)
	{
		this.button.draw(proj,view);
		this.lab.draw(proj,view);
	},

	drag: function() {},
	click_up: function() {},
	
	click_down: function()
	{
		if (this.button.click_down())
		{
			this.button.code===96?this.button.code=95:this.button.code=96;
			this.value = this.button.code===95;
			this.cb(this.value);
		}
	},

	setValue: function(v)
	{
		this.button.code = v?95:96;
	},

	width:  function() { return 2+this.lab.width(); },
	height: function() { return 1.5; },

};

function Check_Button(cb, value, label, color = [1,1,1]) 
{
	let button = OneChar(value?95:96, color);
	let lab = SimpleLabel(label,color);
	return Object.assign(Object.create(Check_Button_ops),{cb, value, button, lab, clickable:true});
}


const List_Selectable_ops =
{
	set_frame(m)
	{
		this.dr_list.set_frame(m);
	},

	draw: function(proj,view)
	{
		this.dr_list.draw(proj,view);
	},

	drag: function()
	{
		if (!this.clicked) {return;}

		let sel = this.dr_list.click_down();
		if (sel > 0)
		{
			if (this.line_selected > 0)
			{
				this.dr_list.change_color_line(this.line_selected,this.color_no);
				this.dr_list.change_color_line(sel,this.color_yes);
			}
			this.line_selected = sel;
		}
		else
		{
			this.dr_list.change_color_line(this.line_selected,this.color_no);
			this.dr_list.change_color_line(this.line_saved,this.color_yes);
			this.line_selected = this.line_saved;			
		}
	},

	click_up: function()
	{
		let sel = this.dr_list.click_down();
		if (sel > 0)
		{
			if (this.line_selected > 0)
			{
				this.dr_list.change_color_line(this.line_selected,this.color_no);
				this.dr_list.change_color_line(sel,this.color_yes);
			}
			this.line_selected = sel;
			this.line_saved = sel;
			this.cb(sel-1);
		}
		this.clicked = false;
		
	},

	click_down: function() {this.clicked = true;this.drag();},
	
	set_selected: function(s)
	{
		s++;
		if (s>0 && s <this.nbl)
		{
			this.dr_list.change_color_line(this.line_selected,this.color_no);
			this.line_selected = s;
			this.line_saved = s;
			this.dr_list.change_color_line(this.line_selected,this.color_yes);
		}
	},

	width:  function() { return this.dr_list.width() },
	height: function() { return this.dr_list.height(); },

}


function List_Selectable(cb, list_lab, color = [1,1,1], titre = 'Menu') 
{
	let w = titre.length;
	list_lab.forEach(l => { w = Math.max(w,l.length);} );
	w++;
	let nbl = list_lab.length+1;
	let dr_list = MultiLabel(w,nbl);
	let x = (w>nbl)?1:w/nbl;
	let y = (nbl>w)?1:nbl/w;
	let color_no = [color[0]*0.6,color[1]*0.6,color[2]*0.6];
	dr_list.add_line(titre,color);
	list_lab.forEach(l => { dr_list.add_line(l,color_no);} );
	return Object.assign(Object.create(List_Selectable_ops),{cb, frame:new Mat4(), dr_list,
		nbl, w, x, y, line_selected:-1, line_saved:-1, color_yes:color, color_no, clickable:true});
}


const slider_vert =`#version 300 es
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform float value;
out float m;
out float y;
const vec2 lv[4] = vec2[](vec2(0.0,0.0),vec2(0.0,-1.0),vec2(1.0,-1.0),vec2(1.0,0.0));
void main()
{
	m = lv[gl_VertexID].x + 1.0 - value;
	y = -lv[gl_VertexID].y;
	gl_Position = projectionMatrix * viewMatrix * vec4(lv[gl_VertexID],0.0,1.0);
}`;

const slider_frag =`#version 300 es
precision highp float;
uniform vec3 color1;
uniform vec3 color2;
in float m;
in float y;
out vec4 frag_out;
void main()
{
	float yy = y*2.0-1.0;
	vec3 color = (1.0-yy*yy)*mix(color2,color1,floor(m));
	frag_out = vec4(color,0.8); 
}`;

var prg_slider = null;

const Slider_ops =
{
	set_frame(m)
	{
		this.frame = m.mult(scale(this.ratio,1,1));	
		this.lab.set_frame(translate(0,0,0.01).mult(m));//.mult(scale(0.25)));
	},

	draw: function(proj,view)
	{
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		prg_slider.bind();
		Uniforms.projectionMatrix = proj;
		Uniforms.viewMatrix = view.mult(this.frame);
		Uniforms.color1 = this.color1;
		Uniforms.color2 = this.color2;
		Uniforms.value = this.dv;
//		gl.bindVertexArray(vao_vide);
		gl.drawArrays(gl.TRIANGLE_FAN,0,4);
//		gl.bindVertexArray(null);
		unbind_shader();
		gl.disable(gl.BLEND);
		this.lab.draw(proj,view);
	},

	click_down: function()
	{
		let m = this.frame.inverse().mult(gamepad.frame);
		let a = -m.data[14]/m.data[10];
		let x = m.data[12]+m.data[8]*a;
		let y = -(m.data[13]+m.data[9]*a);
		if (Math.abs(x-0.5) <= 0.5 && Math.abs(y-0.5) <= 0.5)
		{
			this.old_value = this.value;
			this.dv = (this.ticks==0)?x:(Math.round(x*this.ticks)/this.ticks);
			let new_val = this.min + this.dv *(this.max-this.min);
			if (new_val !== this.value)
			{
				this.value = new_val;
				this.lab.update(this.value.toFixed(3));
				this.cb(this.value);
			}
			this.dragable = true;
			vr_widget_intercept_ray = true;
		}
	},

	click_up: function()
	{
		this.dragable = false;
	},

	drag: function()
	{
		if (this.dragable)
		{
			let m = this.frame.inverse().mult(gamepad.frame);
			let a = -m.data[14]/m.data[10];
			let x = m.data[12]+m.data[8]*a;
			let y = -(m.data[13]+m.data[9]*a);
			if (Math.abs(x-0.5) <= 0.5 && Math.abs(y-0.5) <= 0.5)
			{
				this.dv = (this.ticks==0)?x:(Math.round(x*this.ticks)/this.ticks);
				let new_val = this.min + this.dv *(this.max-this.min);
				if (new_val !== this.value)
				{
					this.value = new_val;
					this.lab.update(this.value.toFixed(3));
					this.cb(this.value);
				}
			}
		}
	},

	setValue: function(v)
	{
		if (v <= this.max && v >= this.min)
		{
			this.value = v;
			this.dv = (v-this.min)/(this.max-this.min);
			this.lab.update(this.value.toFixed(3));
			this.cb(this.value);
		}
	},

	width:  function() { return this.ratio; },
	height: function() { return 1; },

}


function Slider(cb, min=0, max=1, ticks=0, ratio = 10, color1 = [0.5,0.5,0.5], color2 = [1,1,1] ) 
{
	if (prg_slider === null)
	{
		prg_slider = VRShaders.Program('slider');
	}

	let value = (min + max)/2;
	let dv = ticks==0?value:(Math.round(value*ticks)/ticks);
	let lab = SimpleLabel('0.500');
	let frame = Matrix.scale(ratio,1,1);
	let frame_inv = frame.inverse();

	return Object.assign(Object.create(Slider_ops),{min, max, ticks, cb, lab, dragable:false, frame, frame_inv, color1, color2, ratio, value, dv, clickable:true});
}



const SignedSlider_ops =
{
	set_frame(m)
	{
		this.frameN = m.mult(translate(this.ratio/2,0,0)).mult(scale(-this.ratio/2,1,1));
		this.frameP = m.mult(translate(this.ratio/2,0,0)).mult(scale(this.ratio/2,1,1));
		this.lab.set_frame(translate(0.15,0,0.01).mult(m));//.mult(scale(0.25)));
	},

	draw: function(proj,view)
	{
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		prg_slider.bind();
		Uniforms.projectionMatrix = proj;
		Uniforms.viewMatrix = view.mult(this.frameN);
		Uniforms.color1 = this.colorB;
		Uniforms.color2 = this.colorN;
		Uniforms.value = this.dv<0?-this.dv:0;
		// gl.bindVertexArray(vao_vide);
		gl.drawArrays(gl.TRIANGLE_FAN,0,4);
		Uniforms.projectionMatrix = proj;
		Uniforms.viewMatrix = view.mult(this.frameP);
		Uniforms.color1 = this.colorB;
		Uniforms.color2 = this.colorP;
		Uniforms.value = this.dv>0?this.dv:0;
		gl.drawArrays(gl.TRIANGLE_FAN,0,4);
		// gl.bindVertexArray(null);
		unbind_shader();
		gl.disable(gl.BLEND);

		this.lab.draw(proj,view);
	},

	click_down: function()
	{
		// let m = this.frame.inverse().mult(gamepad.frame);
		// let a = -m.data[14]/m.data[10];
		// let x = m.data[12]+m.data[8]*a;
		// let y = -(m.data[13]+m.data[9]*a);
		// if (Math.abs(x-0.5) <= 0.5 && Math.abs(y-0.5) <= 0.5)
		// {
		// 	this.old_value = this.value;
		// 	this.dv = (this.ticks==0)?x:(Math.round(x*this.ticks)/this.ticks);
		// 	let new_val = this.min + this.dv *(this.max-this.min);
		// 	if (new_val !== this.value)
		// 	{
		// 		this.value = new_val;
		// 		this.lab.update(this.value.toFixed(3));
		// 		this.cb(this.value);
		// 	}
		// 	this.dragable = true;
		// 	vr_widget_intercept_ray = true;
		// }
	},

	click_up: function()
	{
		this.dragable = false;
	},

	drag: function()
	{
		// if (this.dragable)
		// {
		// 	let m = this.frame.inverse().mult(gamepad.frame);
		// 	let a = -m.data[14]/m.data[10];
		// 	let x = m.data[12]+m.data[8]*a;
		// 	let y = -(m.data[13]+m.data[9]*a);
		// 	if (Math.abs(x-0.5) <= 0.5 && Math.abs(y-0.5) <= 0.5)
		// 	{
		// 		this.dv = (this.ticks==0)?x:(Math.round(x*this.ticks)/this.ticks);
		// 		let new_val = this.min + this.dv *(this.max-this.min);
		// 		if (new_val !== this.value)
		// 		{
		// 			this.value = new_val;
		// 			this.lab.update(this.value.toFixed(3));
		// 			this.cb(this.value);
		// 		}
		// 	}
		// }
	},

	setValue: function(v)
	{
		if (v <= this.max && v >= this.min)
		{
			this.value = v;
			if (v>=0)
			{
				this.dv = v/this.max;
			}
			else
			{
				this.dv = -v/this.min;
			}
			
			this.lab.update(this.value.toFixed(3));
		}
	},

	width:  function() { return this.ratio; },
	height: function() { return 1; },


}


function SignedSlider(cb, min=-1, max=1, ticks=0, ratio = 10, colorN = [0,0.8,0], colorP = [0.8,0,0], colorB = [0.3,0.3,0.3] ) 
{
	if (prg_slider === null)
	{
		prg_slider = VRShaders.Program('slider');
	}

	let value = (min + max)/2;
	let dv = ticks==0?value:(Math.round(value*ticks)/ticks);
	let lab = SimpleLabel(' 0.000');
	let frameN = scale(-ratio,1,1);
	let frameP = scale( ratio,1,1);

	return Object.assign(Object.create(SignedSlider_ops),{min, max, ticks, cb, lab, dragable:false,
		frameN, frameP, colorP, colorN, colorB, ratio, value, dv, clickable:true});
}




let InterfaceManager = {

	frame: Mat4(),

	width_col: 0,

	begin: function(fr)
	{
		this.frame = fr;
		this.width_col = 0;
		this.cur_x = 0;
		this.cur_y = 0;
	},

	end: function() {},


	add_widget: function(wid, vspace=0)
	{
		this.cur_y -= vspace;
		wid.set_frame(this.frame.mult(translate(this.cur_x,this.cur_y,0)));
		vr_widgets.push(wid);
		this.cur_y -= wid.height();
		this.width_col = Math.max(this.width_col,wid.width());
	},

	add_widget_display_only: function(wid, vspace=0)
	{
		this.cur_y -= vspace;
		wid.set_frame(this.frame.mult(translate(this.cur_x,this.cur_y,0)));
		vr_widgets_display_only.push(wid);
		this.cur_y -= wid.height();
		this.width_col = Math.max(this.width_col,wid.width());
	},

	next_column: function(hspace=0)
	{
		this.cur_x += this.width_col + hspace;
		this.cur_y = 0;
		this.width_col = 0;
	},
};

////////////////////////////////////////////////////////////////////////
//	VR
////////////////////////////////////////////////////////////////////////

var desktopRendering = true;
var vrDisplay = null;
var frameData = null;
var gl = null;
var canvas = document.getElementById("webgl-canvas");
var vr_console1 = null;


var head_frame = Mat4();
var inv_head_frame = Mat4();
var head_lv = null;
var head_la = null;
var hand_lv = null;
var hand_la = null;

var gamepad = {trigger:false, down_trigger:false, up_trigger:false,
	top_button:false, top_side:1, up_top_button:false, down_top_button:false,
	x_pad:0, y_pad:0, dx_pad:0, dy_pad:0, frame:Mat4()}; 

let new_gp_trigger = false;
let new_gp_top_button = false;


var prg_ray = null;
var vao_vide = null;

var vr_selected_final_frame = null;
var vr_selected = undefined;
var vr_grab_matrix = null;
var vr_grab_depth = 0;
var vr_grab_shift = 0;
var vr_grab_rot_y = 0;
var vr_grab_rot_x = 0;
var rot_mod = false;


var time_top_button = 0;
var time_trigger = 0;
var console_on = true;
var hand_pos_x = 0.2;
var hand_pos_y = -0.7;
var hand_pos_z = -0.2;

var vr_widgets = [];

let vrPicking =
{
	pick_prg: null,
	pick_tex: null,
	pick_fbo1: null,
	pick_fbo2: null,
	pick_matrix: null,
	proj: null,
	pick_map: null,

	pick: function (draw)
	{
		this.pick_map = new Map();

		let cc = gl.getParameter(gl.COLOR_CLEAR_VALUE)
		push_fbo();
		this.pick_fbo1.bind();
		gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
		gl.viewport(0,0,3,3);
		gl.disable(gl.BLEND);
		gl.enable(gl.DEPTH_TEST);
		gl.clearColor(0,0,0,0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		this.pick_prg.bind();
		Uniforms.projectionMatrix = this.proj;
		this.pick_matrix = gamepad.frame.inverse();
		draw();

		this.pick_prg.bind();
		pop_fbo();
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.pick_fbo2);
		gl.readBuffer(gl.COLOR_ATTACHMENT0);
		let pix = new Uint8Array(4);
		gl.readPixels(1,1,1,1, gl.RGBA, gl.UNSIGNED_BYTE, pix);
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
		gl.clearColor(cc[0],cc[1],cc[2],cc[3]);

		let id = pix[0] + 256*pix[1] + 256*256*pix[2] + 256*256*256*pix[3];
		let obj = this.pick_map.get(id);
		this.pick_map.clear();
		return obj;
	},


	custom_pick: function (draw)
	{
		let cc = gl.getParameter(gl.COLOR_CLEAR_VALUE)
		push_fbo();
		this.pick_fbo1.bind();
		gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
		gl.viewport(0,0,3,3);
		gl.disable(gl.BLEND);
		gl.enable(gl.DEPTH_TEST);
		gl.clearColor(1,1,1,1);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

/*		let ortho = Mat4();
		ortho.data[0] = 256;
		ortho.data[5] = 256;
		ortho.data[10] = -2/(511);
		ortho.data[14] = -(513)/(511);*/
		this.pick_matrix = gamepad.frame.inverse();
		draw(this.proj, this.pick_matrix);
		pop_fbo();
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.pick_fbo2);
		gl.readBuffer(gl.COLOR_ATTACHMENT0);
		let pix = new Uint8Array(4);
		gl.readPixels(1,1,1,1, gl.RGBA, gl.UNSIGNED_BYTE, pix);
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
		gl.clearColor(cc[0],cc[1],cc[2],cc[3]);
		vrConsole.warning(pix[0],pix[1],pix[2],pix[3]);
		return pix[0] + 256*pix[1] + 256*256*pix[2] + 256*256*256*pix[3];
	},


	debug_quad: function(proj, view)
	{
		let prg = Shader.Program('tex_quad');
		prg.bind();
		update_matrices(proj,view);
		this.pick_tex.bind(gl.TEXTURE0,'TU0');
		gl.bindVertexArray(vao_vide);
		gl.drawArrays(gl.TRIANGLE_FAN,0,4);
		gl.bindVertexArray(null);
		unbind_texture2d();
		unbind_shader();
	},

	init: function ()
	{
		const pick_vert = `#version 300 es
		uniform mat4 projectionMatrix;
		uniform mat4 viewMatrix;
		in vec3 position_in;
		void main()
		{
			gl_PointSize = 2.0;
			gl_Position = projectionMatrix * viewMatrix * vec4(position_in, 1.0);
		}
		`;
		const pick_frag = `#version 300 es
		precision highp float;
		out vec4 frag_out;
		uniform vec4 color;
		void main()
		{
			frag_out = vec4(color);
		}
		`;

		this.proj = Mat4();
		this.proj.data[0] = 256;
		this.proj.data[5] = 256;
		this.proj.data[10] = -2/(511.9);
		this.proj.data[14] = -(512.1)/(511.9);
		this.pick_map = new Map();
		this.pick_prg = ShaderProgram(pick_vert, pick_frag,'pick');
		this.pick_tex = Texture2d();
		this.pick_tex.alloc(3,3,gl.RGBA8);
		this.pick_fbo1 = FBO_Depth([this.pick_tex]);
		this.pick_fbo2 = gl.createFramebuffer();
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.pick_fbo2);
		gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pick_tex.id, 0);
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
	},

	param: function(obj, mat)
	{
		let id = this.pick_map.size+1;
		this.pick_map.set(id,obj);
		let r = id%256;
		let gba = parseInt(id/256);
		let g = gba%256;
		let ba = parseInt(gba/256);
		let b = ba%256;
		let a = parseInt(ba/256);

		Uniforms.color = [r/255,g/255,b/255,a/255];
		Uniforms.viewMatrix = this.pick_matrix.mult(mat));
	},
};



function drawRay(proj,view)
{
	gl.disable(gl.CULL_FACE);
	gl.disable(gl.POLYGON_OFFSET_FILL);
	prg_ray.bind();
	Uniforms.projectionMatrix = proj;
	Uniforms.viewMatrix = view.mult(gamepad.frame);
	Uniforms.color = [1,1,1];
	//gl.bindVertexArray(vao_vide);
	gl.drawArrays(gl.TRIANGLES, 0, 3);
	//gl.bindVertexArray(null);
	unbinds();
}



function onRequestSession()
{
	return navigator.xr.requestSession('immersive-vr').then(onSessionStarted);
}

function onSessionStarted(session) 
{
	xrButton.setSession(session);
	session.addEventListener('end', onSessionEnded);
	gl = createWebGLContext({xrCompatible: true});
}

function onEndSession(session)
{
	session.end();
}
function onSessionEnded(event)
{
	xrButton.setSession(null);
}

function initXR()
{
	xrButton = new WebXRButton({
	  onRequestSession: onRequestSession,
	  onEndSession: onEndSession
	});
	document.querySelector('header').appendChild(xrButton.domElement);

	if (navigator.xr) 
	{
		navigator.xr.isSessionSupported('immersive-vr').then((supported) => 
		{ xrButton.enabled = supported;});
	}
}

function io_pad(head_pose)
{
	head_frame = quat_to_Mat4(head_pose.orientation);
	inv_head_frame = head_frame.inverse();
	head_lv = head_pose.linearVelocity;
	head_la = head_pose.linearAcceleration;
	
	var gamepads = navigator.getGamepads();
	const gp0 = gamepads[0];	
	if (gp0 && gp0.pose && gp0.pose.orientation)
	{
		gamepad.frame = quat_to_Mat4(gp0.pose.orientation);
		gamepad.frame.data[12] = hand_pos_x;//gp0.pose.position[0];
		gamepad.frame.data[13] = hand_pos_y;//gp0.pose.position[1];
		gamepad.frame.data[14] = hand_pos_z;//gp0.pose.position[2];;
		
		hand_lv = gp0.pose.linearVelocity;
		hand_la = gp0.pose.linearAcceleration;

		new_gp_trigger = gp0.buttons[1].value > 0;
		gamepad.down_trigger = !gamepad.trigger && new_gp_trigger;
		gamepad.up_trigger = gamepad.trigger && !new_gp_trigger;
		gamepad.trigger = new_gp_trigger;
				
		new_gp_top_button = gp0.buttons[0].value > 0;
		gamepad.down_top_button = !gamepad.top_button && new_gp_top_button;
		gamepad.up_top_button = gamepad.top_button && !new_gp_top_button;		
		
		if (gamepad.top_button == new_gp_top_button)
		{
			gamepad.dx_pad = (gp0.axes[0] !== 0) && (gamepad.x_pad !==0) ? gp0.axes[0] - gamepad.x_pad : 0;
			gamepad.dy_pad = (gp0.axes[1] !== 0) && (gamepad.y_pad !==0)  ? gp0.axes[1] - gamepad.y_pad : 0;
			gamepad.x_pad = gp0.axes[0];
			gamepad.y_pad = gp0.axes[1];
		}
		else
		{
			vrConsole.info('Click '+gp0.axes[0]+' ; '+gp0.axes[1]);
		}

		gamepad.top_button = new_gp_top_button;
		
		if (Math.abs(gamepad.dy_pad) > Math.abs(gamepad.dx_pad))
		{
			gamepad.dx_pad = 0;
		}
		else
		{
			gamepad.dy_pad = 0;
		}
		
		if (gamepad.down_top_button)
		{
			gamepad.top_side = parseInt((gamepad.x_pad+1) * 1.5);
			let dt = t - time_top_button;
			time_top_button =t;
			if ((dt <300) && (typeof gamepad_dbl_click_top === 'function'))
			{
				gamepad_dbl_click_top()
			}
			let p = pickScene();
			if (p !== undefined)
			{
				let C = p.frame.position().neg();
				let gfo = scale(-1,-1,1).mult(gamepad.frame.orientation());
				vr_grab_matrix = (gfo.inverse()).
					mult(translate(C)).mult(p.frame);
			}
			vr_selected = p;
		}

		if (gamepad.up_top_button)
		{
			if (vr_selected !== undefined)
			{
				let C = vr_selected.frame.position();
				let gfo = scale(-1,-1,1).mult(gamepad.frame.orientation());
				vr_selected_final_frame = translate(C).mult(gfo).mult(vr_grab_matrix);
			}
			vr_selected = undefined;
		}

		if (gamepad.down_trigger)
		{
			let dt = t - time_trigger;
			time_trigger = t;
			if ((dt <300) && (typeof gamepad_dbl_click_trigger === 'function'))
			{
				gamepad_dbl_click_trigger();
			}

			if (gamepad.frame.mult(inv_head_frame).data[10] < -0.1)
			{
				console_on = !console_on;
			}
			else
			{
				vr_widget_intercept_ray = false;
				vr_widgets.forEach( w => { if (w.clickable) { w.click_down(); }});
				if (!vr_widget_intercept_ray)
				{
					let p = pickScene();
					if (p !== undefined)
					{
						vr_grab_matrix = gamepad.frame.inverse().mult(p.frame);
					}
					vr_selected = p;
				}
			}
		}

		if (gamepad.up_trigger)
		{
			vr_widgets.forEach( w => { if (w.clickable) { w.click_up(); }});

			if (vr_selected !== undefined)
			{
				vr_selected_final_frame = gamepad.frame.mult(translate(vr_grab_shift,0,vr_grab_depth)).mult(vr_grab_matrix);
			}
			vr_selected = undefined;
			vr_grab_depth = 0;
			vr_grab_shift = 0;				
		}

		if ((gamepad.down_trigger || gamepad.up_trigger  || gamepad.down_top_button || gamepad.up_top_button)
			&& (typeof gamepad_callback === 'function'))
		{
			gamepad_callback(t);
		}
	}
	
	vr_widgets.forEach( w => { if (w.clickable) { w.drag(); }});
	
	if (vr_selected !== undefined)
	{
		if (gamepad.trigger)
		{
			vr_grab_depth += 0.25*gamepad.dy_pad;
			vr_grab_shift += 0.25*gamepad.dx_pad;
		}
	}

}


function onXRFrame(t, frame)
{
	let session = frame.session;

	session.requestAnimationFrame(onXRFrame);

	let pose = frame.getViewerPose(xrRefSpace);

	if (pose)
	{
		if (typeof ewxr_predraw === 'function')
		{
			ewxr_predraw(t);
		}

		io_pad(pose);
		let glLayer = session.renderState.baseLayer;
		gl.bindFramebuffer(gl.FRAMEBUFFER, glLayer.framebuffer);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		for (let view of pose.views)
		{
			let viewport = glLayer.getViewport(view);
			gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);
//			scene.draw(view.projectionMatrix, view.transform);
			ewxr_draw(t);
		}
	}
	if (typeof ewxr_postdraw === 'function')
	{
		ewxr_postdraw(t);
	}
}


function launchVR()
{
	initXR();
	MultiLabel_ops.init().then(() =>
	{
		vr_console1 = MultiLabel(60,30);
		vrPicking.init()

		prg_ray = Shader.Program('ray');
		vao_vide = gl.createVertexArray();
		initScene();
		window.addEventListener("resize", onResize, false);
		onResize();
		if (navigator.getVRDisplays)
		{
			desktopRendering = false;
			frameData = new VRFrameData();
			navigator.getVRDisplays().then(function (displays)
			{
				if (displays.length > 0) 
				{
					vrDisplay = displays[displays.length - 1];
					vrDisplay.depthNear = 0.01;
					vrDisplay.depthFar = 128.0;

					if (vrDisplay.capabilities.canPresent)
					{
						vrConsole.warning('Click to enter VR mode');
						canvas.addEventListener("click", onVRRequestPresent2, false);
					}
					window.addEventListener('vrdisplaypresentchange', onVRPresentChange, false);
					window.addEventListener('vrdisplayactivate', onVRRequestPresent, false);
					window.addEventListener('vrdisplaydeactivate', onVRExitPresent, false);
				}
			});
		}

		 window.requestAnimationFrame(onAnimationFrame);
	 });
}

function vr_compute_grabbed_matrix(m)
{
	if (vr_selected_final_frame)
	{
		m.copy(vr_selected_final_frame);
		vr_selected_final_frame = null;
		return m;
	}

	if (vr_selected === undefined)
	{
		return m;
	}
	if (gamepad.trigger)
	{
		return gamepad.frame.mult(translate(vr_grab_shift,0,vr_grab_depth)).mult(vr_grab_matrix);
	}
	if (gamepad.top_button)
	{
		let gfo = scale(-1,-1,1).mult(gamepad.frame.orientation());
		return translate(m.position()).mult(gfo).mult(vr_grab_matrix);
	}
}


function vr_clipping_back(obj_center, obj_radius=0)
{
	return (desktopRendering || inv_head_frame.transform(obj_center).z < -obj_radius);
}

let vrConsole = {
	
	info: function()
	{
		if (vr_console1)
		{
			let str = '';
			for (let i=0;i<arguments.length;++i)
			{
				let obj = arguments[i];
				str += (typeof(obj)==='string')?obj:JSON.stringify(obj, (k,v) => v.toFixed ? (v-parseInt(v) === 0) ? v : (v>0)?'+'+v.toFixed(5):v.toFixed(5): v);
				str +=' ';
			}
			vr_console1.add_line(str,[0,1,0]);
		}
	},

	warning: function()
	{
		if (vr_console1)
		{
			let str = '';
			for (let i=0;i<arguments.length;++i)
			{
				let obj = arguments[i];
				str += (typeof(obj)==='string')?obj:JSON.stringify(obj, (k,v) => v.toFixed ? (v-parseInt(v) === 0) ? v : (v>0)?'+'+v.toFixed(5):v.toFixed(5): v);
				str +=' ';
			}
			vr_console1.add_line(str,[1,1,0]);
		}
	},

	error: function()
	{
		if (vr_console1)
		{
			let str = '';
			for (let i=0;i<arguments.length;++i)
			{
				let obj = arguments[i];
				str += (typeof(obj)==='string')?obj:JSON.stringify(obj, (k,v) => v.toFixed ? (v-parseInt(v) === 0) ? v : (v>0)?'+'+v.toFixed(5):v.toFixed(5): v);
				str +=' ';
			}
			vr_console1.add_line(str,[1,0,0]);
		}
	},

	msg: function()
	{
		if (vr_console1)
		{
			let nb = arguments.length;
			let str = '';
			for (let i=1;i<nb;++i)
			{
				let obj = arguments[i];
				switch(typeof(obj))
				{
					case 'undefined':
					str += 'undefined';
					break;
					case 'string':
					str += obj;
					break;
					default:
					str += JSON.stringify(obj, (k,v) => v.toFixed ? (v-parseInt(v) === 0) ? v : (v>0)?'+'+v.toFixed(5):v.toFixed(5): v);
					break;

				}
				str +=' ';
			}
			vr_console1.add_line(str,arguments[0]);
		}
	},

	info: function()
	{
		this.msg([0,1,0],...arguments);
	},

	warning: function()
	{
		this.msg([1,1,0],...arguments);
	},

	error: function()
	{
		this.msg([1,0,0],...arguments);
	},

	rewind: function()
	{
		if (vr_console1 && vr_console1.l>0)
		{
			vr_console1.l = vr_console1.l + vr_console1.h-1;
		}
	},

	draw: function(proj,view)
	{
		if (vr_console1)
		{
			vr_console1.draw(proj,view.mult(rotate(60,Vec3(-1,0,0)).mult(translate(0,2,-70)).mult(scale(20,20,1))),[0,1,1]); 
		}
	},

 	drawHead: function(proj,view)
	{
		if (vr_console1)
		{
			gl.disable(gl.DEPTH_TEST);
			vr_console1.draw(proj,view.mult(head_frame.mult(translate(-0.3,0.3,-1)).mult(scale(1.0))));//.mult(scale(0.5,0.8,1))))); 
			gl.enable(gl.DEPTH_TEST);
		}
	},
}
