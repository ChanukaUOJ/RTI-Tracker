import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FileCode, Users, FileText, Activity, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useAsgardeo } from "@asgardeo/react";

export function Sidebar() {
  const { signOut } = useAsgardeo();
  const [isExpanded, setIsExpanded] = useState(true);

  const navItems = [
    { name: 'RTI Requests', path: '/rti-requests', icon: FileText },
    { name: 'Receivers', path: '/receivers', icon: Users },
    { name: 'Template Manager', path: '/templates', icon: FileCode },
    { name: 'Statuses', path: '/statuses', icon: Activity }
  ];

  return (
    <aside className={`${isExpanded ? 'w-64' : 'w-20'} flex-shrink-0 bg-white border-r border-gray-200 h-screen flex flex-col transition-all duration-300 ease-in-out relative group`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-blue-900 hover:border-blue-900 shadow-sm z-50 transition-all"
      >
        {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
        <div className={`p-4 border-b border-gray-200 flex items-center ${isExpanded ? 'justify-start' : 'justify-center'}`}>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-900 rounded flex-shrink-0 flex items-center justify-center">
              <span className="text-white text-xs font-bold">RTI</span>
            </div>
            {isExpanded && <span className="whitespace-nowrap transition-opacity duration-300">OpenRTITracker</span>}
          </h1>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                title={!isExpanded ? item.name : ''}
                className={({ isActive }) => `
                  flex items-center ${isExpanded ? 'gap-3 px-3' : 'justify-center'} py-2.5 text-sm font-medium rounded-lg border
                  transition-all duration-200
                  ${isActive ? 'bg-blue-50 text-blue-900 border-blue-200 shadow-sm' : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'}
                `}>
                <Icon className={`${isExpanded ? 'w-4 h-4' : 'w-5 h-5'} transition-all`} />
                {isExpanded && <span className="whitespace-nowrap overflow-hidden transition-opacity duration-300">{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 mt-auto">
          <button
            onClick={() => signOut()}
            title={!isExpanded ? 'Sign Out' : ''}
            className={`flex items-center ${isExpanded ? 'gap-3 px-3' : 'justify-center'} py-2.5 text-sm font-medium text-gray-600 rounded-lg border border-transparent hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all w-full`}
          >
            <LogOut className={`${isExpanded ? 'w-4 h-4' : 'w-5 h-5'}`} />
            {isExpanded && <span className="whitespace-nowrap overflow-hidden">Sign Out</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}