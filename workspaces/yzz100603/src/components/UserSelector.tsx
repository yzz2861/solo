import { User, ChevronDown, LogIn } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useState } from 'react';
import type { User as UserType } from '@/types';

export function UserSelector() {
  const { currentUser, users, setCurrentUser } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);

  const admins = users.filter((u) => u.role === 'admin');
  const supervisors = users.filter((u) => u.role === 'supervisor');

  const handleSelect = (user: UserType) => {
    setCurrentUser(user);
    setIsOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsOpen(false);
  };

  if (!currentUser) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors"
        >
          <LogIn className="w-4 h-4" />
          <span>选择身份</span>
          <ChevronDown className="w-4 h-4" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
            <div className="p-2">
              <p className="text-xs text-gray-500 px-3 py-1">管理员</p>
              {admins.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className="w-full text-left px-3 py-2 hover:bg-sky-50 rounded-md text-gray-700 flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-sky-600" />
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.employeeId}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-gray-100 p-2">
              <p className="text-xs text-gray-500 px-3 py-1">主管</p>
              {supervisors.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className="w-full text-left px-3 py-2 hover:bg-sky-50 rounded-md text-gray-700 flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.employeeId}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentUser.role === 'supervisor' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
          }`}
        >
          <User className="w-4 h-4" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-gray-800">{currentUser.name}</p>
          <p className="text-xs text-gray-500">
            {currentUser.role === 'supervisor' ? '主管' : '管理员'} · {currentUser.employeeId}
          </p>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
          >
            切换身份
          </button>
        </div>
      )}
    </div>
  );
}
