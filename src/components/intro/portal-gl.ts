// Plongée en POV dans un tunnel en forme de trou de serrure, rendue en WebGL.
// Le canvas est transparent : le fond du tunnel s'ouvre sur la page, qui se révèle peu à peu.

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;
uniform float uU; // progression 0..1

const float L = 22.0;  // longueur du tunnel
const float F = 1.0;   // focale

const vec3 COPPER = vec3(0.902, 0.424, 0.247);
const vec3 VIOLET = vec3(0.463, 0.333, 1.0);
const vec3 INDIGO = vec3(0.125, 0.125, 0.322);
const vec3 IVORY  = vec3(0.953, 0.914, 0.835);

// Trapèze (iq) : r1 bas, r2 haut, he demi-hauteur
float sdTrapezoid(vec2 p, float r1, float r2, float he) {
  vec2 k1 = vec2(r2, he);
  vec2 k2 = vec2(r2 - r1, 2.0 * he);
  p.x = abs(p.x);
  vec2 ca = vec2(p.x - min(p.x, (p.y < 0.0) ? r1 : r2), abs(p.y) - he);
  vec2 cb = p - k1 + k2 * clamp(dot(k1 - p, k2) / dot(k2, k2), 0.0, 1.0);
  float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
  return s * sqrt(min(dot(ca, ca), dot(cb, cb)));
}

float sdKeyhole(vec2 p) {
  float head = length(p - vec2(0.0, 0.20)) - 0.21;
  float body = sdTrapezoid(p - vec2(0.0, -0.22), 0.20, 0.06, 0.34);
  return min(head, body);
}

// Distance de l'origine au bord du trou de serrure dans la direction d
float radial(vec2 d) {
  float t = 0.0;
  for (int i = 0; i < 28; i++) {
    float s = -sdKeyhole(d * t);
    if (s < 0.002) break;
    t += max(s, 0.002);
  }
  return t;
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  float u = uU;
  float t = uTime;

  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);

  // Léger roulis pendant la descente, qui revient à zéro avant l'ouverture : le trou de serrure
  // final est droit
  float rot = 0.05 * sin(t * 1.1) * smoothstep(0.1, 0.5, u) * (1.0 - smoothstep(0.6, 0.8, u))
            + 0.4 * sin(3.14159 * clamp((u - 0.15) / 0.6, 0.0, 1.0));
  float c = cos(rot), s = sin(rot);
  p = mat2(c, -s, s, c) * p;

  float rho = max(length(p), 1e-4);
  vec2 d = p / rho;
  float R = radial(d);

  // Caméra : approche lente, accélération, puis chute vers la lumière du fond
  float e = u * u * (3.0 - 2.0 * u);
  float z0 = mix(-3.2, L - 0.07, e);
  float zh = z0 + F * R / rho;     // profondeur du point de paroi touché
  float depth = zh - z0;

  float warm = smoothstep(0.0, 0.9, t);
  vec3 col;
  float alpha = 1.0;

  if (zh < 0.0) {
    // Hors du tunnel : noir, avec un halo autour de l'entrée
    float breathe = 0.8 + 0.2 * sin(t * 3.2);
    col = COPPER * exp(-abs(zh) * 16.0) * 1.3 * breathe * warm
        + VIOLET * exp(-abs(zh) * 4.5) * 0.28 * warm;
  } else if (zh < L) {
    // Paroi : anneaux lumineux, nervures, brouillard de profondeur
    float ang = atan(d.y, d.x);
    float band = pow(max(0.0, 1.0 - abs(fract(zh * 0.55) - 0.5) * 2.0), 6.0);
    float ribs = pow(abs(sin(ang * 8.0 + zh * 0.15)), 24.0) * 0.4;
    vec3 light = mix(COPPER, VIOLET, 0.5 + 0.5 * sin(zh * 0.28 + t * 0.6));
    float fog = exp(-depth * 0.10);
    col = INDIGO * 0.55 * fog + light * (band * 1.4 + ribs) * fog;
    col += COPPER * exp(-zh * 6.0) * 1.2;                   // lèvre de l'entrée
    float ex = smoothstep(L - 9.0, L, zh);                  // lumière au bout du tunnel
    col += mix(VIOLET, COPPER, ex) * ex * ex * 0.7;
    col += IVORY * exp(-(L - zh) * 3.5) * 0.9;              // bord incandescent de l'ouverture
    col *= 1.0 - 0.85 * smoothstep(0.62, 0.95, u) * (1.0 - exp(-(L - zh) * 1.2)); // les parois s'éteignent
  } else {
    // Fond du tunnel : noir profond qui devient transparent et laisse voir la page
    col = VIOLET * 0.04 * (0.6 + 0.4 * sin(t * 2.0));
  }

  // Dénouement : le fond du tunnel est un trou de serrure (même repère, même roulis, même
  // échelle que la caméra voit : F / distance au fond). On le rend transparent en fondu : la
  // forme qui s'ouvre sur le site est donc exactement la fin du plongeon, et elle s'agrandit
  // au rythme de la chute.
  float Kc = F / (L - z0);
  float dist = sdKeyhole(p / Kc) * Kc;
  float feather = 0.015 + 0.02 * Kc;
  float reveal = smoothstep(0.55, 0.72, u);
  float open = (1.0 - smoothstep(-feather, feather, dist)) * reveal;
  col += vec3(1.0, 0.78, 0.6) * exp(-max(dist, 0.0) / (feather + 0.02)) * 0.5 * reveal;
  alpha *= 1.0 - open;
  alpha *= 1.0 - smoothstep(0.97, 1.0, u);
  col *= 1.0 - 0.35 * smoothstep(0.35, 1.2, rho);
  col += (hash(gl_FragCoord.xy + t) - 0.5) * 0.025;
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col * alpha, alpha);
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export type PortalOptions = {
  duration: number;
  onFirstFrame: () => void;
  onDone: () => void;
};

/** Lance l'animation. Retourne une fonction d'arrêt, ou null si WebGL est indisponible. */
export function startPortal(canvas: HTMLCanvasElement, opts: PortalOptions): (() => void) | null {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, "uRes");
  const uTime = gl.getUniformLocation(program, "uTime");
  const uU = gl.getUniformLocation(program, "uU");

  // Résolution plafonnée pour rester fluide sur mobile
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener("resize", resize);

  const start = performance.now();
  let raf = 0;
  let first = true;
  let stopped = false;

  // Dev uniquement : ?introAt=0.6 fige l'animation à 60 % pour l'inspecter
  const freeze =
    process.env.NODE_ENV !== "production"
      ? Number(new URLSearchParams(window.location.search).get("introAt"))
      : 0;

  const frame = (now: number) => {
    if (stopped) return;
    const elapsed = freeze > 0 ? freeze * opts.duration : now - start;
    const u = Math.min(elapsed / opts.duration, 1);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, elapsed / 1000);
    gl.uniform1f(uU, u);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (first) {
      first = false;
      opts.onFirstFrame();
    }
    if (freeze > 0) return;
    if (u >= 1) {
      stopped = true;
      opts.onDone();
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    gl.deleteBuffer(buffer);
  };
}
