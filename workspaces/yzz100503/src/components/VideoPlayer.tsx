import { useRef, useState, useEffect } from 'react'
import { X, Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Maximize, List, Star } from 'lucide-react'
import type { VideoSegment } from '@/types'
import { formatTime, parseTimeToSeconds } from '@/utils'

interface Props {
  src: string
  initialTime?: number
  segments?: VideoSegment[]
  onClose: () => void
}

export default function VideoPlayer({ src, initialTime = 0, segments = [], onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(initialTime)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [showSegments, setShowSegments] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      if (initialTime > 0) {
        video.currentTime = initialTime
        setCurrentTime(initialTime)
      }
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [src, initialTime])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current
    if (!video) return
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTime = percent * duration
    video.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (videoRef.current) {
      videoRef.current.volume = v
    }
    if (v > 0) setMuted(false)
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted
      setMuted(!muted)
    }
  }

  const skip = (seconds: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds))
  }

  const jumpToSegment = (segment: VideoSegment) => {
    const video = videoRef.current
    if (!video) return
    const time = parseTimeToSeconds(segment.timeStart)
    video.currentTime = time
    setCurrentTime(time)
    if (video.paused) {
      video.play()
    }
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const getCurrentSegment = (): VideoSegment | null => {
    for (const seg of segments) {
      const start = parseTimeToSeconds(seg.timeStart)
      const end = parseTimeToSeconds(seg.timeEnd)
      if (currentTime >= start && currentTime <= end) {
        return seg
      }
    }
    return null
  }

  const currentSegment = getCurrentSegment()
  const sortedSegments = [...segments].sort((a, b) => a.orderIndex - b.orderIndex)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div ref={containerRef} className="relative w-full max-w-5xl mx-4">
        <div className="bg-black rounded-xl overflow-hidden shadow-2xl">
          <div className="relative">
            <video
              ref={videoRef}
              src={`file://${src}`}
              className="w-full max-h-[70vh] bg-black"
              onClick={togglePlay}
            />

            {currentSegment && (
              <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                {currentSegment.starred && <Star className="w-4 h-4 text-yellow-400 fill-current" />}
                <span className="font-medium">{currentSegment.name}</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
              </button>
            )}
          </div>

          <div className="px-4 py-3 bg-gray-900">
            <div
              className="relative h-1.5 bg-gray-700 rounded-full cursor-pointer group"
              onClick={handleSeek}
            >
              <div
                className="absolute inset-y-0 left-0 bg-primary-500 rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              ></div>
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
              ></div>

              {sortedSegments.map((seg) => {
                const start = parseTimeToSeconds(seg.timeStart)
                const end = parseTimeToSeconds(seg.timeEnd)
                return (
                  <div
                    key={seg.id}
                    className="absolute top-0 bottom-0 bg-yellow-400/40 hover:bg-yellow-400/60 transition-colors"
                    style={{
                      left: `${(start / duration) * 100}%`,
                      width: `${((end - start) / duration) * 100}%`
                    }}
                    title={seg.name}
                  ></div>
                )
              })}
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => skip(-10)}
                  className="text-white/70 hover:text-white transition-colors"
                  title="后退10秒"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-primary-500 hover:bg-primary-600 text-white flex items-center justify-center transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <button
                  onClick={() => skip(10)}
                  className="text-white/70 hover:text-white transition-colors"
                  title="前进10秒"
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 ml-2">
                  <button onClick={toggleMute} className="text-white/70 hover:text-white">
                    {muted || volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 accent-primary-500"
                  />
                </div>
              </div>

              <div className="text-white/70 text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSegments(!showSegments)}
                  className={`p-2 rounded transition-colors ${
                    showSegments ? 'text-primary-400 bg-primary-500/20' : 'text-white/70 hover:text-white'
                  }`}
                  title="片段列表"
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 text-white/70 hover:text-white rounded transition-colors"
                  title="全屏"
                >
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {showSegments && sortedSegments.length > 0 && (
          <div className="mt-4 bg-gray-900 rounded-xl p-4 max-h-48 overflow-y-auto scrollbar-thin">
            <h4 className="text-white font-medium mb-3 text-sm">片段列表（点击跳转）</h4>
            <div className="grid grid-cols-2 gap-2">
              {sortedSegments.map((seg, idx) => {
                const isActive = currentSegment?.id === seg.id
                return (
                  <button
                    key={seg.id}
                    onClick={() => jumpToSegment(seg)}
                    className={`p-2.5 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-primary-500/30 border border-primary-500/50'
                        : 'bg-gray-800 hover:bg-gray-700 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-white/50 text-xs">#{idx + 1}</span>
                      {seg.starred && <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />}
                      <span className="text-white text-sm font-medium truncate">{seg.name}</span>
                    </div>
                    <div className="text-white/50 text-xs mt-1">
                      {seg.timeStart} - {seg.timeEnd}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
