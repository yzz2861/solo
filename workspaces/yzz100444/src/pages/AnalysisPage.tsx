import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, RefreshCw, ArrowLeft, Download } from 'lucide-react';
import { useProjectStore } from '../store/useProjectStore';
import PageLayout from '../components/layout/PageLayout';
import StatsBar from '../components/layout/StatsBar';
import PinnedTopics from '../components/topic/PinnedTopics';
import TopicList from '../components/topic/TopicList';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import Progress from '../components/common/Progress';
import EmptyState from '../components/common/EmptyState';
import Card from '../components/common/Card';

const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentProject, isProcessing, processingProgress, runClustering } = useProjectStore();

  if (!currentProject) {
    return (
      <PageLayout>
        <EmptyState
          title="未找到项目"
          description="请先导入数据并创建项目"
          action={{ label: '返回首页', onClick: () => navigate('/') }}
        />
      </PageLayout>
    );
  }

  const handleRecluster = async () => {
    await runClustering();
  };

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => navigate('/')}
            >
              返回
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 font-serif">
                {currentProject.name}
              </h1>
              <p className="text-sm text-neutral-500">聚类分析结果</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={handleRecluster}
              loading={isProcessing}
            >
              重新聚类
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={() => navigate('/export')}
            >
              导出报告
            </Button>
          </div>
        </div>

        {isProcessing && (
          <Card className="p-6 mb-6">
            <Loading text="正在运行聚类分析..." className="py-4" />
            <Progress
              value={processingProgress}
              showLabel
              className="mt-4"
            />
          </Card>
        )}

        {!isProcessing && (
          <>
            <StatsBar />

            {currentProject.topics.length === 0 ? (
              <EmptyState
                icon={<BarChart3 className="w-12 h-12 text-neutral-400" />}
                title="暂无聚类结果"
                description="请先导入数据并运行聚类分析"
                action={{ label: '运行聚类', onClick: handleRecluster }}
              />
            ) : (
              <>
                <PinnedTopics
                  topics={currentProject.topics}
                  answers={currentProject.answers}
                />
                <TopicList
                  topics={currentProject.topics.filter(t => !t.isPinned && !t.isRisk)}
                  answers={currentProject.answers}
                />
              </>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default AnalysisPage;
