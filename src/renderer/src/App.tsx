import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProviders } from '@/providers';
import ChatPage from '@/pages/ChatPage';
import SettingsPage from '@/pages/SettingsPage';
import AgentsPage from '@/pages/AgentsPage';
import ResetPasswordInterface from '@/features/reset-password';
import { Toaster } from '@/components/ui/sonner';
import { SidebarLayout } from '@/components/sidebar';

// Fonts are now handled in globals.css via @font-face

export default function App() {
  return (
    <AppProviders>
      <Router>
        <SidebarLayout>
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/agents" element={<AgentsPage />} />
            <Route path="/reset-password" element={<ResetPasswordInterface />} />
          </Routes>
        </SidebarLayout>
        <Toaster />
      </Router>
    </AppProviders>
  );
}
