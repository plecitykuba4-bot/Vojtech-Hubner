// Všechny texty webu na jednom místě. Fakta jsou z Vojtova LinkedInu (10/2026),
// formulace jsou návrh k jeho schválení.

// Vojtův e-mail zatím nemáme. Dokud je prázdný, web e-mail neukazuje a kontakt vede na LinkedIn.
export const CONTACT_EMAIL = "";
export const LINKEDIN_URL = "https://www.linkedin.com/in/vojtechhubner/";

export const hero = {
  name: "Vojtěch Hübner",
  title: "Propojuju lidi, projekty a nápady.",
  sub: "Vyvíjím interní software, starám se o sítě a stavím weby. Studuju ČVUT FEL a podnikám od střední.",
  cta: "Pojďme si promluvit",
  secondary: "Co dělám",
  netCaption: "Projekty nestojí na technologiích. Stojí na lidech, kteří se potkají.",
};

export type NodeDef = {
  id: string;
  label: string;
  pos: [number, number, number];
  group: number; // -1 = bez skupiny, jinak index disciplíny
  size?: number;
};

// Uzly sítě, do které se portrét rozpadne. Souřadnice jsou ve světě scény (výška okna ≈ 6,3).
export const nodes: NodeDef[] = [
  { id: "vojta", label: "Vojta", pos: [0.2, 0.1, 0.6], group: -1, size: 1.8 },
  { id: "lide", label: "Lidé", pos: [-2.3, 1.55, 0.2], group: -1, size: 1.2 },
  { id: "projekty", label: "Projekty", pos: [2.4, 1.75, -0.4], group: -1, size: 1.2 },
  { id: "napady", label: "Nápady", pos: [-0.6, -2.05, 0.9], group: -1, size: 1.2 },
  { id: "software", label: "Software", pos: [-4.3, 0.2, -1.2], group: 0 },
  { id: "databaze", label: "Databáze", pos: [-3.6, -1.75, -0.4], group: 0 },
  { id: "site", label: "Sítě", pos: [4.2, 0.0, -0.9], group: 1 },
  { id: "bezpecnost", label: "Bezpečnost", pos: [3.5, -1.9, 0.2], group: 1 },
  { id: "web", label: "Web", pos: [-1.2, 2.55, -1.6], group: 2 },
  { id: "brand", label: "Brand", pos: [0.9, 2.75, -2.0], group: 2 },
  { id: "cvut", label: "ČVUT FEL", pos: [2.0, -2.5, -1.4], group: -1 },
  { id: "praha", label: "Praha", pos: [-2.6, -0.2, 1.4], group: -1 },
];

export const edges: [string, string][] = [
  ["vojta", "lide"],
  ["vojta", "projekty"],
  ["vojta", "napady"],
  ["vojta", "praha"],
  ["lide", "praha"],
  ["lide", "web"],
  ["lide", "software"],
  ["projekty", "brand"],
  ["projekty", "site"],
  ["napady", "cvut"],
  ["napady", "databaze"],
  ["software", "databaze"],
  ["site", "bezpecnost"],
  ["web", "brand"],
  ["cvut", "bezpecnost"],
  ["praha", "software"],
  ["projekty", "web"],
  ["napady", "bezpecnost"],
];

export const disciplines = [
  {
    word: "Software",
    lead: "Interní nástroje, které firmě šetří čas.",
    body: "Ve SEPLYKO od roku 2022 vyvíjím interní software a spravuju databáze. Píšu věci, které lidé používají každý den, takže musí fungovat bez návodu.",
    tags: ["Interní systémy", "Databáze", "Automatizace"],
  },
  {
    word: "Sítě",
    lead: "Infrastruktura, o které nemusíte vědět.",
    body: "Navrhuju a spravuju síťovou topologii a hlídám bezpečnost. Dobrá síť je ta, na kterou si nikdo nestěžuje.",
    tags: ["Topologie", "Kybernetická bezpečnost", "Správa sítě"],
  },
  {
    word: "Web a brand",
    lead: "Jak firma vypadá, když ji někdo potká poprvé.",
    body: "Od roku 2020 jsem jako živnostník dělal weby a brand design pro firmy i jednotlivce. Z té doby mi zůstal cit pro to, že technika musí i dobře vypadat.",
    tags: ["Weby", "Brand design", "Front-end"],
  },
];

export const facts = [
  { value: 2020, suffix: "", label: "první vlastní zakázka jako živnostník" },
  { value: 4, suffix: "+", label: "roky vývoje a správy sítí ve SEPLYKO" },
  { value: 2091, suffix: "", label: "lidí sleduje, co dělám, na LinkedInu" },
  { value: 3, suffix: "", label: "obory, ve kterých se pohybuju: software, sítě, web" },
];

export const about = [
  "Jmenuju se Vojta a nejvíc mě baví chvíle, kdy se potkají správní lidé se správným nápadem.",
  "Studuju elektrotechniku na ČVUT, pracuju v IT a od střední podnikám v několika oborech. Teorii se učím ve škole a hned ji zkouším v praxi, protože jinak nedrží.",
  "Hledám projekty, kde můžu růst, učit se a přidat něco, co bude dávat smysl i za pět let.",
];

export const path = [
  { year: "2020", title: "Vlastní živnost", text: "Weby a brand design pro firmy i jednotlivce. První klienti, první faktury." },
  { year: "2022", title: "Technik IT, LENIA INDUS GROUP", text: "Stáž v Hostivaři. Technická podpora a komunikace s lidmi, kteří IT nerozumí a nemusí." },
  { year: "2022", title: "SEPLYKO, s.r.o.", text: "Vývoj interního softwaru, správa síťové topologie a databází. Hybridně z Prahy." },
  { year: "Teď", title: "ČVUT FEL", text: "Studium elektrotechniky vedle práce. Teorie ráno, praxe odpoledne." },
  { year: "Dál", title: "Otevřený novým příležitostem", text: "Praha, hybrid i remote. Hledám tým, kde se dá růst." },
];

export const contact = {
  title: "Pojďme si promluvit.",
  sub: "Osobní setkání nic nenahradí. Napište mi a domluvíme kávu někde v Praze.",
  days: ["Po", "Út", "St", "Čt", "Pá"],
  times: ["Dopoledne", "Odpoledne", "Večer"],
  send: "Navrhnout kávu",
};
