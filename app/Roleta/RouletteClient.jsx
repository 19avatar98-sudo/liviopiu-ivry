"use client";

import { useMemo, useState } from "react";
import { PRIZES } from "../lib/prizes";
import { buildSegments } from "../lib/segments";
import { GOOGLE_REVIEW_LINK, INSTAGRAM_LINK } from "../lib/config";

export default function RouletteClient() {
  const [rotation, setRotation] = useState(0);

  const [result, setResult] = useState(null);
  const [redeemCode, setRedeemCode] = useState(null);

  // loading = pedido ao servidor (fetch)
  const [loading, setLoading] = useState(false);

  // spinning = animação da roda (6s), independente do fetch
  const [spinning, setSpinning] = useState(false);

  // resultado “pendente” (mostra só no fim da animação)
  const [pendingResult, setPendingResult] = useState(null);
  const [pendingCode, setPendingCode] = useState(null);

  const [error, setError] = useState(null);

  // ✅ guardar o print do cliente
  const [screenshot, setScreenshot] = useState(null);

  const segments = useMemo(() => buildSegments(PRIZES), []);

  async function spin() {
    if (loading || spinning) return;

    if (!screenshot) {
      setError("Veuillez d’abord télécharger la capture d’écran.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ✅ enviar o ficheiro para a API
      const fd = new FormData();
      fd.append("screenshot", screenshot);

      const resp = await fetch("/api/spin", { method: "POST", body: fd });

      // ✅ evitar crash JSON (Unexpected end of JSON)
      const text = await resp.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(`Erreur serveur (${resp.status}).`);
      }

      // já jogou hoje → não roda, mostra o mesmo resultado
      if (!resp.ok || !data?.ok) {
        if (data?.existing) {
          setResult({ label: data.existing.prizeLabel });
          setRedeemCode(data.existing.redeemCode);
          setError(data?.message || "Vous avez déjà participé aujourd’hui.");
          return;
        }
        throw new Error(data?.message || "Erreur serveur.");
      }

      const prizeId = data.prize.id;
      const label = data.prize.label;

      const seg = segments.find((s) => s.id === prizeId);
      if (!seg) throw new Error("Segment introuvable.");

      const midPct = (seg.startPct + seg.endPct) / 2;
      const midDeg = midPct * 3.6;

      // ✅ roda várias voltas e termina no centro do segmento
      const target = 360 * 8 - midDeg;

      // limpa o que está a mostrar agora
      setResult(null);
      setRedeemCode(null);

      // guarda o prémio para mostrar quando a animação terminar
      setPendingResult({ label });
      setPendingCode(data.redeemCode);

      // inicia animação (independente do loading)
      setSpinning(true);
      setRotation((prev) => prev + target);
    } catch (e) {
      setError(e?.message || "Erreur.");
      setResult(null);
      setRedeemCode(null);
      setPendingResult(null);
      setPendingCode(null);
      setSpinning(false);
    } finally {
      setLoading(false);
    }
  }

  const canSpin = !!screenshot && !loading && !spinning;

  return (
    <div className="container">
      {/* HERO */}
      <div
        style={{
          background:
            "radial-gradient(900px 420px at 18% 22%, rgba(120,255,210,.18), rgba(0,0,0,0) 60%), radial-gradient(700px 380px at 85% 40%, rgba(120,255,210,.10), rgba(0,0,0,0) 55%), linear-gradient(180deg, rgba(7,26,22,.92), rgba(7,26,22,.78))",
          borderRadius: 28,
          padding: 18,
          boxShadow: "0 14px 45px rgba(0,0,0,.28)",
        }}
      >
        {/* Card frontal mais claro (controla no CSS .frontPanel) */}
        <div className="frontPanel">
          <div className="row">
            {/* ESQUERDA */}
            <div className="col">
              <img
  src="/livio-piu-logo.png"
  alt="Livio Più"
  style={{
    maxWidth: "100%",
    height: 84,
    display: "block",
    margin: "0 auto",
  }}
/>

              <p style={{ marginTop: 12, lineHeight: 1.55 }}>
                1) Laissez votre avis sur Google ou suivez-nous sur Instagram
                <br />
                2) Envoyez la capture d’écran
                <br />
                3) Tournez la roue et recevez un code
              </p>

              <div className="row" style={{ gap: 12 }}>
                <a
                  className="btn"
                  href={GOOGLE_REVIEW_LINK}
                  target="_blank"
                  rel="noreferrer"
                >
                  Donner un avis sur Google
                </a>

                <a
                  className="btn"
                  href={INSTAGRAM_LINK}
                  target="_blank"
                  rel="noreferrer"
                >
                  Suivez-nous sur Instagram
                </a>
              </div>

              <div className="hr" />

              <label className="small">Télécharger la capture d’écran</label>

              <input
                className="input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setScreenshot(e.target.files?.[0] || null);
                  setError(null);
                }}
              />

              {!screenshot ? (
                <div className="small" style={{ marginTop: 8 }}>
                  Veuillez sélectionner une image pour activer « TOURNER ».
                </div>
              ) : null}
            </div>

            {/* DIREITA */}
            <div className="col">
              <div className="wheelStage">
                <div className="pointer" />

                <div
                  style={{
                    width: 320,
                    height: 320,
                    borderRadius: "50%",
                    overflow: "hidden",
                    margin: "0 auto",
                    transform: `rotate(${rotation}deg) translateZ(0)`,
                    transition: spinning
                      ? "transform 6s cubic-bezier(0.05,0.9,0.15,1)"
                      : "transform 0s",
                    position: "relative",
                    willChange: "transform",
                    backfaceVisibility: "hidden",
                    transformOrigin: "50% 50%",
                  }}
                  onTransitionEnd={() => {
                    if (!spinning) return;

                    // termina a animação
                    setSpinning(false);

                    // mostra o resultado no fim (sem timeout)
                    if (pendingResult) setResult(pendingResult);
                    if (pendingCode) setRedeemCode(pendingCode);

                    setPendingResult(null);
                    setPendingCode(null);
                  }}
                >
                  <img
                    src="/roue-pizza.png"
                    alt="Roue"
                    style={{ width: "100%", height: "100%" }}
                    draggable="false"
                  />

                  {/* ✅ BOTÃO: zero branco, só letras pretas */}
                  <button
                    type="button"
                    onClick={spin}
                    disabled={!canSpin}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      margin: 0,
                      fontSize: 28,
                      fontWeight: 900,
                      letterSpacing: 2,
                      color: "#000",
                      cursor: canSpin ? "pointer" : "not-allowed",
                      zIndex: 10,
                      opacity: canSpin ? 1 : 0.35,
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!canSpin) return;
                      e.currentTarget.style.transform =
                        "translate(-50%, -50%) scale(1.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform =
                        "translate(-50%, -50%)";
                    }}
                  >
                    {loading || spinning ? "…" : "TOURNER"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="alert" style={{ marginTop: 14 }}>
                  ⚠️ {error}
                </div>
              )}

              {result && (
                <div className="alert ok" style={{ marginTop: 18 }}>
                  <strong>🎉 Félicitations !</strong>
                  <p>
                    Vous avez gagné : <strong>{result.label}</strong>
                  </p>

                  <div className="code">CODE : {redeemCode}</div>

                  <p className="small">
                    Indiquez le code dans « Indications pour le restaurant » sur
                    Deliveroo lor's de votre prochaine commande!
                  </p>

                  <img
  src="/deliveroo.png"
  alt="Deliveroo"
  style={{
    maxWidth: 180,
    width: "100%",
    margin: "12px auto 0",
    display: "block",
    borderRadius: 10,
  }}
/>

                  <p
  className="small"
  style={{
    marginTop: 10,
    opacity: 0.85,
    lineHeight: 1.5,
    textAlign: "center",
  }}
>
  ⚠️ Une seule récompense peut être réclamée par commande.
</p>

                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
