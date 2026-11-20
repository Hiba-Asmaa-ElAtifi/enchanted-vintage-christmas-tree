import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, Preload } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { CodedChristmasScene } from './experience/CodedChristmasScene'
import './App.css'

const MUSIC_PATH = '/audio/carol-of-the-bells.mp3'

function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [started, setStarted] = useState(false)
  const [muted, setMuted] = useState(true)
  const [audioUnavailable, setAudioUnavailable] = useState(false)
  const [wishId, setWishId] = useState(0)

  useEffect(() => {
    const audio = new Audio(MUSIC_PATH)
    audio.loop = true
    audio.volume = 0.55
    audio.preload = 'metadata'
    audioRef.current = audio
    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  const startExperience = useCallback(() => {
    if (started) return

    const audio = audioRef.current
    if (audio) {
      audio.currentTime = 0
      void audio
        .play()
        .then(() => setMuted(false))
        .catch(() => setAudioUnavailable(true))
    }

    setStarted(true)
  }, [started])

  const toggleAudio = useCallback(async () => {
    const audio = audioRef.current
    if (!audio || audioUnavailable) return
    if (muted) {
      try {
        await audio.play()
        setMuted(false)
      } catch {
        setAudioUnavailable(true)
      }
    } else {
      audio.pause()
      setMuted(true)
    }
  }, [audioUnavailable, muted])

  return (
    <main className="experience-shell">
      {started && (
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 0.95, 13], fov: 40, near: 0.1, far: 80 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <fog attach="fog" args={['#160f14', 15, 34]} />
          <Suspense fallback={null}>
            <CodedChristmasScene wishId={wishId} />
            <EffectComposer multisampling={0}>
              <Bloom intensity={0.75} luminanceThreshold={0.68} mipmapBlur />
              <Vignette eskil={false} offset={0.18} darkness={0.62} />
            </EffectComposer>
            <Preload all />
          </Suspense>
          <AdaptiveDpr pixelated />
        </Canvas>
      )}

      {!started && (
        <button className="start-experience" type="button" onClick={startExperience}>
          <span>Click anywhere to begin</span>
        </button>
      )}

      {started && (
        <p className="christmas-message" aria-label="Merry Christmas">
          Merry Christmas
        </p>
      )}

      {started && <nav className="experience-controls" aria-label="Experience controls">
        <button className="wish-button" type="button" onClick={() => setWishId((id) => id + 1)}>
          <span aria-hidden="true">✦</span>
          Make a Wish
        </button>
        <button
          className="icon-button"
          type="button"
          onClick={toggleAudio}
          disabled={audioUnavailable}
          aria-label={audioUnavailable ? 'Music file not added yet' : muted ? 'Play music' : 'Pause music'}
          title={audioUnavailable ? 'Add the licensed track to public/audio/carol-of-the-bells.mp3' : undefined}
        >
          <span aria-hidden="true">{audioUnavailable ? '♩' : muted ? '♪' : '♫'}</span>
        </button>
      </nav>}

      <div className="corner-flourish corner-flourish--left" aria-hidden="true" />
      <div className="corner-flourish corner-flourish--right" aria-hidden="true" />
    </main>
  )
}

export default App
