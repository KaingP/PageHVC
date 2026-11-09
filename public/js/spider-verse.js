/**
 * ==============================================================================
 * js/spider-verse.js - Authentic Spider-Verse Comic Glitch Engine & Scroll Transitions
 * ==============================================================================
 * 1. 1:1 Implementation of the Spider-Man: Into the Spider-Verse <VerseText /> Engine:
 *    - Mulberry32 seeded PRNG & Murmur3 finalizer.
 *    - Exact 24 FPS animation clock (frames on ones, holds on twos).
 *    - Convex polygon glass shatter (edge cuts, centroid push, rotation & motion streaks).
 *    - 3-color offset CMYK / RGB plates (Cyan, Magenta, Yellow) misregistration.
 *    - Interlace comb scanline tears with slip transforms & body strip tinting.
 *    - Red halftone dot grids, gold specks, and torn ink slivers along slips.
 *    - Word-by-word arrival with punctuation breath pauses & paragraph sheet tears.
 *    - Idle bursts (flicks, medium, stuck glitches with nudge jitter).
 *    - Interactive hover & auto-replay.
 *
 * 2. Cinematic Scroll Pin & Zoom Transitions (GSAP ScrollTrigger):
 *    - "Unfold LinEup" (#talent-title):
 *      When scrolled to, displays the title FIRST in LARGE hero size in center screen,
 *      printing & glitching, then smoothly transitions up to reveal the artist line up grid below.
 *    - "Unfold MaP" (#mapstagesection):
 *      When scrolled to, displays the title FIRST in LARGE hero size in center screen,
 *      printing & glitching, then smoothly transitions up to reveal the stage map image below.
 */

(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // 1. Math & Seeded Random Engine
    // -------------------------------------------------------------------------

    /** mulberry32: a small seeded PRNG, uniform in [0, 1). */
    function rng(seed) {
        let state = seed >>> 0;
        return function () {
            state = (state + 0x6d2b79f5) >>> 0;
            let t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /** Two numbers mixed into one 32-bit seed (murmur3's finalizer). */
    function mixSeed(a, b) {
        let h = (Math.imul(a >>> 0, 0x9e3779b1) ^ (b >>> 0)) >>> 0;
        h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
        h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
        return (h ^ (h >>> 16)) >>> 0;
    }

    /** One tick: a frame on ones, 24 a second. A hold on twos lasts two. */
    const FRAME_MS = 1000 / 24;

    /** The flat glitch colours, named as in verse-text.css. */
    const FLAT = ['violet', 'magenta', 'green', 'gold'];

    /** Which flat colours carry dark ink; the rest carry white. */
    const FLAT_LIGHT = [false, false, true, true];

    const PLATES = ['c', 'm', 'y'];

    const PAD_X = 15;
    const PAD_Y = 30;

    const COMB_TOP = -0.15;
    const COMB_BOTTOM = 1.35;
    const COMB_BODY = [0.42, 0.95];
    const COMB_REACH_Y = 0.75;

    const MOST_PER_FRAME = 4;
    const FIRST_BURST = Math.round(600 / FRAME_MS);
    const BURST_GAP = [Math.round(1000 / FRAME_MS), Math.round(2500 / FRAME_MS)];

    const BURST_TICKS = {
        flick: [1, 3],
        medium: [4, 6],
        stuck: [8, 14],
    };

    function draws(seed) {
        const random = rng(seed);
        const between = (lo, hi) => lo + (hi - lo) * random();
        return {
            random,
            between,
            int: (lo, hi) => lo + Math.floor(random() * (hi - lo + 1)),
            sign: () => (random() < 0.5 ? -1 : 1),
            chance: (p) => random() < p,
        };
    }

    function noiseSeed(seed) {
        return (seed % 999983) + 1;
    }

    const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
    const em = (value) => `${value.toFixed(3)}em`;

    // -------------------------------------------------------------------------
    // 2. Polygon & Shard Geometry Engine
    // -------------------------------------------------------------------------

    function polygonArea(points) {
        let sum = 0;
        for (let i = 0; i < points.length; i++) {
            const [x0, y0] = points[i] || [0, 0];
            const [x1, y1] = points[(i + 1) % points.length] || [0, 0];
            sum += x0 * y1 - x1 * y0;
        }
        return Math.abs(sum) / 2;
    }

    function centroid(points) {
        let x = 0;
        let y = 0;
        for (const [px, py] of points) {
            x += px;
            y += py;
        }
        return [x / points.length, y / points.length];
    }

    function tidy(points) {
        return points.filter((p, i) => {
            const q = points[(i + 1) % points.length];
            return !q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6;
        });
    }

    function splitPolygon(polygon, a, b) {
        const side = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
        const left = [];
        const right = [];
        for (let i = 0; i < polygon.length; i++) {
            const p = polygon[i];
            const q = polygon[(i + 1) % polygon.length];
            if (!p || !q) continue;
            const sp = side(p);
            const sq = side(q);
            if (sp >= 0) left.push(p);
            if (sp <= 0) right.push(p);
            if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) {
                const t = sp / (sp - sq);
                const cut = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
                left.push(cut);
                right.push(cut);
            }
        }
        return [tidy(left), tidy(right)];
    }

    function onEdge(edge, t) {
        if (edge === 0) return [t * 100, 0];
        if (edge === 1) return [100, t * 100];
        if (edge === 2) return [t * 100, 100];
        return [0, t * 100];
    }

    /**
     * 8-bit Pixel Tile Slicer: Chia từ thành các khối pixel vuông vức (mosaic blocks)
     * mô phỏng lỗi tràn bộ nhớ tilemap arcade/retro theo phong cách logo HVC GAME ON.
     */
    function shatter(seed) {
        const d = draws(seed);
        let pieces = [];
        const mode = d.int(0, 2);

        if (mode === 0) {
            // 3 dải pixel ngang so le (Horizontal scanline glitch blocks)
            const y1 = d.int(22, 38);
            const y2 = d.int(62, 78);
            pieces = [
                [[0, 0], [100, 0], [100, y1], [0, y1]],
                [[0, y1], [100, y1], [100, y2], [0, y2]],
                [[0, y2], [100, y2], [100, 100], [0, 100]],
            ];
        } else if (mode === 1) {
            // 4 khối pixel ô vuông (2x2 mosaic quadrant tiles)
            const xSplit = d.int(35, 65);
            const ySplit = d.int(35, 65);
            pieces = [
                [[0, 0], [xSplit, 0], [xSplit, ySplit], [0, ySplit]],
                [[xSplit, 0], [100, 0], [100, ySplit], [xSplit, ySplit]],
                [[0, ySplit], [xSplit, ySplit], [xSplit, 100], [0, 100]],
                [[xSplit, ySplit], [100, ySplit], [100, 100], [xSplit, 100]],
            ];
        } else {
            // Khối pixel bậc thang L-shape (stepped staircase pixel cut)
            const x1 = d.int(30, 70);
            const y1 = d.int(25, 45);
            const y2 = d.int(55, 75);
            pieces = [
                [[0, 0], [100, 0], [100, y1], [x1, y1], [x1, y2], [0, y2]],
                [[0, y2], [x1, y2], [x1, y1], [100, y1], [100, 100], [0, 100]],
                [[x1, y1], [100, y1], [100, y2], [x1, y2]],
            ];
        }

        return pieces.map((points, idx) => {
            const [cx, cy] = centroid(points);
            // Bước dịch pixel giật cục (quantized pixel steps)
            const stepSize = 0.06;
            const pushFactor = d.int(-3, 3);
            const pushX = (pushFactor === 0 ? d.sign() * 2 : pushFactor) * stepSize;
            const pushY = d.chance(0.4) ? d.int(-1, 1) * 0.04 : 0;

            return {
                points,
                // Viền pixel vuông vắn (blocky 8-bit rim)
                rim: points.map(([x, y]) => {
                    const pad = 3.5;
                    const rx = x <= cx ? Math.max(0, x - pad) : Math.min(100, x + pad);
                    const ry = y <= cy ? Math.max(0, y - pad) : Math.min(100, y + pad);
                    return [rx, ry];
                }),
                cx,
                cy,
                dx: pushX,
                dy: pushY,
                turn: 0, // Pixel glitch 8-bit luôn giữ thẳng hàng góc vuông (0 deg)
                color: (idx + d.int(0, FLAT.length - 1)) % FLAT.length,
                streak: d.chance(0.55) ? 90 : -1, // Kích hoạt checkerboard Bayer dither pattern
            };
        });
    }

    function toShardBox([x, y]) {
        return `${((x + PAD_X) / (100 + 2 * PAD_X)) * 100}% ${((y + PAD_Y) / (100 + 2 * PAD_Y)) * 100}%`;
    }

    function polygonCss(points) {
        return `polygon(${points.map(toShardBox).join(', ')})`;
    }

    // -------------------------------------------------------------------------
    // 3. CMYK Plates, Copies & Interlace Comb
    // -------------------------------------------------------------------------

    function platesAround(seed, reach) {
        const d = draws(seed);
        // Bước nhảy pixel vuông góc (orthogonal stepped pixel split)
        const step = 0.045; // Bước pixel dứt khoát
        const stepCountX = d.int(1, 3) * d.sign();
        const stepCountY = d.chance(0.45) ? d.int(1, 2) * d.sign() : 0;
        const sx = stepCountX * step;
        const sy = stepCountY * step;

        return {
            c: [sx, sy],
            m: [-sx, -sy],
            y: [d.chance(0.5) ? sx * 0.6 : -sx * 0.6, d.chance(0.5) ? -sy : sy],
        };
    }

    function copiesOf(d, count) {
        return Array.from({ length: count }, () => ({
            dx: d.sign() * d.between(0.1, 0.35),
            dy: (d.random() - 0.5) * 0.24,
            color: d.int(0, FLAT.length - 1),
        }));
    }

    function inBody(strip) {
        const middle = (strip.top + strip.bottom) / 2;
        return middle > COMB_BODY[0] && middle < COMB_BODY[1];
    }

    function combOf(seed) {
        const d = draws(seed);
        const slipStep = 0.055;
        const slips = Array.from({ length: 3 }, () => d.int(1, 3) * d.sign() * slipStep);
        const strips = [];
        const blockHeight = 0.08; // Scanline pixel dày dặn kiểu CRT / arcade
        for (let top = COMB_TOP; top < COMB_BOTTOM;) {
            const bottom = Math.min(COMB_BOTTOM, top + d.int(1, 2) * blockHeight);
            const slipped = strips.length % 2 === 1;
            strips.push({
                top,
                bottom,
                slip: slipped ? d.int(0, slips.length - 1) : -1,
                tint: null,
            });
            top = bottom;
        }
        const tintable = strips.filter((strip) => strip.slip >= 0 && inBody(strip));
        for (let k = d.int(1, 3); k > 0 && tintable.length > 0; k--) {
            const [strip] = tintable.splice(d.int(0, tintable.length - 1), 1);
            if (strip) strip.tint = d.chance(0.5) ? 'c' : 'm';
        }
        return { slips, strips };
    }

    function combLayers(comb) {
        const at = (y) => em(y + COMB_REACH_Y);
        const groups = new Map([['-1:', { slip: -1, tint: null }]]);
        for (const strip of comb.strips) {
            groups.set(`${strip.slip}:${strip.tint || ''}`, {
                slip: strip.slip,
                tint: strip.tint,
            });
        }
        return Array.from(groups.entries()).map(([key, group]) => {
            const home = group.slip < 0 && group.tint === null;
            const paint = (on) => (on ? '#000' : 'transparent');
            const stops = [`${paint(home)} 0 ${at(COMB_TOP)}`];
            for (const strip of comb.strips) {
                const member = strip.slip === group.slip && strip.tint === group.tint;
                stops.push(`${paint(member)} ${at(strip.top)} ${at(strip.bottom)}`);
            }
            const lastBottom = comb.strips.length > 0 ? comb.strips[comb.strips.length - 1].bottom : COMB_BOTTOM;
            stops.push(`${paint(home)} ${at(lastBottom)} 100%`);
            return {
                key,
                slip: comb.slips[group.slip] || 0,
                tint: group.tint,
                mask: `linear-gradient(to bottom, ${stops.join(', ')})`,
            };
        });
    }

    function materialise(seed, kind) {
        const d = draws(mixSeed(seed, 3));
        if (kind === 'shards') {
            return {
                key: false,
                plates: platesAround(mixSeed(seed, 5), d.between(0.16, 0.32)),
                shards: shatter(mixSeed(seed, 4)),
                copies: d.chance(0.6) ? copiesOf(d, 1) : [],
                comb: null,
                noise: noiseSeed(seed),
            };
        }
        return {
            key: false,
            plates: platesAround(mixSeed(seed, 5), d.between(0.2, 0.4)),
            shards: null,
            copies: copiesOf(d, d.int(1, 2)),
            comb: combOf(mixSeed(seed, 6)),
            noise: noiseSeed(seed),
        };
    }

    function wordFrames(seed) {
        const d = draws(seed);
        const first = d.chance(0.6) ? 'shards' : 'copies';
        const other = first === 'shards' ? 'copies' : 'shards';
        const kinds = d.chance(0.6) ? [first, other] : [first];
        // Animation "on twos" (2 ticks = ~83ms) to capture the authentic Spider-Verse stop-motion comic cadence
        const frames = kinds.map((kind, k) => ({
            ticks: 2,
            look: materialise(mixSeed(seed, k + 1), kind),
        }));
        const reach = d.between(0.18, 0.32);
        const shares = [1, 0.62, 0.32, 0.1];
        const lines = mixSeed(seed, 9);
        for (const share of shares) {
            frames.push({
                ticks: 2,
                look: {
                    key: true,
                    plates: platesAround(lines, reach * share),
                    shards: null,
                    copies: [],
                    comb: null,
                    noise: share > 0.3 ? noiseSeed(seed + Math.round(share * 100)) : 0,
                },
            });
        }
        return frames;
    }

    // -------------------------------------------------------------------------
    // 4. Print Schedule & Idle Bursts
    // -------------------------------------------------------------------------

    function pauseAfter(word) {
        if (/(\.\.\.|\u2026)["')\]]?$/.test(word)) return 19;
        if (/[.!?]["')\]]?$/.test(word)) return 10;
        if (/[,;:]$/.test(word)) return 5;
        return 0;
    }

    function wordGap(roll) {
        if (roll < 0.35) return 2;
        return roll < 0.75 ? 3 : 4;
    }

    function printSchedule(words, seed, startTick = 0) {
        const d = draws(mixSeed(seed, 1));
        let tick = startTick;
        let paired = false;
        const prints = words.map((word, i) => {
            const frames = wordFrames(mixSeed(seed, i + 2));
            const start = tick;
            const pause = pauseAfter(word);
            const pair = pause === 0 && !paired && d.chance(0.08);
            paired = pair;
            if (!pair) tick += wordGap(d.random()) + pause;
            return { start, frames };
        });
        const end = prints.reduce(
            (latest, word) =>
                Math.max(
                    latest,
                    word.start + word.frames.reduce((sum, frame) => sum + frame.ticks, 0)
                ),
            startTick
        );

        const tears = [];
        const attempts = d.int(2, 4);
        for (let k = 0; k < attempts; k++) {
            const at = d.int(startTick + 4, Math.max(startTick + 4, end - 4));
            if (tears.some((tear) => Math.abs(tear.tick - at) < 3)) continue;
            const top = d.between(0, 78);
            const bottom = Math.min(100, top + d.between(14, 34));
            const dx = d.sign() * d.between(0.2, 0.8);
            tears.push({ tick: at, top, bottom, dx });
            if (d.chance(0.35)) {
                tears.push({
                    tick: at + 1,
                    top,
                    bottom,
                    dx: -Math.sign(dx) * d.between(0.2, 0.8),
                });
            }
        }
        tears.sort((a, b) => a.tick - b.tick);
        return { words: prints, tears, end };
    }

    function burstKind(roll) {
        if (roll < 0.25) return 'stuck';
        return roll < 0.55 ? 'medium' : 'flick';
    }

    function burstHolds(d, kind) {
        const [lo, hi] = BURST_TICKS[kind];
        const holds = [];
        for (let left = d.int(lo, hi); left > 0;) {
            const hold = Math.min(left, kind === 'stuck' ? 2 : d.int(1, 3));
            holds.push(hold);
            left -= hold;
        }
        return holds;
    }

    function burstLook(seed, frame, last) {
        if (last) {
            return {
                key: true,
                plates: platesAround(seed, 0.05),
                shards: null,
                copies: [],
                comb: null,
                noise: 0,
            };
        }
        const d = draws(mixSeed(seed, frame + 11));
        const roll = d.random();
        if (roll < 0.4) return materialise(mixSeed(seed, frame + 21), 'shards');
        if (roll < 0.7) return materialise(mixSeed(seed, frame + 21), 'copies');
        return {
            key: true,
            plates: platesAround(mixSeed(seed, frame + 31), d.between(0.15, 0.3)),
            shards: null,
            copies: d.chance(0.5) ? copiesOf(d, 1) : [],
            comb: combOf(mixSeed(seed, frame + 51)),
            noise: noiseSeed(mixSeed(seed, frame + 41)),
        };
    }

    function nudge(look, seed) {
        const d = draws(seed);
        const by = () => d.between(0.88, 1.12);
        const move = ([x, y]) => [x * by(), y * by()];
        const plates = look.plates;
        return {
            ...look,
            plates: plates ? { c: move(plates.c), m: move(plates.m), y: move(plates.y) } : null,
            shards:
                look.shards?.map((shard) => ({
                    ...shard,
                    dx: shard.dx * by(),
                    dy: shard.dy * by(),
                    turn: clamp(shard.turn * by(), -13, 13),
                })) ?? null,
            copies: look.copies.map((copy) => ({
                ...copy,
                dx: copy.dx * by(),
                dy: copy.dy * by(),
            })),
            comb: look.comb
                ? {
                    ...look.comb,
                    slips: look.comb.slips.map(
                        (slip) => Math.sign(slip) * clamp(Math.abs(slip) * by(), 0.03, 0.15)
                    ),
                }
                : null,
        };
    }

    function burstFrom(seed, kind, wordCount, start, focus = null) {
        const d = draws(seed);
        const holds = burstHolds(d, kind);
        const band = focus === null && d.chance(0.35);
        const top = d.between(0, 72);
        const bottom = Math.min(100, top + d.between(18, 40));
        const first = focus ?? d.int(0, Math.max(0, wordCount - 1));
        const pair = (focus !== null || d.chance(0.4)) && first + 1 < wordCount;
        const hits = pair ? [first, first + 1] : [first];
        const stuck = kind === 'stuck';
        const slip = d.sign() * d.between(0.25, 0.7);
        const held = d.chance(0.5) ? d.between(0.15, 0.35) : 0;
        const frames = holds.map((ticks, f) => {
            if (band && stuck) {
                return {
                    ticks,
                    words: [],
                    tear: { top, bottom, dx: slip * d.between(0.9, 1.1) },
                    split: held ? held * d.between(0.9, 1.1) : 0,
                };
            }
            if (band) {
                return {
                    ticks,
                    words: [],
                    tear: { top, bottom, dx: (f % 2 ? -1 : 1) * d.between(0.2, 0.8) },
                    split: f % 2 ? d.between(0.15, 0.35) : 0,
                };
            }
            const settle = kind === 'medium' && holds.length > 1 && f === holds.length - 1;
            return {
                ticks,
                words: hits.map((index) => {
                    const look = burstLook(mixSeed(seed, index), stuck ? 0 : f, settle);
                    return {
                        index,
                        look: stuck && f > 0 ? nudge(look, mixSeed(seed, index * 97 + f)) : look,
                    };
                }),
                tear: null,
                split: 0,
            };
        });
        return { start, kind, frames };
    }

    function burstAt(seed, k, wordCount, previous) {
        const d = draws(mixSeed(seed, 77 + k));
        const gap = k === 0 ? FIRST_BURST : d.int(...BURST_GAP);
        return burstFrom(mixSeed(seed, 1000 + k), burstKind(d.random()), wordCount, previous + gap);
    }

    function burstEnd(burst) {
        return burst.start + burst.frames.reduce((sum, frame) => sum + frame.ticks, 0);
    }

    function stateOf(print, tick) {
        let age = tick - print.start;
        if (age < 0) return 'waiting';
        for (const frame of print.frames) {
            if (age < frame.ticks) return frame.look;
            age -= frame.ticks;
        }
        return 'printed';
    }

    function lookAt(schedule, bursts, tick) {
        const words = schedule.words.map((word) => stateOf(word, tick));
        const torn = schedule.tears.find((tear) => tear.tick === tick);
        let tear = torn ? { top: torn.top, bottom: torn.bottom, dx: torn.dx } : null;
        let splitBy = 0;
        for (const burst of bursts) {
            let age = tick - burst.start;
            if (age < 0) continue;
            for (const frame of burst.frames) {
                if (age < frame.ticks) {
                    for (const hit of frame.words) {
                        if (words[hit.index] === 'printed') words[hit.index] = hit.look;
                    }
                    if (frame.tear) tear = frame.tear;
                    splitBy = frame.split;
                    break;
                }
                age -= frame.ticks;
            }
        }
        return { words, tear, split: splitBy };
    }

    const timelines = new Map();

    function burstList(seed, wordCount, end, tick) {
        const key = `${seed}|${wordCount}|${end}`;
        let list = timelines.get(key);
        if (!list) {
            if (timelines.size > 64) timelines.clear();
            list = [];
            timelines.set(key, list);
        }
        for (let last = list[list.length - 1]; !last || last.start <= tick; last = list[list.length - 1]) {
            list.push(burstAt(seed, list.length, wordCount, last ? burstEnd(last) : end));
        }
        return list;
    }

    function startedBy(list, tick) {
        let lo = 0;
        let hi = list.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if ((list[mid]?.start ?? Number.POSITIVE_INFINITY) <= tick) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }

    function burstOn(seed, wordCount, end, tick) {
        const list = burstList(seed, wordCount, end, tick);
        return list[startedBy(list, tick) - 1] || null;
    }

    function idleBurst(schedule, seed, tick) {
        return burstOn(mixSeed(seed, 1), schedule.words.length, schedule.end, tick);
    }

    function moving(schedule, burst, tick) {
        return tick <= schedule.end || (burst !== null && tick <= burstEnd(burst));
    }

    // -------------------------------------------------------------------------
    // 5. Text Tokenizer & Debris Generator
    // -------------------------------------------------------------------------

    function tokenize(text) {
        const tokens = [];
        for (const match of text.matchAll(/(\S+)(\s*)/g)) {
            tokens.push({
                key: `${tokens.length}:${match[1] || ''}`,
                text: match[1] || '',
                index: tokens.length,
                space: match[2] || '',
            });
        }
        return tokens;
    }

    const INK = {
        violet: 'var(--vt-paint-violet)',
        magenta: 'var(--vt-paint-magenta)',
        green: 'var(--vt-paint-green)',
        gold: 'var(--vt-paint-gold)',
        key: 'var(--vt-paint-key)',
        dot: 'var(--vt-paint-dot)',
    };

    const flatInk = (index) => INK[FLAT[index] || 'violet'];

    function debris(seed, comb, ink) {
        const random = rng(seed);
        const between = (lo, hi) => lo + (hi - lo) * random();
        const bits = [];
        const cx = between(-10, 110);
        const cy = between(-70, 170);
        const pitch = 0.12;

        const SPARKLE_COLORS = [INK.violet, INK.magenta, INK.green, INK.gold, INK.dot];

        // 1. Lưới pixel dither vuông vức (Square 8-bit pixel matrix dither)
        for (let row = -2; row <= 2; row++) {
            for (let column = -3; column <= 3; column++) {
                if (random() < 0.42 || Math.hypot(column, row * 1.4) > 3.2) continue;
                // Căn chỉnh trên lưới tọa độ pixel thẳng hàng (không dùng staggered offset)
                const ox = column * pitch;
                const oy = row * pitch;
                const size = em(0.08); // Kích thước pixel đồng nhất
                bits.push({
                    key: `px${row}:${column}`,
                    kind: 'pixel',
                    left: `calc(${cx}% + ${ox}em)`,
                    top: `calc(${cy}% + ${oy}em)`,
                    width: size,
                    height: size,
                    color: INK.dot,
                });
            }
        }

        // 2. Các tia lấp lánh Pixel Cross (+) và Pixel Star giống hệt logo HVC GAME ON
        for (let k = 0, n = 3 + Math.floor(random() * 4); k < n; k++) {
            const isCross = random() < 0.65;
            const size = isCross ? em(0.12) : em(0.06);
            bits.push({
                key: `sp${k}`,
                kind: isCross ? 'cross' : 'pixel',
                left: `${between(-20, 120)}%`,
                top: `${between(-60, 160)}%`,
                width: size,
                height: size,
                color: SPARKLE_COLORS[k % SPARKLE_COLORS.length],
            });
        }

        // 3. Các mẩu thanh ngang pixel (Horizontal pixel slivers)
        if (comb) {
            const torn = comb.strips.filter(
                (strip) => strip.slip >= 0 && strip.tint === null && inBody(strip)
            );
            for (let k = 0, n = 1 + Math.floor(random() * 2); k < n; k++) {
                const idx = Math.floor(random() * torn.length);
                const strip = torn.splice(idx, 1)[0];
                if (!strip) break;
                const slip = comb.slips[strip.slip] || 0;
                const width = between(0.1, 0.3);
                const away = between(0.04, 0.22);
                bits.push({
                    key: `t${k}`,
                    kind: 'ink',
                    left: slip > 0 ? `calc(100% + ${em(slip + away)})` : em(slip - away - width),
                    top: em(strip.top),
                    width: em(width),
                    height: em(strip.bottom - strip.top),
                    color: ink,
                });
            }
        }
        return bits;
    }

    function inkOf(look) {
        const copy = look.copies && look.copies[0];
        if (look.key || !copy) return INK.key;
        return flatInk(copy.color);
    }

    function bandClip(band) {
        return `inset(${band.top}% -12% ${100 - band.bottom}% -12%)`;
    }

    function bandHole(band) {
        return `linear-gradient(to bottom, black 0 ${band.top}%, transparent ${band.top}% ${band.bottom}%, black ${band.bottom}% 100%)`;
    }

    // -------------------------------------------------------------------------
    // 6. VerseText DOM Element Builder & Runtime Controller
    // -------------------------------------------------------------------------

    function createVerseTextElement(text, options = {}) {
        const {
            seed = 1610,
            autoplay = true,
            idle = false,
            speed = 1,
            tone = 'dark',
            className = '',
        } = options;

        const tokens = tokenize(text);
        const words = tokens.map((t) => t.text);
        const schedule = printSchedule(words, mixSeed(seed, 1), 1);

        const root = document.createElement('div');
        root.className = className ? `vt-root ${className}` : 'vt-root';
        root.setAttribute('data-phase', autoplay ? 'waiting' : 'live');
        root.setAttribute('data-tone', tone);

        const sheet = document.createElement('div');
        sheet.className = 'vt-sheet';

        const mainProse = document.createElement('p');
        mainProse.className = 'vt-prose';

        // Tạo sẵn các node từ và khoảng trắng
        const wordNodes = [];
        tokens.forEach((token) => {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'vt-word';
            wordSpan.setAttribute('data-state', 'waiting');

            const textSpan = document.createElement('span');
            textSpan.className = 'vt-word-inner';
            textSpan.textContent = token.text;
            wordSpan.appendChild(textSpan);

            const glitchSpan = document.createElement('span');
            glitchSpan.className = 'vt-glitch';
            glitchSpan.setAttribute('aria-hidden', 'true');
            wordSpan.appendChild(glitchSpan);

            wordNodes.push({
                token,
                element: wordSpan,
                glitchElement: glitchSpan,
                currentState: 'waiting',
            });

            mainProse.appendChild(wordSpan);
            if (token.space) {
                mainProse.appendChild(document.createTextNode(token.space));
            }
        });

        sheet.appendChild(mainProse);

        // Bản sao dải rách (Torn band copies)
        const keyTear = document.createElement('p');
        keyTear.className = 'vt-prose';
        keyTear.setAttribute('data-copy', 'key');
        keyTear.setAttribute('aria-hidden', 'true');
        keyTear.style.display = 'none';
        keyTear.innerHTML = mainProse.innerHTML;
        sheet.appendChild(keyTear);

        const plateTears = PLATES.map((plate) => {
            const p = document.createElement('p');
            p.className = 'vt-prose';
            p.setAttribute('data-copy', 'plate');
            p.setAttribute('data-plate', plate);
            p.setAttribute('aria-hidden', 'true');
            p.style.display = 'none';
            p.innerHTML = mainProse.innerHTML;
            sheet.appendChild(p);
            return p;
        });

        root.appendChild(sheet);

        // ---------------------------------------------------------------------
        // Render một Frame lên DOM
        // ---------------------------------------------------------------------
        function renderLook(lookState) {
            if (!lookState) {
                // Toàn bộ đã in xong ổn định
                root.removeAttribute('data-glitching');
                wordNodes.forEach((node) => {
                    node.element.removeAttribute('data-state');
                    node.element.removeAttribute('data-key');
                    node.glitchElement.innerHTML = '';
                });
                mainProse.style.maskImage = '';
                mainProse.style.webkitMaskImage = '';
                keyTear.style.display = 'none';
                plateTears.forEach((p) => (p.style.display = 'none'));
                return;
            }

            root.setAttribute('data-glitching', 'true');
            const { words: wordStates, tear, split: splitBy } = lookState;

            wordNodes.forEach((node, idx) => {
                const state = wordStates[idx];
                if (state === undefined || state === 'printed') {
                    if (node.currentState !== 'printed') {
                        node.element.removeAttribute('data-state');
                        node.element.removeAttribute('data-key');
                        node.glitchElement.innerHTML = '';
                        node.currentState = 'printed';
                    }
                    return;
                }

                if (state === 'waiting') {
                    if (node.currentState !== 'waiting') {
                        node.element.setAttribute('data-state', 'waiting');
                        node.element.removeAttribute('data-key');
                        node.glitchElement.innerHTML = '';
                        node.currentState = 'waiting';
                    }
                    return;
                }

                // Trạng thái Look (đang glitch / materialise)
                node.currentState = 'glitch';
                node.element.removeAttribute('data-state');
                const comb = state.comb;
                node.element.setAttribute('data-key', state.key && comb === null ? 'true' : 'false');

                let html = '';
                const wordText = node.token.text;

                // 1. Comb Layers hoặc Inks
                if (comb) {
                    const layers = combLayers(comb);
                    layers.forEach((layer) => {
                        const mask = layer.mask;
                        const slipStyle = layer.slip ? `transform: translateX(${em(layer.slip)});` : '';
                        html += `<span class="vt-comb" style="mask-image: ${mask}; -webkit-mask-image: ${mask}; ${slipStyle}">`;
                        html += `<span class="vt-comb-body">`;
                        if (layer.tint) {
                            html += `<span class="vt-comb-ink" data-tint="${layer.tint}">${wordText}</span>`;
                        } else {
                            if (state.key) html += `<span class="vt-key-ink">${wordText}</span>`;
                            state.copies.forEach((copy) => {
                                html += `<span class="vt-copy" style="color: ${flatInk(copy.color)}; transform: translate(${copy.dx}em, ${copy.dy}em);">${wordText}</span>`;
                            });
                            if (state.plates) {
                                PLATES.forEach((pl) => {
                                    html += `<span class="vt-plate" data-plate="${pl}" style="transform: translate(${state.plates[pl][0]}em, ${state.plates[pl][1]}em);">${wordText}</span>`;
                                });
                            }
                        }
                        html += `</span></span>`;
                    });
                } else {
                    if (state.key) html += `<span class="vt-key-ink">${wordText}</span>`;
                    state.copies.forEach((copy) => {
                        html += `<span class="vt-copy" style="color: ${flatInk(copy.color)}; transform: translate(${copy.dx}em, ${copy.dy}em);">${wordText}</span>`;
                    });
                    if (state.plates) {
                        PLATES.forEach((pl) => {
                            html += `<span class="vt-plate" data-plate="${pl}" style="transform: translate(${state.plates[pl][0]}em, ${state.plates[pl][1]}em);">${wordText}</span>`;
                        });
                    }
                }

                // 2. Shattered Polygon Shards
                if (state.shards) {
                    html += `<span class="vt-gap"></span>`;
                    state.shards.forEach((shard) => {
                        const move = `translate(${shard.dx}em, ${shard.dy}em) rotate(${shard.turn}deg)`;
                        const origin = toShardBox([shard.cx, shard.cy]);
                        const rimPoly = polygonCss(shard.rim);
                        const ptsPoly = polygonCss(shard.points);
                        html += `<span class="vt-rim" style="clip-path: ${rimPoly}; -webkit-clip-path: ${rimPoly}; transform: ${move}; transform-origin: ${origin};"></span>`;
                        html += `<span class="vt-shard" data-color="${FLAT[shard.color]}" data-ink="${FLAT_LIGHT[shard.color] ? 'dark' : 'light'}" data-streak="${shard.streak >= 0}" style="clip-path: ${ptsPoly}; -webkit-clip-path: ${ptsPoly}; transform: ${move}; transform-origin: ${origin}; --streak: ${shard.streak + 90}deg;"><span class="vt-shard-text">${wordText}</span></span>`;
                    });
                }

                // 3. Halftone Dots, Specks & Torn Ink Debris
                if (state.noise) {
                    const bits = debris(state.noise, comb, inkOf(state));
                    bits.forEach((bit) => {
                        html += `<span class="vt-bit" data-kind="${bit.kind}" style="left: ${bit.left}; top: ${bit.top}; width: ${bit.width}; height: ${bit.height}; background-color: ${bit.color};"></span>`;
                    });
                }

                node.glitchElement.innerHTML = html;
            });

            // Cắt dải rách cả dòng (Paragraph sheet tear)
            if (tear) {
                const hole = bandHole(tear);
                mainProse.style.maskImage = hole;
                mainProse.style.webkitMaskImage = hole;

                if (splitBy > 0) {
                    const plates = platesAround(mixSeed(Math.round(tear.top * 1000), 3), splitBy);
                    keyTear.style.display = 'none';
                    plateTears.forEach((p, idx) => {
                        const pl = PLATES[idx];
                        p.style.display = 'block';
                        p.style.clipPath = bandClip(tear);
                        p.style.webkitClipPath = bandClip(tear);
                        p.style.transform = `translate(${tear.dx * 0.4 + plates[pl][0]}em, ${plates[pl][1]}em)`;
                    });
                } else {
                    plateTears.forEach((p) => (p.style.display = 'none'));
                    keyTear.style.display = 'block';
                    keyTear.style.clipPath = bandClip(tear);
                    keyTear.style.webkitClipPath = bandClip(tear);
                    keyTear.style.transform = `translateX(${tear.dx}em)`;
                }
            } else {
                mainProse.style.maskImage = '';
                mainProse.style.webkitMaskImage = '';
                keyTear.style.display = 'none';
                plateTears.forEach((p) => (p.style.display = 'none'));
            }
        }

        // ---------------------------------------------------------------------
        // Runtime Loop (24 FPS Engine)
        // ---------------------------------------------------------------------
        let position = 0;
        let tick = null;
        let rafId = 0;
        let isRunning = false;
        let isVisible = false;
        let hasLoadedFirst = false;
        let isHovered = false;
        let hoverRaf = 0;

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        function startClock() {
            if (prefersReduced) {
                root.setAttribute('data-phase', 'live');
                renderLook(null);
                return;
            }

            if (isRunning) return;
            isRunning = true;
            root.setAttribute('data-phase', 'live');

            let lastTime = 0;
            let carry = 0;

            const step = (now) => {
                // Chỉ chạy khi phần tử đang thực sự hiển thị trên màn hình
                if (!isVisible) {
                    stopClock();
                    return;
                }

                if (lastTime > 0) {
                    carry += ((now - lastTime) * speed) / FRAME_MS;
                    const whole = Math.min(Math.floor(carry), MOST_PER_FRAME);
                    carry -= Math.floor(carry);

                    for (let k = 0; k < whole; k++) {
                        const next = position + 1;
                        const before = idle ? idleBurst(schedule, seed, position) : null;
                        const after = idle ? idleBurst(schedule, seed, next) : null;
                        position = next;

                        if (moving(schedule, before, next - 1) || moving(schedule, after, next)) {
                            tick = next;
                            const burst = idle ? idleBurst(schedule, seed, tick) : null;
                            const isBurstActive = burst !== null && tick >= burst.start && tick <= burstEnd(burst);
                            if (tick <= schedule.end || isBurstActive) {
                                const pageLook = lookAt(schedule, burst ? [burst] : [], tick);
                                renderLook(pageLook);
                            } else {
                                renderLook(null);
                            }
                        }
                    }

                    // Khi đã load xong toàn bộ hiệu ứng in ban đầu (load full hiệu ứng)
                    if (!idle && position > schedule.end) {
                        stopClock();
                        renderLook(null);
                        return;
                    }
                }
                lastTime = now;
                rafId = requestAnimationFrame(step);
            };

            rafId = requestAnimationFrame(step);
        }

        function stopClock() {
            isRunning = false;
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = 0;
            }
        }

        // Kích hoạt hiệu ứng glitch sống động tức thì khi di chuột vào (hover)
        function triggerHoverGlitch() {
            if (isHovered) return;
            isHovered = true;
            isVisible = true;

            const hoverSeed = mixSeed(seed, (Date.now() ^ (position << 4)) & 0xffffffff);
            const burst = burstFrom(hoverSeed, 'medium', words.length, position);
            // Glitch toàn bộ các từ trong tiêu đề đồng thời để tạo cảm giác đa vũ trụ cực mạnh
            burst.frames.forEach((frame, fIndex) => {
                frame.words = words.map((_, index) => ({
                    index,
                    look: burstLook(mixSeed(hoverSeed, index * 53 + fIndex), fIndex, fIndex === burst.frames.length - 1),
                }));
            });

            let hoverFrame = 0;
            const maxHoverFrames = 18; // ~0.75s glitch

            const doHoverStep = () => {
                hoverFrame++;
                const pageLook = lookAt(schedule, [burst], position + hoverFrame);
                renderLook(pageLook);

                if (hoverFrame < maxHoverFrames) {
                    hoverRaf = requestAnimationFrame(doHoverStep);
                } else {
                    isHovered = false;
                    if (!isRunning) renderLook(null);
                }
            };
            cancelAnimationFrame(hoverRaf);
            hoverRaf = requestAnimationFrame(doHoverStep);
        }

        root.addEventListener('mouseenter', () => {
            root.replay();
        });

        wordNodes.forEach((node) => {
            node.element.addEventListener('mouseenter', (e) => {
                e.stopPropagation();
                root.replay();
            });
        });

        // 1. Chỉ load hiệu ứng glitch khi màn hình đang hiển thị nội dung chứa nó
        // 2. Load hiệu ứng glitch khi nhìn thấy chữ lần đầu (load full hiệu ứng)
        if ('IntersectionObserver' in window && autoplay) {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            isVisible = true;
                            if (!hasLoadedFirst) {
                                // Lần đầu nhìn thấy: load FULL hiệu ứng từ đầu
                                hasLoadedFirst = true;
                                position = 0;
                                tick = 0;
                                startClock();
                            } else if (idle) {
                                startClock();
                            }
                        } else {
                            // Cuộn ra khỏi tầm nhìn: DỪNG HOÀN TOÀN, không chạy ngầm
                            isVisible = false;
                            stopClock();
                        }
                    });
                },
                { threshold: 0.15 }
            );
            observer.observe(root);
        } else if (!autoplay) {
            renderLook(null);
        }

        // Public API
        root.replay = function () {
            stopClock();
            position = 0;
            tick = 0;
            isVisible = true;
            renderLook(null);
            startClock();
        };

        return root;
    }

    // -------------------------------------------------------------------------
    // 7. Khởi tạo VerseText cho các thành phần trên trang
    // -------------------------------------------------------------------------
    let talentVerseInstance = null;
    let mapVerseInstance = null;

    function initVerseTextTitles() {
        // 1. Tiêu đề "GAMEON - LinEup" (#talent-title)
        const talentTitle = document.querySelector('#talent-title');
        if (talentTitle && !talentTitle._verseInitialized) {
            talentTitle._verseInitialized = true;
            let fullText = talentTitle.textContent.replace(/\s+/g, ' ').trim() || 'GAMEON - LinEup';
            fullText = fullText.replace(/Unfold/gi, 'GAMEON');
            if (!fullText.includes('-')) {
                fullText = fullText.replace(/GAMEON\s+LinEup/i, 'GAMEON - LinEup');
            }
            talentTitle.innerHTML = '';
            talentVerseInstance = createVerseTextElement(fullText, {
                seed: 1610,
                tone: 'dark',
                idle: true, // Glitch định kỳ sống động chuẩn Spider-Verse
                speed: 1,
            });
            talentTitle.appendChild(talentVerseInstance);
        }

        // 2. Tiêu đề "GAMEON - MaP" (#map-title hoặc #mapstagesection p)
        const mapTitle = document.querySelector('#map-title, #mapstagesection p');
        if (mapTitle && !mapTitle._verseInitialized) {
            mapTitle._verseInitialized = true;
            let fullText = mapTitle.textContent.replace(/\s+/g, ' ').trim() || 'GAMEON - MaP';
            fullText = fullText.replace(/Unfold/gi, 'GAMEON');
            if (!fullText.includes('-')) {
                fullText = fullText.replace(/GAMEON\s+MaP/i, 'GAMEON - MaP');
            }
            mapTitle.innerHTML = '';
            mapVerseInstance = createVerseTextElement(fullText, {
                seed: 2099, // Earth-2099 seed
                tone: 'dark',
                idle: true, // Glitch định kỳ sống động chuẩn Spider-Verse
                speed: 1,
            });
            mapTitle.appendChild(mapVerseInstance);
        }

        // 3. Tiêu đề "GAMEON - e-TicKet" (.ticket-title)
        const ticketTitle = document.querySelector('.ticket-title');
        if (ticketTitle && !ticketTitle._verseInitialized) {
            ticketTitle._verseInitialized = true;
            const img = ticketTitle.querySelector('img');
            const cloneImg = img ? img.cloneNode(true) : null;

            let text = '';
            ticketTitle.childNodes.forEach((node) => {
                if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
            });
            text = text.replace(/\s+/g, ' ').trim() || 'GAMEON - e-TicKet';
            text = text.replace(/Unfold/gi, 'GAMEON');
            if (!text.includes('-')) {
                text = text.replace(/GAMEON\s+e-TicKet/i, 'GAMEON - e-TicKet');
            }

            ticketTitle.innerHTML = '';
            // Tone 'light' và idle 'false': Chữ đen tuyền khi bình thường, glitch rực rỡ khi scroll và hover
            const ticketVerse = createVerseTextElement(text, {
                seed: 3042,
                tone: 'light',
                idle: false,
                speed: 1,
            });
            ticketTitle.appendChild(ticketVerse);
            if (cloneImg) {
                cloneImg.style.marginLeft = '12px';
                cloneImg.style.verticalAlign = 'middle';
                ticketTitle.appendChild(cloneImg);
            }
        }
    }

    // -------------------------------------------------------------------------
    // 8. Hiệu ứng Cuộn: GAMEON LinEup & GAMEON MaP (Pin, Hero Zoom & Downward Transition)
    // -------------------------------------------------------------------------
    function initCinematicScrollTransitions() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

        gsap.registerPlugin(ScrollTrigger);

        const isMobile = window.innerWidth <= 768;

        // --- A. LINE UP TRANSITION (#talent-section) ---
        // Yêu cầu: "phần này cho chữ vào chính giữa" -> Căn đúng tâm 50% viewport
        const talentSection = document.querySelector('#talent-section');
        const talentHeading = document.querySelector('.talent .heading-div');
        const talentSpeakerWrapper = document.querySelector('.talent .speaker-wrapper');

        if (talentSection && talentHeading && talentSpeakerWrapper) {
            const getTalentCenterY = () => {
                const prevTransform = talentHeading.style.transform;
                talentHeading.style.transform = 'none';
                const rect = talentHeading.getBoundingClientRect();
                const sectionRect = talentSection.getBoundingClientRect();
                talentHeading.style.transform = prevTransform;
                const targetY = (window.innerHeight / 2) - (rect.top - sectionRect.top + rect.height / 2);
                return targetY;
            };

            const initialTalentY = getTalentCenterY();

            gsap.set(talentHeading, {
                scale: isMobile ? 1.3 : 1.6,
                y: initialTalentY,
                opacity: 1,
            });

            gsap.set(talentSpeakerWrapper, {
                opacity: 0,
                y: isMobile ? 80 : 140,
                scale: 0.92,
            });

            const talentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: talentSection,
                    start: 'top top',
                    end: isMobile ? '+=900' : '+=1300',
                    pin: true,
                    scrub: 1.2,
                    anticipatePin: 1,
                    onEnter: () => {
                        if (talentVerseInstance?.replay) talentVerseInstance.replay();
                    },
                    onEnterBack: () => {
                        if (talentVerseInstance?.replay) talentVerseInstance.replay();
                    },
                    onRefresh: () => {
                        const newY = getTalentCenterY();
                        if (talentTl.progress() === 0) {
                            gsap.set(talentHeading, { y: newY });
                        }
                    },
                },
            });

            // Giai đoạn 1: Giữ chữ "GAMEON - LinEup" ở CHÍNH GIỮA màn hình
            talentTl.to({}, { duration: 0.4 })
                // Giai đoạn 2: Chuyển cảnh - chữ thu nhỏ và di chuyển từ chính giữa lên tiêu đề, dàn nghệ sĩ trượt lên
                .to(
                    talentHeading,
                    {
                        scale: 1,
                        y: 0,
                        duration: 1,
                        ease: 'power2.inOut',
                    },
                    'talentTransition'
                )
                .to(
                    talentSpeakerWrapper,
                    {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        duration: 1,
                        ease: 'power2.out',
                    },
                    'talentTransition'
                )
                // Giai đoạn 3: Giữ khung hình dàn nghệ sĩ ổn định trước khi mở khóa cuộn tiếp
                .to({}, { duration: 0.4 });
        }

        // --- B. GAMEON MAP TRANSITION (#mapstagesection) ---
        // Nền đen cũ, chữ căn ở chính giữa màn hình
        const mapSection = document.querySelector('#mapstagesection');
        const mapHeading = mapSection?.querySelector('.heading-div');
        const mapContentWrapper = mapSection?.querySelector('.map-content-wrapper');

        if (mapSection && mapHeading && mapContentWrapper) {
            const getMapCenterY = () => {
                const prevTransform = mapHeading.style.transform;
                mapHeading.style.transform = 'none';
                const rect = mapHeading.getBoundingClientRect();
                const sectionRect = mapSection.getBoundingClientRect();
                mapHeading.style.transform = prevTransform;
                const targetY = (window.innerHeight / 2) - (rect.top - sectionRect.top + rect.height / 2);
                return targetY;
            };

            const initialMapY = getMapCenterY();

            gsap.set(mapHeading, {
                scale: isMobile ? 1.3 : 1.6,
                y: initialMapY,
                opacity: 1,
            });

            gsap.set(mapContentWrapper, {
                opacity: 0,
                y: isMobile ? 80 : 140,
                scale: 0.92,
            });

            const mapTl = gsap.timeline({
                scrollTrigger: {
                    trigger: mapSection,
                    start: 'top top',
                    end: isMobile ? '+=900' : '+=1300',
                    pin: true,
                    scrub: 1.2,
                    anticipatePin: 1,
                    onEnter: () => {
                        if (mapVerseInstance?.replay) mapVerseInstance.replay();
                    },
                    onEnterBack: () => {
                        if (mapVerseInstance?.replay) mapVerseInstance.replay();
                    },
                    onRefresh: () => {
                        const newY = getMapCenterY();
                        if (mapTl.progress() === 0) {
                            gsap.set(mapHeading, { y: newY });
                        }
                    },
                },
            });

            // Giai đoạn 1: Giữ chữ "GAMEON - MaP" ở CHÍNH GIỮA màn hình
            mapTl.to({}, { duration: 0.4 })
                // Giai đoạn 2: Chuyển cảnh - chữ thu nhỏ về heading trên cùng, sơ đồ sân khấu trượt lên
                .to(
                    mapHeading,
                    {
                        scale: 1,
                        y: 0,
                        duration: 1,
                        ease: 'power2.inOut',
                    },
                    'mapTransition'
                )
                .to(
                    mapContentWrapper,
                    {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        duration: 1,
                        ease: 'power2.out',
                    },
                    'mapTransition'
                )
                // Giai đoạn 3: Giữ khung hình sơ đồ map ổn định trước khi mở khóa cuộn tiếp
                .to({}, { duration: 0.4 });
        }
    }

    // -------------------------------------------------------------------------
    // Khởi chạy khi DOM và thư viện đã sẵn sàng
    // -------------------------------------------------------------------------
    function ready(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    ready(() => {
        initVerseTextTitles();
        // Cho một khoảng trễ ngắn để GSAP và Lenis khởi tạo xong ScrollTrigger
        setTimeout(() => {
            initCinematicScrollTransitions();
        }, 150);
    });
})();
