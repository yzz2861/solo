import TopNav from '@/components/TopNav';
import ComplaintHeader from '@/components/ComplaintHeader';
import UploadZone from '@/components/UploadZone';
import AttachmentList from '@/components/AttachmentList';
import NamingListPanel from '@/components/NamingListPanel';
import BottomActionBar from '@/components/BottomActionBar';

export default function WorkbenchPage() {
  return (
    <div className="min-h-screen pb-24 flex flex-col">
      <TopNav />
      <main className="container flex-1 py-5 space-y-4">
        <ComplaintHeader />
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-7 space-y-4">
            <UploadZone />
            <AttachmentList />
          </div>
          <div className="xl:col-span-5 min-h-[560px] xl:sticky xl:top-20 xl:self-start">
            <NamingListPanel />
          </div>
        </div>
      </main>
      <BottomActionBar />
    </div>
  );
}
