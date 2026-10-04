import { Browser, Code, Database, PaintBrushBroad, RocketLaunch, ShareNetwork, Wrench } from "@phosphor-icons/react";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { about, CONTACT_EMAIL, contact, disciplines, facts, LINKEDIN_URL, path } from "./content";

gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, InertiaPlugin);
const HeroScene = lazy(() => import("./scene/HeroScene").then((m) => ({ default: m.HeroScene })));

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ICONS = [Code, ShareNetwork, Browser];
const CARD = ["#2f6bff", "#ff6a2b", "#18c37e"];
// x/y = desktop, mx/my = mobil (samolepky kolem fotky, ať ji nezakrývají)
const STICKERS = [
  { t: "ČVUT FEL", c: "#2f6bff", x: 6, y: 8, r: -8, mx: 4, my: 4 },
  { t: "Praha", c: "#ffd23f", x: 58, y: 4, r: 6, mx: 64, my: 3 },
  { t: "SQL", c: "#111111", x: 70, y: 60, r: -4, mx: 3, my: 48 },
  { t: "Create value", c: "#ff6a2b", x: 4, y: 74, r: 4, mx: 5, my: 82 },
  { t: "LAN", c: "#18c37e", x: 40, y: 82, r: -10, mx: 68, my: 86 },
  { t: "Káva?", c: "#ffffff", x: 76, y: 28, r: 12, mx: 74, my: 42 },
];

export default function App() {
  const root = useRef<HTMLDivElement>(null);
  const [heroOn, setHeroOn] = useState(true);
  // 3D se připojí až po animaci nadpisu, kompilace shaderů jinak sekne úvodní pohyb
  const [sceneMounted, setSceneMounted] = useState(false);
  const [sceneShown, setSceneShown] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ lerp: 0.1, anchors: true });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(tick); lenis.destroy(); };
  }, []);

  // scéna běží, kdykoli je hero aspoň kouskem vidět. ScrollTrigger se startem „top top“
  // na úplném vršku stránky hlásil odchod a scéna zamrzla.
  useEffect(() => {
    const hero = document.querySelector(".h6");
    if (!hero) return;
    const io = new IntersectionObserver(([e]) => setHeroOn(e.isIntersecting), { rootMargin: "100px 0px" });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    const cleanups: (() => void)[] = [];
    const ctx = gsap.context(() => {
      // hero: písmena vyskočí zespodu, jen transformacemi
      const title = SplitText.create(".h6-title", { type: "words,chars", charsClass: "h6c" });
      // start až po načtení písma a dvou snímcích, jinak úvod padne do načítání kódu a sekne
      const tl = gsap.timeline({ paused: true });
      document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(() => tl.play())));
      tl.from(title.chars, {
          yPercent: 100, opacity: 0, rotate: 6,
          duration: 0.9, ease: "back.out(2)", stagger: 0.022,
        })
        .from(".h6-fade", { y: 20, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.08 }, "-=0.5")
        .call(() => setSceneMounted(true), [], 0.75);


      // navigace: na tmavých sekcích světlé logo, prostřední menu jen na vršku stránky
      const nav = document.querySelector<HTMLElement>(".nav6")!;
      gsap.utils.toArray<HTMLElement>('[data-nav="dark"]').forEach((sec) => {
        ScrollTrigger.create({ trigger: sec, start: "top 36px", end: "bottom 36px", onToggle: (s) => nav.classList.toggle("is-dark", s.isActive) });
      });
      ScrollTrigger.create({ start: 0, end: "max", onUpdate: (s) => nav.classList.toggle("is-scrolled", s.scroll() > 120) });
      // pozice spouštěčů přepočítat, když se změní výška stránky (načtené obrázky, písmo)
      let rt = 0;
      const pageRo = new ResizeObserver(() => { clearTimeout(rt); rt = window.setTimeout(() => ScrollTrigger.refresh(), 150); });
      pageRo.observe(document.querySelector("main")!);
      cleanups.push(() => { pageRo.disconnect(); clearTimeout(rt); });

      // karty oborů přiletí s rotací
      gsap.from(".k6", {
        y: 160, rotate: (i) => [-14, 6, 16][i], opacity: 0, duration: 1.1, ease: "back.out(1.4)", stagger: 0.12,
        scrollTrigger: { trigger: ".k6-grid", start: "top 80%" },
      });

      // čísla vyskočí
      gsap.utils.toArray<HTMLElement>(".f6-num").forEach((el) => {
        const end = Number(el.dataset.v), year = end > 1900 && end < 2100;
        const o = { v: year ? end - 12 : 0 };
        gsap.to(o, { v: end, duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" },
          onUpdate: () => (el.textContent = (year ? String(Math.round(o.v)) : Math.round(o.v).toLocaleString("cs-CZ")) + (el.dataset.s ?? "")) });
      });
      gsap.from(".f6-item", { scale: 0.6, opacity: 0, duration: 0.9, ease: "back.out(2.2)", stagger: 0.1, scrollTrigger: { trigger: ".f6", start: "top 80%" } });

      // samolepky se nalepí a jdou tahat
      gsap.from(".st6:not(.st6-photo)", { scale: 1.6, opacity: 0, rotate: "+=25", duration: 0.7, ease: "back.out(2.5)", stagger: 0.09, scrollTrigger: { trigger: ".board6", start: "top 75%" } });
      gsap.from(".st6-photo", { scale: 1.3, opacity: 0, duration: 0.7, ease: "back.out(2.5)", scrollTrigger: { trigger: ".board6", start: "top 75%" } });
      // polaroid se při vjetí do obrazu vyvolá jako instantní film
      // spouští se, až je nástěnka z velké části vidět (spolehlivější než ScrollTrigger při skoku kotvou)
      const dev = document.querySelector<HTMLElement>(".st6-dev");
      const devBoard = document.querySelector(".board6");
      if (dev && devBoard) {
        const io = new IntersectionObserver(([e]) => {
          if (!e.isIntersecting) return;
          io.disconnect();
          gsap.to(dev, { opacity: 0, duration: reduced ? 0 : 4, delay: reduced ? 0 : 0.4, ease: "power1.inOut" });
        }, { threshold: 0.45 });
        io.observe(devBoard);
        cleanups.push(() => io.disconnect());
      }
      Draggable.create(".st6:not(.st6-photo)", {
        bounds: ".board6", inertia: true, edgeResistance: 0.65,
        onPress() { gsap.to(this.target, { scale: 1.08, rotate: "+=4", duration: 0.2, boxShadow: "0 22px 40px rgba(0,0,0,.25)" }); },
        onRelease() { gsap.to(this.target, { scale: 1, duration: 0.5, ease: "elastic.out(1,0.4)", boxShadow: "0 8px 0 rgba(0,0,0,.12)" }); },
      });
      gsap.from(".a6-text p", { y: 30, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.1, scrollTrigger: { trigger: ".a6-text", start: "top 80%" } });
      ScrollTrigger.create({ trigger: ".a6-text", start: "top 62%", once: true, onEnter: () => document.querySelector(".a6-text")?.classList.add("is-marked") });

      // cesta: kabel se kreslí se scrollem a konektor jede po něm
      const pathEl = document.querySelector<SVGPathElement>(".t6-cable");
      const svg = document.querySelector<SVGSVGElement>(".t6-svg");
      if (pathEl && svg) {
        const plug = document.querySelector<HTMLElement>(".t6-plug")!;
        const prog = { p: 0 };
        let L = 1;
        // trasa kabelu v pixelech podle aktuální velikosti sekce; přepočítá se při každé změně,
        // jinak se SVG přeškáluje a kabel ujede konektoru
        const build = () => {
          const w = svg.clientWidth, h = svg.clientHeight, n = 5, mid = w / 2, amp = Math.min(w * 0.42, 260);
          let d = `M${mid} 0`;
          for (let i = 0; i < n; i++) {
            const y0 = (i * h) / n, y1 = ((i + 1) * h) / n, side = i % 2 ? -1 : 1;
            d += ` C ${mid + amp * side} ${y0 + (y1 - y0) * 0.25}, ${mid + amp * side} ${y0 + (y1 - y0) * 0.75}, ${mid} ${y1}`;
          }
          svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
          svg.querySelectorAll("path").forEach((pp) => pp.setAttribute("d", d));
          L = pathEl.getTotalLength();
          pathEl.style.strokeDasharray = String(L);
          place(prog.p);
        };
        // kabel i konektor řídí jedno číslo, jinak se rozjedou a kabel vyčnívá ze spojky
        const place = (p: number) => {
          const pw = plug.offsetWidth, ph = plug.offsetHeight;
          const at = Math.max(1, L * p);
          pathEl.style.strokeDashoffset = String(L - at);
          // směr z posledního úseku kabelu, ne z jednoho bodu, ať konektor sedí v ose i v zatáčce
          const a = pathEl.getPointAtLength(at), b = pathEl.getPointAtLength(Math.max(0, at - 26));
          const ang = Math.atan2(a.y - b.y, a.x - b.x);
          // střed konektoru kousek před koncem kabelu, ať konec kabelu zajede do zadní části
          const ahead = ph / 2 - 20;
          const cx = a.x + Math.cos(ang) * ahead, cy = a.y + Math.sin(ang) * ahead;
          gsap.set(plug, { x: cx - pw / 2, y: cy - ph / 2, rotation: (ang * 180) / Math.PI + 90, transformOrigin: "50% 50%" });
        };
        build();
        const ro = new ResizeObserver(build);
        ro.observe(svg);
        gsap.to(prog, {
          p: 1, ease: "none", onUpdate: () => place(prog.p),
          scrollTrigger: { trigger: ".t6-wrap", start: "top 70%", end: "bottom 70%", scrub: 0.6 },
        });
        cleanups.push(() => ro.disconnect());
      }
      gsap.utils.toArray<HTMLElement>(".t6-item").forEach((el, i) => {
        gsap.from(el, { x: (i % 2 ? 1 : -1) * (innerWidth < 768 ? 24 : 60), opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 80%" } });
      });
      // obrázky u událostí přiletí s rotací
      gsap.utils.toArray<HTMLElement>(".t6-pic").forEach((el) => {
        gsap.from(el, { scale: 0.5, rotation: gsap.utils.random(-25, 25), opacity: 0, duration: 0.9, ease: "back.out(1.8)", scrollTrigger: { trigger: el, start: "top 85%" } });
      });

      // kontakt
      const ct = SplitText.create(".c6-title", { type: "words,chars", charsClass: "c6ch" });
      gsap.from(ct.chars, { yPercent: 120, rotate: () => gsap.utils.random(-30, 30), opacity: 0, duration: 0.8, ease: "back.out(2)", stagger: 0.025, scrollTrigger: { trigger: ".c6", start: "top 70%" } });
      // písmena nadpisu uhýbají kurzoru a pružně se vrací
      if (!reduced) {
        const chars = ct.chars as HTMLElement[];
        const tos = chars.map((c) => ({
          x: gsap.quickTo(c, "x", { duration: 0.9, ease: "elastic.out(1, 0.35)" }),
          y: gsap.quickTo(c, "y", { duration: 0.9, ease: "elastic.out(1, 0.35)" }),
          s: gsap.quickTo(c, "scale", { duration: 0.6, ease: "power3" }),
        }));
        const titleSec = document.querySelector<HTMLElement>(".c6")!;
        const onTitleMove = (e: PointerEvent) => {
          const R = Math.max(140, innerWidth * 0.1);
          chars.forEach((c, i) => {
            const r = c.getBoundingClientRect();
            const cx = r.left + r.width / 2 - (Number(gsap.getProperty(c, "x")) || 0);
            const cy = r.top + r.height / 2 - (Number(gsap.getProperty(c, "y")) || 0);
            const dx = cx - e.clientX, dy = cy - e.clientY;
            const d = Math.hypot(dx, dy) || 1;
            const f = Math.max(0, 1 - d / R);
            // jen jemné uhnutí, ať nadpis zůstane čitelný
            tos[i].x((dx / d) * f * 12);
            tos[i].y((dy / d) * f * 12);
            tos[i].s(1 + f * 0.03);
          });
        };
        const onTitleLeave = () => tos.forEach((t) => { t.x(0); t.y(0); t.s(1); });
        titleSec.addEventListener("pointermove", onTitleMove);
        titleSec.addEventListener("pointerleave", onTitleLeave);
        cleanups.push(() => { titleSec.removeEventListener("pointermove", onTitleMove); titleSec.removeEventListener("pointerleave", onTitleLeave); });
      }
    }, root);
    return () => {
      cleanups.forEach((c) => c());
      ctx.revert();
    };
  }, []);

  return (
    <div ref={root}>

      <header className="nav6">
        <a href="#top" className="nav6-logo">Vojta<span>.</span></a>
        <nav className="nav6-links" aria-label="Hlavní">
          <a href="#co-delam">Co dělám</a>
          <a href="#o-mne">O mně</a>
          <a href="#cesta">Cesta</a>
        </nav>
        <a href="#kontakt" className="btn6 btn6-sm">Pojďme si promluvit</a>
      </header>

      <main>
        <section className="h6" id="top">
          <div className="h6-copy">
            <p className="h6-hi h6-fade">Ahoj, jsem Vojta Hübner</p>
            <h1 className="h6-title">Propojuju lidi, projekty a nápady.</h1>
            <p className="h6-sub h6-fade">Vyvíjím interní software, starám se o sítě a stavím weby. Studuju ČVUT FEL a podnikám od střední.</p>
            <div className="h6-ctas h6-fade">
              <a href="#kontakt" className="btn6">Pojďme si promluvit</a>
              <a href="#co-delam" className="link6">Co dělám</a>
            </div>
            <p className="h6-hint h6-fade">Chyťte kartu nebo kabel a zatřeste s nimi.</p>
          </div>
          <div className={`h6-scene${sceneShown ? " is-shown" : ""}`}>
            {sceneMounted && (
              <Suspense fallback={null}>
                <HeroScene running={heroOn} onReady={() => setSceneShown(true)} />
              </Suspense>
            )}
          </div>
        </section>

        <section className="k6-sec" id="co-delam" data-nav="dark">
          <div className="k6-spot" aria-hidden="true" />
          <h2 className="k6-head">Co dělám</h2>
          <div className="k6-grid">
            <CardGlows />
            {disciplines.map((d, i) => {
              const Icon = ICONS[i];
              return (
                <TiltCard key={d.word} color={CARD[i]}>
                  <Icon size={56} weight="duotone" aria-hidden="true" />
                  <h3>{d.word}</h3>
                  <p className="k6-lead">{d.lead}</p>
                  <p className="k6-text">{d.body}</p>
                </TiltCard>
              );
            })}
          </div>
        </section>

        <section className="f6" aria-label="Ve zkratce">
          {facts.map((f, i) => (
            <div className="f6-item" key={f.label} style={{ ["--c" as string]: CARD[i % 3] }}>
              <span className="f6-num" data-v={f.value} data-s={f.suffix}>0</span>
              <span className="f6-label">{f.label}</span>
            </div>
          ))}
        </section>

        <section className="a6" id="o-mne">
          <div className="a6-text">
            <h2>Kdo je Vojta</h2>
            {about.map((p, i) => <p key={i} className={i === 0 ? "a6-lead" : ""}>{highlight(p)}</p>)}
          </div>
          <div className="board6" aria-label="Nástěnka se samolepkami, dají se přetahovat">
            <Polaroid />
            {STICKERS.map((s) => (
              <span key={s.t} className="st6" style={{ "--x": `${s.x}%`, "--y": `${s.y}%`, "--mx": `${s.mx}%`, "--my": `${s.my}%`, rotate: `${s.r}deg`, background: s.c, color: s.c === "#ffd23f" || s.c === "#ffffff" ? "#111" : "#fff" } as React.CSSProperties}>{s.t}</span>
            ))}
          </div>
        </section>

        <section className="t6" id="cesta" data-nav="dark">
          <h2 className="t6-head">Cesta</h2>
          <div className="t6-wrap">
            <svg className="t6-svg" aria-hidden="true">
              <path className="t6-cable-bg" />
              <path className="t6-cable" />
            </svg>
            <span className="t6-plug" aria-hidden="true" />
            <ol className="t6-list">
              {path.map((s, i) => {
                const pic = PATH_PICS[i];
                const Icon = pic?.icon;
                return (
                  <li className={`t6-row${i % 2 ? " is-right" : ""}`} key={i}>
                    <div className="t6-item">
                      <span className="t6-year">{s.year}</span>
                      <h3>{s.title}</h3>
                      <p>{s.text}</p>
                    </div>
                    {/* do volného místa naproti kartě malý šikmý obrázek */}
                    {pic && (
                      <figure className="t6-pic" style={{ rotate: `${pic.tilt}deg` }} aria-hidden={!pic.img}>
                        {pic.img ? (
                          <img src={pic.img} alt={pic.alt} width={720} height={430} loading="lazy" />
                        ) : (
                          <span className="t6-pic-icon" style={{ background: pic.bg, color: pic.fg }}>{Icon && <Icon size={54} weight="duotone" />}</span>
                        )}
                      </figure>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="c6" id="kontakt">
          <h2 className="c6-title">{contact.title}</h2>
          <p className="c6-sub">{contact.sub}</p>
          <Coffee />
          <div className="c6-links">
            {CONTACT_EMAIL && <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>}
            <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">LinkedIn</a>
          </div>
        </section>
      </main>
    </div>
  );
}

// Bílé světlo v sekci „Co dělám“, čtyři vrstvy najednou:
// 1) podsvícení za každou kartou, 2) světlo z kurzoru a stíny karet podle něj,
// 3) studiový paprsek z horního rohu (CSS ::before sekce), 4) obíhající světelný obrys (CSS ::before karty)
function CardGlows() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const layer = ref.current!;
    const grid = layer.parentElement!;
    const sec = grid.closest("section") as HTMLElement;
    const spot = sec.querySelector<HTMLElement>(".k6-spot")!;
    const glows = [...layer.querySelectorAll<HTMLElement>(".k6-glow")];
    const cards = () => [...grid.querySelectorAll<HTMLElement>(".k6")];
    // podsvícení sedí přesně za středem karty (offset nezávisí na animaci karet)
    const place = () => {
      cards().forEach((c, i) => {
        const g = glows[i];
        if (!g) return;
        g.style.left = `${c.offsetLeft + c.offsetWidth / 2}px`;
        g.style.top = `${c.offsetTop + c.offsetHeight / 2}px`;
      });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(grid);

    // stíny karet padají na opačnou stranu, než je světlo
    const shade = (lx: number, ly: number) => {
      cards().forEach((c) => {
        const r = c.getBoundingClientRect();
        const dx = r.left + r.width / 2 - lx, dy = r.top + r.height / 2 - ly;
        const d = Math.hypot(dx, dy) || 1;
        const len = Math.min(48, 14 + d * 0.05);
        c.style.setProperty("--sx", `${((dx / d) * len).toFixed(1)}px`);
        c.style.setProperty("--sy", `${((dy / d) * len + 10).toFixed(1)}px`);
      });
    };
    // výchozí světlo nahoře uprostřed sekce
    const rest = () => { const r = sec.getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + 80 }; };

    const ctx = gsap.context(() => {
      gsap.from(glows, { opacity: 0, scale: 0.6, duration: 1.6, ease: "power2.out", stagger: 0.15, scrollTrigger: { trigger: grid, start: "top 75%" } });
      const r0 = rest();
      shade(r0.x, r0.y);
      if (reduced) return;
      // podsvícení dýchá a plave
      glows.forEach((g, i) => {
        const inner = g.firstElementChild as HTMLElement;
        gsap.to(inner, { scale: gsap.utils.random(1.08, 1.18), opacity: gsap.utils.random(0.75, 1), xPercent: gsap.utils.random(-6, 6), yPercent: gsap.utils.random(-6, 6), duration: gsap.utils.random(3.5, 5.5), ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.5 });
      });
      // studiový paprsek se pomalu natáčí
      gsap.fromTo(sec, { "--beam": "-8deg" }, { "--beam": "6deg", duration: 9, ease: "sine.inOut", yoyo: true, repeat: -1 });

      const spotX = gsap.quickTo(spot, "x", { duration: 0.9, ease: "power3" });
      const spotY = gsap.quickTo(spot, "y", { duration: 0.9, ease: "power3" });
      const tos = glows.map((g) => ({ x: gsap.quickTo(g, "x", { duration: 1.6, ease: "power3" }), y: gsap.quickTo(g, "y", { duration: 1.6, ease: "power3" }) }));
      const toSpot = (cx: number, cy: number) => {
        const r = sec.getBoundingClientRect();
        spotX(cx - r.left);
        spotY(cy - r.top);
      };
      toSpot(r0.x, r0.y);
      gsap.set(spot, { opacity: 0 });
      const move = (e: PointerEvent) => {
        toSpot(e.clientX, e.clientY);
        gsap.to(spot, { opacity: 1, duration: 0.5, overwrite: "auto" });
        shade(e.clientX, e.clientY);
        glows.forEach((g, i) => {
          const r = g.getBoundingClientRect();
          const cx = r.left + r.width / 2 - (Number(gsap.getProperty(g, "x")) || 0);
          const cy = r.top + r.height / 2 - (Number(gsap.getProperty(g, "y")) || 0);
          tos[i].x((e.clientX - cx) * 0.08);
          tos[i].y((e.clientY - cy) * 0.08);
        });
      };
      const leave = () => {
        gsap.to(spot, { opacity: 0, duration: 0.8 });
        tos.forEach((t) => { t.x(0); t.y(0); });
        const r = rest();
        shade(r.x, r.y);
      };
      sec.addEventListener("pointermove", move);
      sec.addEventListener("pointerleave", leave);
      return () => { sec.removeEventListener("pointermove", move); sec.removeEventListener("pointerleave", leave); };
    });
    return () => { ro.disconnect(); ctx.revert(); };
  }, []);
  return (
    <div className="k6-glows" ref={ref} aria-hidden="true">
      {CARD.map((c) => (
        <div className="k6-glow" key={c}><span /></div>
      ))}
    </div>
  );
}

// Polaroid přilepený páskou; kliknutím se otočí na zadní stranu s poznámkou
function Polaroid() {
  const [flipped, setFlipped] = useState(false);
  return (
    <figure className={`st6 st6-photo${flipped ? " is-flipped" : ""}`} style={{ left: "24%", top: "18%" }}>
      <span className="st6-tape st6-tape-l" aria-hidden="true" />
      <span className="st6-tape st6-tape-r" aria-hidden="true" />
      <button type="button" className="st6-card" aria-pressed={flipped} aria-label={flipped ? "Otočit fotku zpátky" : "Otočit fotku, vzadu je vzkaz"} onClick={() => setFlipped((f) => !f)}>
        <span className="st6-face st6-front">
          <img src="/img/vojta-about.jpg" alt="Vojtěch Hübner" width={640} height={800} draggable={false} />
          <span className="st6-dev" aria-hidden="true" />
        </span>
        <span className="st6-face st6-back">
          <span className="st6-note">Ahoj! Nejradši věci řeším osobně, ideálně u kávy. Napiš mi a potkáme se.<br /><b>Vojta</b></span>
        </span>
      </button>
    </figure>
  );
}

// obrázky k událostem v Cestě (pořadí podle `path` v content.ts); bez fotky barevná kartička s ikonou
const PATH_PICS: { tilt: number; img?: string; alt?: string; icon?: typeof Code; bg?: string; fg?: string }[] = [
  { tilt: 7, icon: PaintBrushBroad, bg: "#ff6a2b", fg: "#fff" },
  { tilt: -6, icon: Wrench, bg: "#18c37e", fg: "#fff" },
  { tilt: 5, icon: Database, bg: "#ffd23f", fg: "#111" },
  { tilt: -8, img: "/img/cvut-fel.jpg", alt: "Budova Fakulty elektrotechnické ČVUT" },
  { tilt: 6, icon: RocketLaunch, bg: "#111", fg: "#ffd23f" },
];

// klíčová slova v textu O mně dostanou žlutý zvýrazňovač
const MARKS = ["správní lidé", "správným nápadem", "v praxi", "růst", "dávat smysl"];
function highlight(text: string) {
  const re = new RegExp(`(${MARKS.join("|")})`, "g");
  let n = 0;
  return text.split(re).map((part, i) =>
    MARKS.includes(part) ? <mark key={i} className="hl" style={{ transitionDelay: `${0.25 + n++ * 0.35}s` }}>{part}</mark> : part,
  );
}

// Karta se naklání za kurzorem a přes ni jede odlesk
function TiltCard({ color, children }: { color: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current!;
    if (reduced) return;
    const rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3" });
    const ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      ry((x - 0.5) * 16);
      rx(-(y - 0.5) * 12);
      el.style.setProperty("--gx", `${x * 100}%`);
      el.style.setProperty("--gy", `${y * 100}%`);
    };
    const leave = () => { rx(0); ry(0); };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); };
  }, []);
  return <article ref={ref} className="k6" style={{ background: color }}>{children}</article>;
}

// Zapoj kabel do zásuvky: konektor se táhne, kabel za ním kreslí křivku
const DAY_FULL: Record<string, string> = { Po: "Pondělí", Út: "Úterý", St: "Středa", Čt: "Čtvrtek", Pá: "Pátek" };

// Výběr dne a času; vedle se živě vyplňuje lístek na kávu, odeslání ho utrhne a otevře e-mail
function Coffee() {
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const ticket = useRef<HTMLDivElement>(null);
  const subject = day && time ? `Káva v Praze: ${DAY_FULL[day]}, ${time.toLowerCase()}` : "Káva v Praze";
  const body = `Ahoj Vojto,\n\nco takhle ${day ? DAY_FULL[day].toLowerCase() : "[den]"} ${time ? time.toLowerCase() : "[kdy]"}?\n\n`;
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const send = () => {
    const t = ticket.current!;
    const main = t.querySelector<HTMLElement>(".tk6-main")!;
    if (!day || !time) {
      // chybí výběr: lístek zavrtí hlavou a prázdná pole se rozsvítí
      setHint(true);
      gsap.fromTo(t, { x: 0 }, { x: 10, duration: 0.07, yoyo: true, repeat: 5, ease: "power1.inOut", onComplete: () => { gsap.set(t, { x: 0 }); } });
      window.setTimeout(() => setHint(false), 1600);
      return;
    }
    // bez e-mailu vede návrh na LinkedIn; okno se otevře hned při kliknutí, jinak by ho prohlížeč zablokoval
    const go = CONTACT_EMAIL ? () => { window.location.href = mailto; } : () => {};
    if (!CONTACT_EMAIL) window.open(LINKEDIN_URL, "_blank", "noopener");
    if (reduced) { go(); return; }
    // utržení: hlavní část se odtrhne od ústřižku, odletí a pak se otevře e-mail
    gsap.timeline({ onComplete: () => { gsap.to(main, { x: 0, y: 0, rotation: 0, opacity: 1, duration: 0.6, ease: "back.out(1.6)", delay: 0.9 }); } })
      .to(main, { rotation: -4, x: -8, duration: 0.12, ease: "power2.out" })
      .to(main, { rotation: -14, x: -60, y: -140, opacity: 0, duration: 0.6, ease: "power3.in" })
      .call(go);
  };

  const field = (label: string, value: string | null, k: string) => (
    <div className={`tk6-field${!value && hint ? " is-missing" : ""}`}>
      <span className="tk6-label">{label}</span>
      <span className={`tk6-value${value ? "" : " is-empty"}`} key={value ?? k}>{value ?? "vyber"}</span>
    </div>
  );

  return (
    <div className="coffee6">
      <div className="coffee6-pick">
        <fieldset>
          <legend>Který den?</legend>
          <div className="chips6" style={{ "--n": contact.days.length } as React.CSSProperties}>{contact.days.map((d) => <button key={d} type="button" aria-pressed={day === d} className={day === d ? "is-on" : ""} onClick={() => setDay(day === d ? null : d)}>{d}</button>)}</div>
        </fieldset>
        <fieldset>
          <legend>Kdy?</legend>
          <div className="chips6" style={{ "--n": contact.times.length } as React.CSSProperties}>{contact.times.map((t) => <button key={t} type="button" aria-pressed={time === t} className={time === t ? "is-on" : ""} onClick={() => setTime(time === t ? null : t)}>{t}</button>)}</div>
        </fieldset>
        <button type="button" className="btn6 btn6-big" onClick={send}>{contact.send}</button>
      </div>
      <div className="tk6" ref={ticket} aria-live="polite">
        <div className="tk6-main">
          <span className="tk6-kicker">Lístek na kávu</span>
          <strong className="tk6-title">Káva s Vojtou</strong>
          <div className="tk6-fields">
            {field("Den", day ? DAY_FULL[day] : null, "d")}
            {field("Kdy", time, "t")}
            {field("Kde", "Praha", "p")}
          </div>
        </div>
        <div className="tk6-stub" aria-hidden="true">
          <span className="tk6-code" />
          <span className="tk6-stub-txt">jen pro 2</span>
        </div>
      </div>
    </div>
  );
}
