import { useState } from "react"
import type { MetaState } from "../game/gameTypes"
import { GENE_UPGRADES } from "../game/gameTypes"

interface MetaScreenProps {
  meta: MetaState
  onMeta: (updated: MetaState) => void
  onStartRun: () => void
}

export default function MetaScreen({
  meta,
  onMeta,
  onStartRun,
}: MetaScreenProps) {
  const [tab, setTab] = useState<"lab" | "upgrades">("lab")
  const [confirmDevolve, setConfirmDevolve] = useState<string | null>(null)

  const createGene = () => {
    if (meta.totalDNA < 1000) return
    onMeta({ ...meta, totalDNA: meta.totalDNA - 1000, genes: meta.genes + 1 })
  }

  const devolveGene = (id: string) => {
    const level = meta.upgrades[id] || 0
    if (level <= 0) return
    const upgrade = GENE_UPGRADES.find((u) => u.id === id)!
    onMeta({
      ...meta,
      genes: meta.genes + upgrade.costPerLevel,
      upgrades: { ...meta.upgrades, [id]: level - 1 },
    })
    setConfirmDevolve(null)
  }

  const buyUpgrade = (id: string) => {
    const upgrade = GENE_UPGRADES.find((u) => u.id === id)!
    const currentLevel = meta.upgrades[id] || 0
    if (currentLevel >= upgrade.maxLevel) return
    if (meta.genes < upgrade.costPerLevel) return
    onMeta({
      ...meta,
      genes: meta.genes - upgrade.costPerLevel,
      upgrades: { ...meta.upgrades, [id]: currentLevel + 1 },
    })
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#060a06",
        color: "#d0c8f0",
        fontFamily: "'Rajdhani', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "radial-gradient(circle at 50% 50%, rgba(80,30,120,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <div
        style={{
          width: "100%",
          padding: "20px 40px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(120,60,200,0.25)",
          paddingBottom: "16px",
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#c090ff",
              textShadow: "0 0 20px rgba(160,80,255,0.5)",
            }}
          >
            GENE LAB
          </h1>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 13,
              color: "#665588",
              fontFamily: "'Share Tech Mono', monospace",
              letterSpacing: "0.05em",
            }}
          >
            ONCOLOGICAL RESEARCH TERMINAL v2.1
          </p>
        </div>

        {/* Counters */}
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <StatBadge label="TOTAL DNA" value={meta.totalDNA} color="#60aaff" />
          <StatBadge label="GENES" value={meta.genes} color="#cc88ff" />
          <StatBadge label="RUNS" value={meta.totalRuns} color="#88cc88" />
          <StatBadge label="KILLS" value={meta.totalKills} color="#ffaa44" />
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "12px 40px",
          width: "100%",
          flexShrink: 0,
        }}
      >
        {(["lab", "upgrades"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? "rgba(120,60,200,0.35)" : "transparent",
              border: `1px solid ${
                tab === t ? "rgba(160,90,255,0.6)" : "rgba(80,50,120,0.3)"
              }`,
              color: tab === t ? "#c090ff" : "#665588",
              padding: "6px 22px",
              borderRadius: 5,
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.08em",
              cursor: "pointer",
              textTransform: "uppercase",
              transition: "all 0.2s",
            }}
          >
            {t === "lab" ? "Synthesis" : "Gene Upgrades"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          width: "100%",
          overflowY: "auto",
          padding: "0 40px 24px",
        }}
      >
        {tab === "lab" && (
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            {/* DNA → Gene converter */}
            <Panel title="🧬 GENE SYNTHESIS">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <p style={{ margin: "0 0 4px", color: "#888", fontSize: 13 }}>
                    Spend{" "}
                    <span
                      style={{
                        color: "#60aaff",
                        fontFamily: "'Share Tech Mono'",
                      }}
                    >
                      1,000 DNA
                    </span>{" "}
                    to synthesize one Gene.
                  </p>
                  <p style={{ margin: 0, color: "#888", fontSize: 12 }}>
                    Genes are permanent and can be used to evolve your cell.
                  </p>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <div
                    style={{
                      color: "#60aaff",
                      fontFamily: "'Share Tech Mono'",
                      marginBottom: 6,
                      fontSize: 14,
                    }}
                  >
                    Available DNA: {meta.totalDNA}
                  </div>
                  <ActionButton
                    label="SYNTHESIZE GENE  →  1,000 DNA"
                    disabled={meta.totalDNA < 1000}
                    onClick={createGene}
                    color="#9040ff"
                  />
                </div>
              </div>

              <div
                style={{
                  marginTop: 20,
                  padding: "12px 16px",
                  background: "rgba(80,40,130,0.15)",
                  borderRadius: 8,
                  border: "1px solid rgba(100,60,160,0.25)",
                }}
              >
                <div style={{ color: "#998ab8", fontSize: 13 }}>
                  Genes can be{" "}
                  <span style={{ color: "#ffaa44" }}>devolved</span> if you want
                  to spend them on something else (in the Gene Upgrades tab).
                  DNA earned during runs will be added to your total DNA after
                  the run ends.
                </div>
              </div>
            </Panel>

            {/* Stats */}
            <Panel title="📊 STATS">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                {[
                  { label: "Total Runs", value: meta.totalRuns },
                  { label: "Total Kills", value: meta.totalKills },
                  { label: "Total DNA", value: meta.totalDNA },
                  { label: "Genes Owned", value: meta.genes },
                  {
                    label: "Upgrades Purchased",
                    value: Object.values(meta.upgrades).reduce(
                      (a, b) => a + b,
                      0,
                    ),
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(80,50,120,0.2)",
                    }}
                  >
                    <span style={{ color: "#888", fontSize: 13 }}>
                      {row.label}
                    </span>
                    <span
                      style={{
                        color: "#c090ff",
                        fontFamily: "'Share Tech Mono'",
                        fontSize: 13,
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {tab === "upgrades" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 14,
              maxWidth: 1000,
              margin: "0 auto",
            }}
          >
            {GENE_UPGRADES.map((upgrade) => {
              const currentLevel = meta.upgrades[upgrade.id] || 0
              const isMaxed = currentLevel >= upgrade.maxLevel
              const canAfford = meta.genes >= upgrade.costPerLevel
              const isConfirmingDevolve = confirmDevolve === upgrade.id

              return (
                <div
                  key={upgrade.id}
                  style={{
                    background:
                      currentLevel > 0
                        ? "rgba(60,20,100,0.45)"
                        : "rgba(15,8,30,0.7)",
                    border: `1px solid ${
                      currentLevel > 0
                        ? "rgba(140,70,255,0.5)"
                        : "rgba(60,40,100,0.3)"
                    }`,
                    borderRadius: 10,
                    padding: "16px 18px",
                    transition: "border-color 0.2s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ fontSize: 28, lineHeight: 1 }}>
                      {upgrade.icon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: currentLevel > 0 ? "#c090ff" : "#8870b0",
                        }}
                      >
                        {upgrade.name}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "#665577", marginTop: 2 }}
                      >
                        {upgrade.description}
                      </div>
                    </div>
                  </div>

                  {/* Level dots */}
                  <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
                    {Array.from({ length: upgrade.maxLevel }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 20,
                          height: 6,
                          borderRadius: 3,
                          background:
                            i < currentLevel
                              ? "#9040ff"
                              : "rgba(80,50,120,0.35)",
                          border: `1px solid ${
                            i < currentLevel
                              ? "rgba(160,80,255,0.6)"
                              : "rgba(80,50,120,0.3)"
                          }`,
                          transition: "background 0.2s",
                        }}
                      />
                    ))}
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 11,
                        color: "#665577",
                        fontFamily: "'Share Tech Mono'",
                        alignSelf: "center",
                      }}
                    >
                      {currentLevel}/{upgrade.maxLevel}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {!isMaxed && (
                      <ActionButton
                        label={`BUY  ${upgrade.costPerLevel}🧬`}
                        disabled={!canAfford}
                        onClick={() => buyUpgrade(upgrade.id)}
                        color="#6030cc"
                        small
                      />
                    )}
                    {isMaxed && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "#60cc80",
                          fontFamily: "'Share Tech Mono'",
                          alignSelf: "center",
                          letterSpacing: "0.05em",
                        }}
                      >
                        ✓ MAXED
                      </span>
                    )}
                    {currentLevel > 0 &&
                      (isConfirmingDevolve ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <ActionButton
                            label="CONFIRM"
                            onClick={() => devolveGene(upgrade.id)}
                            color="#cc4010"
                            small
                          />
                          <ActionButton
                            label="CANCEL"
                            onClick={() => setConfirmDevolve(null)}
                            color="#444"
                            small
                          />
                        </div>
                      ) : (
                        <ActionButton
                          label={`DEVOLVE  +${upgrade.costPerLevel}🧬`}
                          onClick={() => setConfirmDevolve(upgrade.id)}
                          color="#553311"
                          small
                        />
                      ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Bottom bar - Start Run */}
      <div
        style={{
          width: "100%",
          padding: "14px 40px",
          borderTop: "1px solid rgba(120,60,200,0.25)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 20,
          flexShrink: 0,
          background: "rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ color: "#665588", fontSize: 13 }}>
          Active upgrades:{" "}
          {Object.values(meta.upgrades).reduce((a, b) => a + b, 0)}
        </div>
        <button
          onClick={onStartRun}
          style={{
            background: "linear-gradient(135deg, #5010a0 0%, #8030cc 100%)",
            border: "1px solid rgba(160,80,255,0.7)",
            color: "#fff",
            padding: "12px 48px",
            borderRadius: 8,
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.12em",
            cursor: "pointer",
            boxShadow: "0 0 24px rgba(120,40,255,0.35)",
            transition: "all 0.2s",
            textTransform: "uppercase",
          }}
          onMouseEnter={(e) => {
            ;(e.target as HTMLButtonElement).style.boxShadow =
              "0 0 40px rgba(140,60,255,0.6)"
            ;(e.target as HTMLButtonElement).style.transform = "scale(1.03)"
          }}
          onMouseLeave={(e) => {
            ;(e.target as HTMLButtonElement).style.boxShadow =
              "0 0 24px rgba(120,40,255,0.35)"
            ;(e.target as HTMLButtonElement).style.transform = "scale(1)"
          }}
        >
          ▶ START INFECTION
        </button>
      </div>
    </div>
  )
}

function StatBadge({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 22,
          color,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {value.toLocaleString()}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "#554466",
          letterSpacing: "0.1em",
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  )
}

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: "rgba(15,8,30,0.7)",
        border: "1px solid rgba(80,50,140,0.35)",
        borderRadius: 10,
        padding: "20px 22px",
        marginBottom: 16,
      }}
    >
      <h3
        style={{
          margin: "0 0 14px",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "#7050aa",
          fontFamily: "'Share Tech Mono', monospace",
          textTransform: "uppercase",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}

function ActionButton({
  label,
  onClick,
  disabled,
  color,
  small,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  color: string
  small?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "rgba(30,20,50,0.5)" : `${color}55`,
        border: `1px solid ${disabled ? "rgba(60,40,90,0.3)" : color + "aa"}`,
        color: disabled ? "#443355" : "#d0c0f8",
        padding: small ? "5px 12px" : "8px 18px",
        borderRadius: 5,
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: small ? 11 : 13,
        cursor: disabled ? "not-allowed" : "pointer",
        letterSpacing: "0.05em",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.target as HTMLButtonElement).style.background = `${color}88`
      }}
      onMouseLeave={(e) => {
        if (!disabled)
          (e.target as HTMLButtonElement).style.background = `${color}55`
      }}
    >
      {label}
    </button>
  )
}
