import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Save, FileText, Calculator } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import StepProgress from '@/components/StepProgress'
import BasicInfoCard from '@/components/BasicInfoCard'
import StandardWeightCard from '@/components/StandardWeightCard'
import EnvironmentCard from '@/components/EnvironmentCard'
import MeasurementTable from '@/components/MeasurementTable'
import ResultsPanel from '@/components/ResultsPanel'
import AlertCenter from '@/components/AlertCenter'
import type { CalibrationForm, Measurement, AlertItem } from '@/types'

const STEPS = ['基本信息', '标准砝码', '环境条件', '测量数据', '复核出证']

export default function CalibrationPage() {
  const navigate = useNavigate()
  const {
    form,
    customers,
    currentStep,
    setCurrentStep,
    computeAll,
    updateForm,
    setMeasurements,
    addMeasurement,
    removeMeasurement,
    saveAsNewCertificate,
  } = useStore()

  useEffect(() => {
    computeAll()
  }, [currentStep, computeAll])

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleCompute = () => {
    computeAll()
  }

  const handleSave = () => {
    computeAll()
    const certId = saveAsNewCertificate()
    navigate(`/report/${certId}`)
  }

  const handlePreview = () => {
    computeAll()
    const certId = saveAsNewCertificate()
    navigate(`/report/${certId}`)
  }

  const handleSaveToArchive = () => {
    computeAll()
    const certId = saveAsNewCertificate()
    navigate('/archive')
  }

  const handleBasicChange = <K extends keyof CalibrationForm>(key: K, value: CalibrationForm[K]) => {
    updateForm(key, value)
    computeAll()
  }

  const handleStandardWeightChange = (partial: Partial<CalibrationForm['standardWeight']>) => {
    updateForm('standardWeight', { ...form.standardWeight, ...partial })
    computeAll()
  }

  const handleEnvironmentChange = (partial: Partial<CalibrationForm['environment']>) => {
    updateForm('environment', { ...form.environment, ...partial })
    computeAll()
  }

  const handleSetMeasurements = (arr: Measurement[]) => {
    setMeasurements(arr)
    computeAll()
  }

  const handleAddMeasurement = (m: Measurement) => {
    addMeasurement(m)
    computeAll()
  }

  const handleRemoveMeasurement = (index: number) => {
    removeMeasurement(index)
    computeAll()
  }

  const handleLocateAlert = (alert: AlertItem) => {
    const field = alert.field
    if (field.includes('standardWeight') || field.includes('标准砝码') || field.includes('expiryDate') || field.includes('correctionValue')) {
      setCurrentStep(1)
    } else if (field.includes('environment') || field.includes('环境') || field.includes('temperature') || field.includes('humidity')) {
      setCurrentStep(2)
    } else if (field === 'measurements' || field.includes('测量') || field.includes('示值')) {
      setCurrentStep(3)
    } else {
      setCurrentStep(0)
    }
  }

  const renderStepCard = () => {
    switch (currentStep) {
      case 0:
        return (
          <BasicInfoCard
            form={form}
            customers={customers}
            onChange={handleBasicChange}
          />
        )
      case 1:
        return (
          <StandardWeightCard
            standardWeight={form.standardWeight}
            onChange={handleStandardWeightChange}
          />
        )
      case 2:
        return (
          <EnvironmentCard
            environment={form.environment}
            onChange={handleEnvironmentChange}
          />
        )
      case 3:
        return (
          <MeasurementTable
            measurements={form.measurements}
            onSetMeasurements={handleSetMeasurements}
            onAddMeasurement={handleAddMeasurement}
            onRemoveMeasurement={handleRemoveMeasurement}
          />
        )
      case 4:
        return (
          <div className="space-y-6">
            <ResultsPanel
              results={form.results}
              form={form}
              onSave={handleSaveToArchive}
              onPreview={handlePreview}
            />
            <AlertCenter alerts={form.alerts} onLocate={handleLocateAlert} />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full">
      <StepProgress steps={STEPS} currentStep={currentStep} />

      <div className="flex-1 grid grid-cols-3 gap-6 min-h-0 px-6">
        <div className="col-span-2 min-w-0 space-y-6 overflow-y-auto pb-6">
          {renderStepCard()}
        </div>

        <div className="col-span-1 w-full space-y-6 overflow-y-auto pb-6">
          {currentStep < 4 && (
            <>
              <ResultsPanel
                results={form.results}
                form={form}
                onSave={handleSaveToArchive}
                onPreview={handlePreview}
              />
              <AlertCenter alerts={form.alerts} onLocate={handleLocateAlert} />
            </>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={cn(
              'inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors',
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50',
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            上一步
          </button>

          {currentStep < STEPS.length - 2 ? (
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
            >
              下一步
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : currentStep === STEPS.length - 2 ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleCompute}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Calculator className="w-4 h-4" />
                计算结果
              </button>
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
              >
                下一步
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handlePreview}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                预览报告
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                保存并生成证书
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
