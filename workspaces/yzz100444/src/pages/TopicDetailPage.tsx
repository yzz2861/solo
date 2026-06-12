import React from 'react';
import PageLayout from '../components/layout/PageLayout';
import TopicDetailView from '../components/detail/TopicDetailView';

const TopicDetailPage: React.FC = () => {
  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto">
        <TopicDetailView />
      </div>
    </PageLayout>
  );
};

export default TopicDetailPage;
