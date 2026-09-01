import { useEffect, useRef } from "react"
import type { GameState, MetaState } from "./gameTypes"
import { createInitialState, tickGame, applyUpgrade } from "./gameLogic"
import {
  drawBackground,
  drawPlayer,
  drawEnemy,
  drawProjectile,
  drawDNAPickup,
  drawPseudopod,
  drawParticle,
  drawHUD,
  drawUpgradeChoices,
  drawDeathScreen,
  drawPuddle,
  drawWall,
} from "./renderer"
import { WEAPON_DEFS } from "./weaponDefs"
import arenaMusic from "../imports/06 - Arena.mp3"

interface GameProps {
  meta: MetaState
  onRunEnd: (dnaEarned: number) => void
}

export default function Game({ meta, onRunEnd }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameStateRef = useRef<GameState | null>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const dashPressedRef = useRef(false)
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const hoveredUpgradeRef = useRef(-1)
  const runEndedRef = useRef(false)

  useEffect(() => {
    // Music
    const audio = new Audio(arenaMusic)
    audio.loop = true
    audio.volume = 0.45
    const playPromise = audio.play()
    if (playPromise) playPromise.catch(() => {})

    const getSize = () => ({ w: window.innerWidth, h: window.innerHeight })

    const initCanvas = () => {
      const { w, h } = getSize()
      const canvas = canvasRef.current!
      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext("2d")!
      ctx.scale(dpr, dpr)
      return { w, h }
    }

    const { w, h } = initCanvas()
    runEndedRef.current = false
    gameStateRef.current = createInitialState(w, h, meta)

    const handleKey = (e: KeyboardEvent) => {
      if (e.type === "keydown") {
        keysRef.current.add(e.code)

        // Dash on Space
        if (e.code === "Space") {
          e.preventDefault()
          dashPressedRef.current = true
        }

        const gs = gameStateRef.current
        if (gs?.status === "upgrade_choice") {
          const idx = ["Digit1", "Digit2", "Digit3"].indexOf(e.code)
          if (idx >= 0 && idx < gs.upgradeChoices.length)
            applyUpgrade(gs, gs.upgradeChoices[idx])
        }
        if (
          e.code === "KeyR" &&
          gs?.status === "dead" &&
          !runEndedRef.current
        ) {
          runEndedRef.current = true
          onRunEnd(gs.player.dnaThisRun)
        }
      } else {
        keysRef.current.delete(e.code)
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const gs = gameStateRef.current
      if (!gs || gs.status !== "upgrade_choice") return
      const canvas = canvasRef.current!
      const w2 = canvas.clientWidth,
        h2 = canvas.clientHeight
      const choices = gs.upgradeChoices
      const cardW = 180,
        cardH = 160,
        cardPad = 20
      const totalW = choices.length * (cardW + cardPad) - cardPad
      const startX = w2 / 2 - totalW / 2,
        cardY = h2 / 2 - 80
      let found = -1
      for (let i = 0; i < choices.length; i++) {
        const cx = startX + i * (cardW + cardPad)
        if (
          e.clientX >= cx &&
          e.clientX <= cx + cardW &&
          e.clientY >= cardY &&
          e.clientY <= cardY + cardH
        ) {
          found = i
          break
        }
      }
      hoveredUpgradeRef.current = found
    }

    const handleClick = (e: MouseEvent) => {
      const gs = gameStateRef.current
      if (!gs) return
      if (gs.status === "upgrade_choice") {
        const canvas = canvasRef.current!
        const w2 = canvas.clientWidth,
          h2 = canvas.clientHeight
        const choices = gs.upgradeChoices
        const cardW = 180,
          cardH = 160,
          cardPad = 20
        const totalW = choices.length * (cardW + cardPad) - cardPad
        const startX = w2 / 2 - totalW / 2,
          cardY = h2 / 2 - 80
        for (let i = 0; i < choices.length; i++) {
          const cx = startX + i * (cardW + cardPad)
          if (
            e.clientX >= cx &&
            e.clientX <= cx + cardW &&
            e.clientY >= cardY &&
            e.clientY <= cardY + cardH
          ) {
            applyUpgrade(gs, choices[i])
            break
          }
        }
      }
      if (gs.status === "dead" && !runEndedRef.current) {
        runEndedRef.current = true
        onRunEnd(gs.player.dnaThisRun)
      }
    }

    const handleResize = () => {
      const { w: nw, h: nh } = initCanvas()
      if (gameStateRef.current) {
        gameStateRef.current.canvasW = nw
        gameStateRef.current.canvasH = nh
      }
    }

    window.addEventListener("keydown", handleKey)
    window.addEventListener("keyup", handleKey)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("click", handleClick)
    window.addEventListener("resize", handleResize)

    // Main loop
    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = timestamp

      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const cw = canvas.clientWidth,
        ch = canvas.clientHeight

      let gs = gameStateRef.current
      if (!gs) {
        animFrameRef.current = requestAnimationFrame(loop)
        return
      }

      // Tick
      gs = tickGame(gs, dt, keysRef.current, dashPressedRef.current, null, meta)
      dashPressedRef.current = false // consume dash press
      gameStateRef.current = gs

      // Render
      ctx.clearRect(0, 0, cw, ch)
      ctx.save()
      ctx.translate(-Math.round(gs.camera.x), -Math.round(gs.camera.y))

      drawBackground(ctx, gs.camera, cw, ch)

      // Walls
      for (const wall of gs.walls) drawWall(ctx, wall, gs.gameTime)

      // Puddles
      for (const puddle of gs.puddles) drawPuddle(ctx, puddle)

      // DNA
      for (const pickup of gs.dnaPickups)
        drawDNAPickup(ctx, pickup, gs.gameTime)

      // Enemies
      for (const enemy of gs.enemies) drawEnemy(ctx, enemy, gs.gameTime)

      // Projectiles
      for (const proj of gs.projectiles) drawProjectile(ctx, proj)

      // Player
      drawPlayer(ctx, gs.player, gs.player.animTime)

      ctx.restore()

      // Pseudopod (screen space)
      if (gs.pseudopod) drawPseudopod(ctx, gs.pseudopod, gs.camera)

      // Membrane spikes
      ctx.save()
      ctx.translate(-Math.round(gs.camera.x), -Math.round(gs.camera.y))
      drawMembraneSpikeVisuals(ctx, gs)
      ctx.restore()

      // Particles
      ctx.save()
      ctx.translate(-Math.round(gs.camera.x), -Math.round(gs.camera.y))
      for (const p of gs.particles) drawParticle(ctx, p)
      ctx.restore()

      // HUD
      drawHUD(ctx, gs, cw, ch)

      // Overlays
      if (gs.status === "upgrade_choice") {
        drawUpgradeChoices(
          ctx,
          gs.upgradeChoices,
          cw,
          ch,
          hoveredUpgradeRef.current,
        )
      } else if (gs.status === "dead") {
        drawDeathScreen(ctx, gs, cw, ch)
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    lastTimeRef.current = performance.now()
    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      audio.pause()
      audio.src = ""
      window.removeEventListener("keydown", handleKey)
      window.removeEventListener("keyup", handleKey)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("click", handleClick)
      window.removeEventListener("resize", handleResize)
    }
  }, [meta, onRunEnd])

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        cursor: "crosshair",
        width: "100vw",
        height: "100vh",
      }}
    />
  )
}

function drawMembraneSpikeVisuals(
  ctx: CanvasRenderingContext2D,
  gs: GameState,
) {
  const p = gs.player
  const spikeWeapon = p.weapons.find((w) => w.id === "membrane_spike")
  if (!spikeWeapon) return
  const spikeCount = 2 + spikeWeapon.level
  const orbitR = WEAPON_DEFS["membrane_spike"].baseRange
  ctx.save()
  ctx.translate(p.pos.x, p.pos.y)
  for (let i = 0; i < spikeCount; i++) {
    const a = spikeWeapon.orbitAngle + (i / spikeCount) * Math.PI * 2
    ctx.save()
    ctx.translate(Math.cos(a) * orbitR, Math.sin(a) * orbitR)
    ctx.rotate(a + Math.PI / 4)
    ctx.beginPath()
    ctx.moveTo(0, -8)
    ctx.lineTo(4, 4)
    ctx.lineTo(0, 2)
    ctx.lineTo(-4, 4)
    ctx.closePath()
    ctx.save()
    ctx.shadowColor = "#40c8ff"
    ctx.shadowBlur = 12
    ctx.fillStyle = "#40c8ff"
    ctx.fill()
    ctx.restore()
    ctx.restore()
  }
  ctx.restore()
}
