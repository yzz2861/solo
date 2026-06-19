import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/useGameStore'
import { useStudentStore } from '@/store/useStudentStore'
import { useCaseStore } from '@/store/useCaseStore'
import CallStatusBar from '@/components/training/CallStatusBar'
import DialogueBubble from '@/components/training/DialogueBubble'
import InfoStatusBar from '@/components/training/InfoStatusBar'
import OptionPanel from '@/components/training/OptionPanel'
import type { Option, DialogueNode } from '@/types'
import { useEffect, useRef, useState } from 'react'

export default function Training() {
  const { scenarioId } = useParams<{ scenarioId: string }>()
  const navigate = useNavigate()
  const { scenarios } = useCaseStore()
  const { currentStudentId } = useStudentStore()
  const {
    startSession, selectOption, addDialogueLog, endSession,
    currentNodeId, confirmedInfoPoints, dialogueLogs,
    isTraining, allSessions, currentSession
  } = useGameStore()

  const [startTime] = useState(Date.now())
  const [showOptions, setShowOptions] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scenario = scenarios.find(s => s.id === scenarioId)

  useEffect(() => {
    if (!scenario || !currentStudentId) {
      navigate('/student')
      return
    }
    if (!isTraining) {
      startSession(currentStudentId, scenario.id, scenario.infoPoints)
      addDialogueLog('narrator', '📞 电梯困人紧急呼叫接入中...')
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [dialogueLogs])

  useEffect(() => {
    if (!scenario || !isTraining) return
    const node = scenario.nodes[currentNodeId]
    if (!node) return

    const timer = setTimeout(() => {
      if (node.speaker !== 'system' && node.speaker !== 'narrator' || dialogueLogs.length === 0) {
        if (node.speaker === 'passenger' || node.speaker === 'narrator') {
          addDialogueLog(node.speaker, node.text, undefined, undefined, node.passengerEmotion)
        }
      }

      if (node.isEnding) {
        const session = endSession(scenario.infoPoints)
        if (session) {
          setTimeout(() => navigate(`/student/report/${session.id}`), 2000)
        }
      } else {
        setShowOptions(true)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [currentNodeId, isTraining])

  if (!scenario) {
    return <div className="min-h-screen bg-[#0a1e30] flex items-center justify-center text-white">场景未找到</div>
  }

  const currentNode: DialogueNode | undefined = scenario.nodes[currentNodeId]

  const handleSelectOption = (option: Option) => {
    setShowOptions(false)
    addDialogueLog('system', option.text)
    selectOption(option, 'system', option.text, scenario.infoPoints)

    const nextNode = scenario.nodes[option.nextNodeId]
    if (nextNode && !nextNode.isEnding) {
      setTimeout(() => {
        addDialogueLog(nextNode.speaker, nextNode.text, undefined, undefined, nextNode.passengerEmotion)
      }, 600)
    } else if (nextNode?.isEnding) {
      setTimeout(() => {
        addDialogueLog('narrator', nextNode.text)
        const session = endSession(scenario.infoPoints)
        if (session) {
          setTimeout(() => navigate(`/student/report/${session.id}`), 2000)
        }
      }, 600)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a1e30] flex flex-col">
      <CallStatusBar startTime={startTime} scenarioTitle={scenario.title} />
      <InfoStatusBar infoPoints={scenario.infoPoints} confirmedIds={confirmedInfoPoints} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {dialogueLogs.map((log) => (
          <DialogueBubble
            key={log.id}
            speaker={log.speaker}
            text={log.text}
            isMissed={log.isMissed}
            missedInfoPointName={undefined}
            animate
          />
        ))}
      </div>

      {showOptions && currentNode && !currentNode.isEnding && (
        <OptionPanel
          options={currentNode.options}
          onSelect={handleSelectOption}
        />
      )}

      {currentNode?.isEnding && (
        <div className="p-6 text-center">
          <div className="inline-block px-6 py-3 bg-[#2EC4B6]/10 text-[#2EC4B6] rounded-xl border border-[#2EC4B6]/20 text-sm animate-pulse">
            正在生成培训报告...
          </div>
        </div>
      )}
    </div>
  )
}
