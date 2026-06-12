import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageLayout from '../components/layout/PageLayout';
import ExportPanel from '../components/export/ExportPanel';
import Button from '../components/common/Button';

const ExportPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate('/analysis')}
          >
            返回分析
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 font-serif">
              导出报告
            </h1>
            <p className="text-sm text-neutral-500">
              选择导出格式和内容，生成产品经理可读的分析报告
            </p>
          </div>
        </div>

        <ExportPanel />
      </div>
    </PageLayout>
  );
};

export default ExportPage;
