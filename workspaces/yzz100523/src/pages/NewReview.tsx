import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { useReviewStore } from '../store/useReviewStore'
import { detectViolations } from '../lib/detectionEngine'
import { VIOLATION_META } from '../types'
import { ViolationTag } from '../components/Tags'

export default function NewReview() {
  const navigate = useNavigate()
  const { productLines, anchors, createSession } = useReviewStore()

  const [title, setTitle] = useState('')
  const [productLineId, setProductLineId] = useState(productLines[0]?.id ?? '')
  const [anchorId, setAnchorId] = useState(anchors[0]?.id ?? '')
  const [liveDate, setLiveDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [transcript, setTranscript] = useState('')
  const [isDetecting, setIsDetecting] = useState(false)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const charCount = transcript.length
  const valid = title.trim().length > 0 && transcript.trim().length > 0

  const previewTypeStats = useMemo(() => {
    if (!previewCount || !transcript) return null
    const vs = detectViolations(transcript)
    const map = new Map<string, number>()
    vs.forEach(v => map.set(v.type, (map.get(v.type) ?? 0) + 1))
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [transcript, previewCount])

  const handleFileUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = String(e.target?.result ?? '')
      setTranscript(text)
      if (!title) {
        setTitle(file.name.replace(/\.[^.]+$/, ''))
      }
    }
    reader.readAsText(file)
  }

  const handlePreview = () => {
    setIsDetecting(true)
    setTimeout(() => {
      setPreviewCount(detectViolations(transcript).length)
      setIsDetecting(false)
    }, 500)
  }

  const handleCreateAndReview = () => {
    if (!valid) return
    const session = createSession({
      title: title.trim(),
      productLineId,
      anchorId,
      liveDate,
      transcript,
      runDetection: true,
    })
    navigate(`/review/${session.id}`)
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">新建审查</h2>
        <p className="text-sm text-slate-500 mt-1">填写场次信息并导入讲解稿 / 回放转写文本，系统将自动检测违规</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 card p-6">
        <div>
          <label className="label">场次标题 <span className="text-risk-medium">*</span></label>
          <input
            className="input"
            placeholder="例如：618护肤专场·莉莉·20260618"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="label">直播日期 <span className="text-risk-medium">*</span></label>
          <input
            type="date"
            className="input"
            value={liveDate}
            onChange={e => setLiveDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">商品线 <span className="text-risk-medium">*</span></label>
          <select className="input" value={productLineId} onChange={e => setProductLineId(e.target.value)}>
            {productLines.map(pl => (
              <option key={pl.id} value={pl.id}>{pl.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">主播 <span className="text-risk-medium">*</span></label>
          <select className="input" value={anchorId} onChange={e => setAnchorId(e.target.value)}>
            {anchors.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <label className="label mb-1">讲解稿 / 回放转写文本 <span className="text-risk-medium">*</span></label>
            <p className="text-xs text-slate-500">
              支持粘贴纯文本，或上传 .txt 文件。SRT字幕格式也可识别。
              建议按行保留原顺序，方便定位。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${charCount > 50000 ? 'text-risk-medium' : 'text-slate-500'}`}>
              {charCount.toLocaleString()} 字符
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.srt,.vtt"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleFileUpload(f)
              }}
            />
            <button onClick={() => fileRef.current?.click()} className="btn-secondary text-sm !px-3 !py-1.5">
              📂 上传文件
            </button>
          </div>
        </div>
        <textarea
          className="input font-mono text-sm"
          rows={16}
          placeholder="在此粘贴讲解稿...&#10;&#10;例如：&#10;欢迎大家来到今天的直播间！这款面膜美白效果全网最低，史低价！&#10;用了3天就能祛斑，100%纯天然的顶级产品..."
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
        />

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-500 flex items-center gap-4">
            <button
              onClick={() => setTranscript(SAMPLE_TEXT)}
              className="text-brand-500 hover:underline text-xs"
            >
              📝 填充示例文本（护肤专场）
            </button>
          </div>
          <button
            onClick={handlePreview}
            disabled={!transcript.trim() || isDetecting}
            className="btn-secondary text-sm"
          >
            {isDetecting ? '🔍 检测中...' : '🔍 试检测违规（仅预览）'}
          </button>
        </div>
      </div>

      {previewTypeStats && (
        <div className="card p-6 bg-gradient-to-br from-amber-50/50 to-white border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800">📊 检测预览</h3>
              <p className="text-sm text-slate-500">
                初检发现共 <span className="font-bold text-risk-medium">{previewCount}</span> 处潜在违规，
                涵盖 <span className="font-bold">{previewTypeStats.length}</span> 个类型，最终以人工复核为准。
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {previewTypeStats.map(([t, n]) => (
              <div
                key={t}
                className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2"
              >
                <ViolationTag type={t as any} />
                <span className="text-sm font-bold text-slate-800">× {n}</span>
                <span className="w-px h-4 bg-slate-200 mx-1" />
                <span className="text-xs text-slate-500">{VIOLATION_META[t as keyof typeof VIOLATION_META].label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 sticky bottom-4 bg-white/80 backdrop-blur p-3 rounded-xl border border-slate-200 shadow-lg">
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost"
        >
          取消
        </button>
        <button
          onClick={handleCreateAndReview}
          disabled={!valid}
          className="btn-primary gap-2"
        >
          🚀 创建并开始审查
        </button>
      </div>
    </div>
  )
}

const SAMPLE_TEXT = `欢迎大家来到今天的直播间，我是主播莉莉！
今天给大家带来我们家的爆款面膜，这款面膜美白效果真的是全网最低的价格，史低价了姐妹们！
这款面膜用了3天就能祛斑，真的是100%纯天然无添加的顶级产品，是全网最好用的面膜。
开玩笑的啦，美白效果是因人而异，但是提亮肤色是真的肉眼可见。
有用户评论说，用了这个面膜第二天脸就好了，我只能说效果确实不错。
厂家说这款面膜能消炎杀菌，官方宣传是修复受损肌肤，但是我个人建议大家先做敏感测试。
我们今天买贵包退，差价双倍返还！如果不好用，不喜欢，7天无理由退钱！
等一下，口误口误，是按照平台的7天无理由退换货政策执行哦。
对了，点赞破10万我们免费送！大家抓紧！
免费送的是价值199元的精华小样，关注+点赞+评论就可以参与，明天下午6点开奖，一共20份。
这款面霜可以根治干燥敏感肌，药到病除，立竿见影的疗效，不管什么肤质都能治愈。
说错了说错了，纠正一下，是针对干燥肌肤有很好的舒缓和保湿作用。
它是国家级的研发团队研发的，全球顶级工艺，世界级品质，唯一的专利配方。
买一送一的活动，错过后悔一辈子，闭眼入，人手一件，抢疯了都！
比专柜便宜50块钱，真的是击穿底价，亏本清仓了，跳楼价给大家！
这款眼霜可以快速去除黑眼圈，无副作用，降血压的同时还能降血脂呢。
郑重声明啊，降血压降血脂是开玩笑的，眼霜怎么可能有这功能。
这款精华对减肥也有帮助，瘦身减脂效果很明显，增高也是有可能的哦。
我不能再说违规的了，大家理性下单，适合自己再买哈。
好的，最后5分钟，需要的姐妹抓紧下单，我们今天的活动就到这里了！`
