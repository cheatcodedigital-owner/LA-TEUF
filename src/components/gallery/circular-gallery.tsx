"use client";

import {
  Camera,
  Mesh,
  Plane,
  Program,
  Renderer,
  Texture,
  Transform,
  type OGLRenderingContext,
} from "ogl";
import { useEffect, useRef } from "react";

// Galerie circulaire WebGL (OGL), adaptée du composant « circular-gallery-2» de 21st.dev :
// - glisser (souris, doigt) ou défilement horizontal pour la faire tourner, dérive lente au repos ;
// - la molette verticale reste celle de la page (le composant d'origine la détournait partout) ;
// - rendu en pause hors écran, onde et dérive coupées avec prefers-reduced-motion ;
// - `onReady` / `onError` permettent d'afficher une alternative HTML si WebGL est indisponible.

export interface GalleryItem {
  image: string;
  /** Légende dessinée sous l'image ; omise si absente */
  text?: string;
}

interface CircularGalleryProps {
  items: GalleryItem[];
  /** Courbure : plus la valeur est haute, plus l'arc est marqué */
  bend?: number;
  /** Rayon des coins, en fraction de la taille de l'image (0 à 0,5) */
  borderRadius?: number;
  /** Multiplicateur de vitesse du glisser */
  scrollSpeed?: number;
  /** Lissage du mouvement (plus bas = plus doux) */
  scrollEase?: number;
  /** Vitesse de la dérive automatique au repos (0 pour la couper) */
  autoSpeed?: number;
  className?: string;
  onReady?: () => void;
  onError?: () => void;
}

interface Size {
  width: number;
  height: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function createTextTexture(gl: OGLRenderingContext, text: string, font: string, color: string) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  const textWidth = Math.ceil(ctx.measureText(text).width);
  const textHeight = Math.ceil(parseInt(font.replace(/^\D*/, ""), 10) * 1.2) || 40;
  canvas.width = textWidth + 20;
  canvas.height = textHeight + 20;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new Texture(gl, { generateMipmaps: false });
  texture.image = canvas;
  return { texture, width: canvas.width, height: canvas.height };
}

class Title {
  constructor(gl: OGLRenderingContext, plane: Mesh, text: string, color: string, font: string) {
    const { texture, width, height } = createTextTexture(gl, text, font, color);
    const program = new Program(gl, {
      vertex: /* glsl */ `
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: /* glsl */ `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          vec4 color = texture2D(tMap, vUv);
          if (color.a < 0.1) discard;
          gl_FragColor = color;
        }
      `,
      uniforms: { tMap: { value: texture } },
      transparent: true,
    });
    const mesh = new Mesh(gl, { geometry: new Plane(gl), program });
    const textHeight = plane.scale.y * 0.15;
    mesh.scale.set(textHeight * (width / height), textHeight, 1);
    mesh.position.y = -plane.scale.y * 0.5 - textHeight * 0.5 - 0.05;
    mesh.setParent(plane);
  }
}

class Media {
  plane: Mesh;
  program: Program;
  extra = 0;
  width = 0;
  widthTotal = 0;
  x = 0;
  isBefore = false;
  isAfter = false;

  constructor(
    private gl: OGLRenderingContext,
    geometry: Plane,
    scene: Transform,
    private index: number,
    private length: number,
    private screen: Size,
    private viewport: Size,
    private bend: number,
    image: string,
    text: string | undefined,
    textColor: string,
    font: string,
    borderRadius: number,
    private animate: boolean,
  ) {
    const texture = new Texture(gl, { generateMipmaps: true });
    this.program = new Program(gl, {
      depthTest: false,
      depthWrite: false,
      vertex: /* glsl */ `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragment: /* glsl */ `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        varying vec2 vUv;

        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }

        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);
          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          float alpha = 1.0 - smoothstep(-0.002, 0.002, d);
          gl_FragColor = vec4(color.rgb, alpha);
        }
      `,
      uniforms: {
        tMap: { value: texture },
        uPlaneSizes: { value: [0, 0] },
        uImageSizes: { value: [0, 0] },
        uSpeed: { value: 0 },
        uTime: { value: 100 * Math.random() },
        uBorderRadius: { value: borderRadius },
      },
      transparent: true,
    });

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      texture.image = img;
      this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
    };

    this.plane = new Mesh(gl, { geometry, program: this.program });
    this.plane.setParent(scene);
    this.onResize();
    if (text) new Title(gl, this.plane, text, textColor, font);
  }

  update(scroll: { current: number; last: number }, direction: "left" | "right") {
    this.plane.position.x = this.x - scroll.current - this.extra;

    const x = this.plane.position.x;
    const H = this.viewport.width / 2;

    if (this.bend === 0) {
      this.plane.position.y = 0;
      this.plane.rotation.z = 0;
    } else {
      // Courbure proportionnelle à la largeur visible : même inclinaison des vignettes sur mobile et sur grand écran
      const B = (Math.abs(this.bend) * H) / 17.4;
      const R = (H * H + B * B) / (2 * B);
      const effectiveX = Math.min(Math.abs(x), H);
      const arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
      const sign = this.bend > 0 ? 1 : -1;
      this.plane.position.y = -sign * arc;
      this.plane.rotation.z = -sign * Math.sign(x) * Math.asin(effectiveX / R);
    }

    if (this.animate) this.program.uniforms.uTime.value += 0.04;
    this.program.uniforms.uSpeed.value = this.animate ? scroll.current - scroll.last : 0;

    const planeOffset = this.plane.scale.x / 2;
    const viewportOffset = this.viewport.width / 2;
    this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
    this.isAfter = this.plane.position.x - planeOffset > viewportOffset;

    if (direction === "right" && this.isBefore) {
      this.extra -= this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
    if (direction === "left" && this.isAfter) {
      this.extra += this.widthTotal;
      this.isBefore = this.isAfter = false;
    }
  }

  onResize(size?: { screen: Size; viewport: Size }) {
    if (size) {
      this.screen = size.screen;
      this.viewport = size.viewport;
    }
    const scale = this.screen.height / 1500;
    this.plane.scale.y = (this.viewport.height * (900 * scale)) / this.screen.height;
    this.plane.scale.x = (this.viewport.width * (700 * scale)) / this.screen.width;
    this.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
    this.width = this.plane.scale.x + 2;
    this.widthTotal = this.width * this.length;
    this.x = this.width * this.index;
  }
}

class App {
  private renderer: Renderer;
  private gl: OGLRenderingContext;
  private camera: Camera;
  private scene = new Transform();
  private medias: Media[] = [];
  private screen: Size = { width: 0, height: 0 };
  private viewport: Size = { width: 0, height: 0 };
  private scroll = { ease: 0.05, current: 0, target: 0, last: 0 };
  private raf = 0;
  private running = false;
  private isDown = false;
  private hovered = false;
  private startX = 0;
  private startTarget = 0;
  private checkTimer = 0;
  private resizeObserver: ResizeObserver;
  private visibilityObserver: IntersectionObserver;

  constructor(
    private container: HTMLElement,
    private opts: Required<Omit<CircularGalleryProps, "className" | "onReady" | "onError" | "items">> & {
      items: GalleryItem[];
      textColor: string;
      font: string;
      reduced: boolean;
    },
  ) {
    this.scroll.ease = opts.scrollEase;
    this.renderer = new Renderer({ alpha: true, antialias: true, dpr: Math.min(window.devicePixelRatio || 1, 2) });
    this.gl = this.renderer.gl;
    this.gl.clearColor(0, 0, 0, 0);
    container.appendChild(this.gl.canvas);

    this.camera = new Camera(this.gl);
    this.camera.fov = 45;
    this.camera.position.z = 20;

    this.measure();

    const geometry = new Plane(this.gl, { heightSegments: 50, widthSegments: 100 });
    // La liste est doublée pour que la boucle soit sans couture
    const list = [...opts.items, ...opts.items];
    this.medias = list.map(
      (item, index) =>
        new Media(
          this.gl,
          geometry,
          this.scene,
          index,
          list.length,
          this.screen,
          this.viewport,
          opts.bend,
          item.image,
          item.text,
          opts.textColor,
          opts.font,
          opts.borderRadius,
          !opts.reduced,
        ),
    );

    container.addEventListener("pointerdown", this.onDown);
    container.addEventListener("pointerenter", this.onEnter);
    container.addEventListener("pointerleave", this.onLeave);
    container.addEventListener("wheel", this.onWheel, { passive: true });
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);

    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(container);
    this.visibilityObserver = new IntersectionObserver(([entry]) => (entry.isIntersecting ? this.start() : this.stop()), {
      threshold: 0.01,
    });
    this.visibilityObserver.observe(container);
  }

  private measure() {
    this.screen = { width: this.container.clientWidth, height: this.container.clientHeight };
    this.renderer.setSize(this.screen.width, this.screen.height);
    this.camera.perspective({ aspect: this.screen.width / this.screen.height });
    const fov = (this.camera.fov * Math.PI) / 180;
    const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
    this.viewport = { width: height * this.camera.aspect, height };
  }

  private onResize = () => {
    if (!this.container.clientWidth || !this.container.clientHeight) return;
    this.measure();
    this.medias.forEach((m) => m.onResize({ screen: this.screen, viewport: this.viewport }));
  };

  private onEnter = () => (this.hovered = true);
  private onLeave = () => (this.hovered = false);

  private onDown = (e: PointerEvent) => {
    this.isDown = true;
    this.startX = e.clientX;
    this.startTarget = this.scroll.target;
  };

  private onMove = (e: PointerEvent) => {
    if (!this.isDown) return;
    this.scroll.target = this.startTarget + (this.startX - e.clientX) * (this.opts.scrollSpeed * 0.025);
  };

  private onUp = () => {
    if (!this.isDown) return;
    this.isDown = false;
    this.snap();
  };

  // Défilement horizontal uniquement : la molette verticale appartient à la page
  private onWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    this.scroll.target += Math.sign(e.deltaX) * this.opts.scrollSpeed * 0.2;
    window.clearTimeout(this.checkTimer);
    this.checkTimer = window.setTimeout(() => this.snap(), 200);
  };

  private snap() {
    const width = this.medias[0]?.width;
    if (!width) return;
    const item = width * Math.round(Math.abs(this.scroll.target) / width);
    this.scroll.target = this.scroll.target < 0 ? -item : item;
  }

  private frame = () => {
    if (!this.isDown && !this.hovered && this.opts.autoSpeed) this.scroll.target += this.opts.autoSpeed;
    this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
    const direction = this.scroll.current > this.scroll.last ? "right" : "left";
    this.medias.forEach((m) => m.update(this.scroll, direction));
    this.renderer.render({ scene: this.scene, camera: this.camera });
    this.scroll.last = this.scroll.current;
    this.raf = requestAnimationFrame(this.frame);
  };

  private start() {
    if (this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  destroy() {
    this.stop();
    window.clearTimeout(this.checkTimer);
    this.resizeObserver.disconnect();
    this.visibilityObserver.disconnect();
    this.container.removeEventListener("pointerdown", this.onDown);
    this.container.removeEventListener("pointerenter", this.onEnter);
    this.container.removeEventListener("pointerleave", this.onLeave);
    this.container.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onUp);
    this.gl.canvas.parentNode?.removeChild(this.gl.canvas);
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

export function CircularGallery({
  items,
  bend = 3,
  borderRadius = 0.05,
  scrollSpeed = 2,
  scrollEase = 0.05,
  autoSpeed = 0.012,
  className = "",
  onReady,
  onError,
}: CircularGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const style = getComputedStyle(container);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let app: App | undefined;
    try {
      app = new App(container, {
        items,
        bend,
        borderRadius,
        scrollSpeed,
        scrollEase,
        autoSpeed: reduced ? 0 : autoSpeed,
        textColor: style.color,
        font: `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
        reduced,
      });
      onReady?.();
    } catch {
      onError?.();
    }

    return () => app?.destroy();
  }, [items, bend, borderRadius, scrollSpeed, scrollEase, autoSpeed, onReady, onError]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={`h-full w-full cursor-grab touch-pan-y overflow-hidden active:cursor-grabbing ${className}`}
    />
  );
}
