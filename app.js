(() => {
  'use strict';
  const canvas = document.querySelector('#cosmos');
  const fallback = document.querySelector('#webglFallback');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let paused = reduceMotion;
  let scene = 0, targetScene = 0, scrollProgress = 0;
  let hubble = 70, density = .25, filterFuture = 0;
  let last = performance.now(), elapsed = 0;

  const sections = [...document.querySelectorAll('[data-scene]')];
  const navLinks = [...document.querySelectorAll('[data-nav]')];
  const motionBtn = document.querySelector('#motionToggle');

  function setMotionUI() {
    motionBtn.setAttribute('aria-pressed', String(paused));
    motionBtn.querySelector('.motion-icon').textContent = paused ? '▶' : '⏸';
    motionBtn.querySelector('.motion-label').textContent = paused ? 'Start' : 'Pause';
  }
  motionBtn.addEventListener('click', () => { paused = !paused; setMotionUI(); });
  setMotionUI();

  const hRange = document.querySelector('#hubbleRange');
  hRange.addEventListener('input', () => {
    hubble = +hRange.value;
    document.querySelector('#hubbleOutput').value = hubble.toFixed(1);
  });
  const dRange = document.querySelector('#densityRange');
  dRange.addEventListener('input', () => {
    density = +dRange.value / 100;
    document.querySelector('#densityOutput').value = `${(density * 100).toFixed(2)}%`;
  });
  document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === btn));
    filterFuture = btn.dataset.filter === 'future' ? 1 : 0;
  }));

  function updateScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollProgress = max > 0 ? pageYOffset / max : 0;
    document.querySelector('#progressBar').style.width = `${scrollProgress * 100}%`;
    const middle = innerHeight * .48;
    let nearest = sections[0], distance = Infinity;
    sections.forEach(s => {
      const d = Math.abs(s.getBoundingClientRect().top - middle);
      if (d < distance) { distance = d; nearest = s; }
    });
    targetScene = +nearest.dataset.scene;
    navLinks.forEach(a => a.classList.toggle('active', +a.dataset.nav === targetScene));
  }
  addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();

  if (!gl) { fallback.hidden = false; canvas.style.display = 'none'; return; }

  const vertex = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main(){ v_uv=a_position*.5+.5; gl_Position=vec4(a_position,0.0,1.0); }
  `;
  const fragment = `
    precision highp float;
    varying vec2 v_uv;
    uniform sampler2D u_documentary;
    uniform vec2 u_res;
    uniform float u_time, u_scene, u_scroll, u_hubble, u_density, u_filter, u_textureReady;

    float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.0),f.x),f.y); }
    float fbm(vec2 p){
      float v=0.;
      v+=noise(p)*.50; p=mat2(.80,-.60,.60,.80)*p*2.03+3.7;
      v+=noise(p)*.25; p=mat2(.80,-.60,.60,.80)*p*2.01+1.9;
      v+=noise(p)*.125; p=p*2.04+4.2;
      v+=noise(p)*.0625;
      return v;
    }
    float filament(vec2 p,float scale,float seed){
      vec2 warp=vec2(fbm(p*1.15+seed),fbm(p*1.15+seed+7.3))-.5;
      float n=fbm((p+warp*.72)*scale+seed);
      float ridge=1.-abs(n*2.-1.);
      return pow(max(0.,ridge),7.)*(.35+.65*fbm(p*scale*1.7-seed));
    }
    float nodeLayer(vec2 p,float scale,float seed){
      vec2 id=floor(p*scale), gv=fract(p*scale)-.5;
      float rnd=hash21(id+seed);
      vec2 offset=(vec2(hash21(id+seed+2.3),hash21(id+seed+9.1))-.5)*.58;
      float glow=.014/max(length(gv-offset),.018);
      return glow*step(.83,rnd);
    }
    vec3 deepStars(vec2 p,float scale,float seed){
      vec2 id=floor(p*scale), gv=fract(p*scale)-.5;
      float rnd=hash21(id+seed);
      vec2 pos=(vec2(hash21(id+seed+1.7),hash21(id+seed+6.2))-.5)*.76;
      vec2 d=gv-pos;
      float radius=mix(.012,.035,pow(hash21(id+seed+4.4),5.));
      float core=radius/max(length(d),.0025);
      float halo=exp(-length(d)*mix(22.,55.,rnd))*mix(.05,.28,hash21(id+8.));
      float flare=(exp(-abs(d.x)*180.)+exp(-abs(d.y)*180.))*exp(-length(d)*38.)*.12;
      float visible=step(.925,rnd);
      float temperature=hash21(id+seed+11.3);
      vec3 cool=vec3(.54,.70,1.0), neutral=vec3(1.0,.94,.82), warm=vec3(1.0,.55,.27);
      vec3 tint=mix(cool,neutral,smoothstep(.05,.58,temperature));
      tint=mix(tint,warm,smoothstep(.75,.98,temperature));
      return tint*(core+halo+flare)*visible;
    }
    vec3 distantGalaxies(vec2 p,float scale,float seed){
      vec2 id=floor(p*scale), gv=fract(p*scale)-.5;
      float rnd=hash21(id+seed);
      vec2 pos=(vec2(hash21(id+2.1),hash21(id+8.4))-.5)*.62;
      vec2 q=gv-pos;
      float angle=hash21(id+5.7)*6.283;
      q=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*q;
      q.x*=mix(2.8,6.5,hash21(id+3.3));
      float body=exp(-length(q)*38.);
      float core=exp(-length(q)*105.);
      float dustLane=smoothstep(.012,.045,abs(q.y))*body;
      vec3 tint=mix(vec3(.28,.42,.75),vec3(.92,.54,.24),hash21(id+9.8));
      return (tint*body*dustLane+vec3(1.,.82,.58)*core*1.7)*step(.972,rnd);
    }
    float starLayer(vec2 uv,float scale,float seed){
      vec2 gv=fract(uv*scale)-.5; vec2 id=floor(uv*scale);
      float n=hash21(id+seed); float s=.018/max(length(gv-vec2(hash21(id+3.1),hash21(id+8.7))*.42),.006);
      return s*step(.94,n)*(0.55+0.45*sin(u_time*(.5+n*2.0)+n*30.0));
    }
    vec3 palette(float x){ return mix(vec3(.12,.45,.55),vec3(.95,.25,.18),smoothstep(.1,.9,x)); }
    float ring(vec2 p,float r,float w){ return smoothstep(w,0.0,abs(length(p)-r)); }

    void main(){
      vec2 uv=(gl_FragCoord.xy-.5*u_res.xy)/u_res.y;
      float aspect=u_res.x/u_res.y;
      vec2 documentaryUv=v_uv;
      float screenAspect=u_res.x/u_res.y;
      float imageAspect=1.77968;
      if(screenAspect>imageAspect){ documentaryUv.y=(documentaryUv.y-.5)*(imageAspect/screenAspect)+.5; }
      else{ documentaryUv.x=(documentaryUv.x-.5)*(screenAspect/imageAspect)+.5; }
      float cameraScale=1.035+.012*sin(u_time*.045);
      documentaryUv=(documentaryUv-.5)/cameraScale+.5;
      documentaryUv+=vec2(sin(u_time*.031),cos(u_time*.026))*.0035;
      vec3 documentary=texture2D(u_documentary,clamp(documentaryUv,.001,.999)).rgb;
      documentary=pow(documentary,vec3(1.08));
      vec3 col=mix(vec3(.006,.008,.018),documentary*.82,u_textureReady);
      float t=u_time;
      vec2 drift=vec2(t*.003,-t*.002);

      vec2 cosmosCenter=vec2(mix(.18,-.20,step(aspect,1.0)),.015);
      vec2 cq=uv-cosmosCenter;
      cq.x*=.78;
      float cosmicR=length(cq);
      float voidGate=smoothstep(.24,.49,cosmicR);
      float outerFade=1.-smoothstep(.92,1.36,cosmicR);
      float webMask=voidGate*outerFade;

      vec2 slow=vec2(t*.004,-t*.003);
      vec2 cloudWarp=vec2(fbm(cq*1.12+slow+1.4),fbm(cq*1.08-slow+8.7))-.5;
      float molecular=fbm(cq*2.1+cloudWarp*.92+slow*.45);
      float dust=fbm(cq*4.7-cloudWarp*.35-slow*.2);
      float cloudShape=smoothstep(.49,.78,molecular)*webMask;
      vec3 coldGas=mix(vec3(.012,.025,.075),vec3(.115,.028,.16),dust);
      col+=coldGas*cloudShape*(.20+.30*dust);
      float webFar=filament(cq+slow*.35,2.25,8.1);
      float webMid=filament(cq*mat2(.94,-.34,.34,.94)-slow*.55,3.45,2.7);
      float webNear=filament(cq*mat2(.72,.69,-.69,.72)+slow,5.1,5.4);
      float web=webFar*.34+webMid*.58+webNear*.82;
      web*=webMask*(.55+1.25*smoothstep(.26,.60,cosmicR));

      float knots=pow(clamp(webNear*webMid*2.7,0.,1.),2.2);
      float goldNodes=nodeLayer(cq,11.,3.2)+nodeLayer(cq*mat2(.86,-.5,.5,.86),17.,7.4)*.55;
      goldNodes*=webMask*smoothstep(.16,.58,web);
      float edgeGlow=exp(-abs(cosmicR-.43)*18.);
      vec3 violet=vec3(.22,.035,.48);
      vec3 electricBlue=vec3(.035,.23,.56);
      vec3 warmGold=vec3(1.0,.42,.055);
      vec3 webColor=mix(electricBlue,violet,.45+.45*sin(cq.x*3.8-cq.y*2.4));
      webColor=mix(webColor,warmGold,clamp(knots*1.8+webFar*.16,0.,.82));
      col+=webColor*web*.48;
      col+=mix(vec3(.05,.18,.52),vec3(.48,.06,.62),noise(cq*4.))*edgeGlow*.16;
      col+=warmGold*(knots*.52+goldNodes*.46);
      col+=vec3(1.,.76,.30)*goldNodes*goldNodes*.16;

      // Entfernte Galaxien sitzen bevorzugt außerhalb des lokalen Voids.
      vec3 galaxies=distantGalaxies(cq+slow*.09,8.5,3.1)+distantGalaxies(cq*mat2(.93,-.37,.37,.93),13.,8.6)*.52;
      col+=galaxies*webMask*(.18+web*.28);

      float stars=starLayer(uv+drift,20.,1.)+starLayer(uv-drift*.5,41.,7.)*.56;
      float starDensity=mix(.045,1.15,clamp(voidGate+web*.85,0.,1.));
      vec3 starTint=mix(vec3(.45,.62,1.),warmGold,clamp(web*1.6,0.,1.));
      col+=stars*starTint*starDensity;
      vec3 resolvedStars=deepStars(uv+drift*.18,29.,2.4)+deepStars(uv-drift*.12,53.,9.2)*.48;
      col+=resolvedStars*mix(.028,.35,clamp(voidGate+web*.7,0.,1.));
      col*=1.-(1.-voidGate)*.15;
      col+=vec3(.006,.009,.026)*(1.-voidGate)*.22;

      // Eine hauchduenne Vordergrund-Staubspur erzeugt dokumentarische Tiefe.
      float foregroundDust=smoothstep(.52,.76,fbm(uv*2.35+vec2(-t*.0015,t*.0008)+12.));
      col=mix(col,col*vec3(.31,.23,.34),foregroundDust*.18);

      float s=u_scene;
      float hero=1.-smoothstep(.15,.9,abs(s-0.));
      float h=1.-smoothstep(.15,.9,abs(s-1.));
      float f=1.-smoothstep(.15,.9,abs(s-2.));
      float k=1.-smoothstep(.15,.9,abs(s-3.));
      float end=1.-smoothstep(.15,.9,abs(s-4.));
      vec2 center=cosmosCenter;
      vec2 p=uv-center;
      float r=length(p), ang=atan(p.y,p.x);

      col+=hero*vec3(.08,.2,.24)*ring(p,.33+.025*sin(t*.25),.09);
      col+=hero*vec3(.5,.18,.12)*ring(p,.7+.02*sin(t*.17),.012);

      float rate=mix(.82,1.18,(u_hubble-67.)/6.);
      float spokes=pow(max(0.,cos(ang*18.+t*.18)),34.)*.22/max(r,.02);
      float waves=ring(p,fract(r*2.5-t*.07*rate),.02)+ring(p,fract(r*2.5-t*.07*rate+.5),.018);
      col+=h*(spokes*.12+waves*.15)*palette(fract(r*2.));
      col+=h*vec3(.15,.7,.78)*ring(p,.30,.008);
      col+=h*vec3(1.,.25,.18)*ring(p,.42,.008);

      vec2 fp=uv-vec2(.24,.0); float fr=length(fp); float fa=atan(fp.y,fp.x);
      float spiral=exp(-fr*3.2)*pow(max(0.,.5+.5*cos(fa*3.-fr*17.+t*.08)),5.);
      float spiralDust=noise(vec2(fa*4.,fr*20.-t*.03));
      col+=f*spiral*spiralDust*vec3(.55,.22,.16)*2.2;
      float barrierX=mix(-.22,.35,u_filter);
      float barrier=exp(-abs(fp.x-barrierX)*180.)*smoothstep(.48,.05,abs(fp.y));
      col+=f*barrier*vec3(1.,.2,.12)*.8;
      float pulse=ring(fp,fract(t*.08)*.7,.012)*(1.-u_filter*.5);
      col+=f*pulse*vec3(.25,.75,.82)*smoothstep(barrierX+.03,barrierX-.04,fp.x);

      vec2 kp=uv-vec2(.18,0.); float kr=length(kp);
      float shell=ring(kp,.46,.018)+ring(kp,.49,.045)*.35;
      float voidMask=smoothstep(.48,.06,kr)*u_density;
      col=mix(col,vec3(.008,.011,.016),k*voidMask*.78);
      col+=k*shell*vec3(.62,.82,.18)*(1.2+u_density*2.);
      float outward=pow(max(0.,cos(atan(kp.y,kp.x)*24.-t*.3)),30.)*smoothstep(.08,.46,kr)*smoothstep(.52,.35,kr);
      col+=k*outward*u_density*vec3(.5,.7,.2)*.45;

      float interference=.5+.5*cos(r*28.-t*.25+sin(ang*3.)*2.);
      col+=end*ring(p,.42,.12)*interference*palette(fract(ang/6.283+.5))*.7;
      col+=end*vec3(.55,.7,.2)*ring(p,.66,.012);

      float vignette=1.-smoothstep(.45,1.05,length(uv/vec2(aspect*.55,.62)));
      col*=.55+.45*vignette;
      col+=noise(gl_FragCoord.xy+t)*.010;
      // Filmisches Highlight-Rolloff statt digitaler, ausgebrannter Farben.
      col=col/(1.+col);
      col=pow(max(col,0.),vec3(.78));
      col=mix(col,vec3(dot(col,vec3(.2126,.7152,.0722))),-.08);
      gl_FragColor=vec4(col,1.);
    }
  `;
  function compile(type, source) {
    const shader=gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  let program;
  try {
    program=gl.createProgram();
    gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));
    gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch(error) {
    console.error('WebGL shader error:',error); fallback.hidden=false; canvas.style.display='none'; return;
  }
  gl.useProgram(program);
  const buffer=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'a_position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const uniforms={};
  ['u_res','u_time','u_scene','u_scroll','u_hubble','u_density','u_filter','u_textureReady','u_documentary'].forEach(n=>uniforms[n]=gl.getUniformLocation(program,n));
  let textureReady=0;
  const documentaryTexture=gl.createTexture();
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,documentaryTexture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([4,7,14,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.uniform1i(uniforms.u_documentary,0);
  const documentaryImage=new Image();
  documentaryImage.addEventListener('load',()=>{
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,documentaryTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,documentaryImage);
    textureReady=1;
  });
  documentaryImage.addEventListener('error',()=>console.warn('Documentary universe texture could not be loaded.'));
  documentaryImage.src='assets/cosmic-void-documentary.png';
  function resize(){
    const detailCap=innerWidth<700?1.35:1.8;
    const dpr=Math.min(devicePixelRatio,detailCap),w=Math.floor(innerWidth*dpr),h=Math.floor(innerHeight*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
  }
  addEventListener('resize',resize); resize();
  function frame(now){
    const dt=Math.min((now-last)/1000,.05); last=now;
    if(!paused) elapsed+=dt;
    scene+=(targetScene-scene)*(paused?1:.035);
    gl.uniform2f(uniforms.u_res,canvas.width,canvas.height);
    gl.uniform1f(uniforms.u_time,elapsed);
    gl.uniform1f(uniforms.u_scene,scene);
    gl.uniform1f(uniforms.u_scroll,scrollProgress);
    gl.uniform1f(uniforms.u_hubble,hubble);
    gl.uniform1f(uniforms.u_density,density);
    gl.uniform1f(uniforms.u_filter,filterFuture);
    gl.uniform1f(uniforms.u_textureReady,textureReady);
    gl.drawArrays(gl.TRIANGLES,0,6);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
