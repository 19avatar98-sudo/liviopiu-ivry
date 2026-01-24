import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { PRIZES } from "../../lib/prizes";
import { buildSegments, pickSegment } from "../../lib/segments";
import { getPrizeCode } from "../../lib/prizeCodes";

export const runtime = "nodejs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "spins.json");

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}), "utf8");
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_FILE, "utf8");
  return raw ? JSON.parse(raw) : {};
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function parseCookie(header) {
  const out = {};
  if (!header) return out;

  header.split(";").forEach((part) => {
    const [k, ...rest] = part.trim().split("=");
    if (!k) return;
    out[k] = decodeURIComponent(rest.join("=") || "");
  });

  return out;
}

export async function POST(request) {
  try {
    // ✅ ler cookie de forma compatível
    const cookieHeader = request.headers.get("cookie") || "";
    const jar = parseCookie(cookieHeader);

    const existingId = jar["rdc_device"];
    const deviceId = existingId || randomUUID();

    const day = todayKey();
    const db = readDb();

    const existing = db?.[day]?.[deviceId];

    // ✅ já jogou hoje
    if (existing) {
      const res = NextResponse.json(
        { ok: false, message: "Vous avez déjà participé.", existing },
        { status: 200 }
      );

      // se não tinha cookie ainda, define agora
      if (!existingId) {
        res.cookies.set("rdc_device", deviceId, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
        });
      }

      return res;
    }

    // ✅ sorteio
    const segments = buildSegments(PRIZES);
    const seg = pickSegment(segments);

    const prize = { id: seg.id, label: seg.label };
    const redeemCode = getPrizeCode(seg.id);

    const record = {
      prizeLabel: prize.label,
      redeemCode,
      at: new Date().toISOString(),
    };

    db[day] = db[day] || {};
    db[day][deviceId] = record;
    writeDb(db);

    const res = NextResponse.json({ ok: true, prize, redeemCode }, { status: 200 });

    // ✅ define cookie na 1ª vez
    if (!existingId) {
      res.cookies.set("rdc_device", deviceId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return res;
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e?.message || "Erreur serveur." },
      { status: 500 }
    );
  }
}
