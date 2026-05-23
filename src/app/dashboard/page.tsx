'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Team {
  id: string;
  name: string;
  avatar_url: string | null;
  invite_code: string;
  member_count: number;
  meeting_count: number;
}

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchTeams();
    }
  }, [status, router]);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      setTeams(data.teams || []);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName }),
      });
      const data = await res.json();
      if (data.team) {
        setTeams([...teams, data.team]);
        setShowCreateModal(false);
        setNewTeamName('');
      }
    } catch (err) {
      console.error('Failed to create team:', err);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#131313]">
      {/* Top nav */}
      <nav className="h-16 border-b border-white/5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
            <span className="text-lg">🌐</span>
          </div>
          <span className="font-semibold text-white">Longitudes</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <span className="text-sm text-purple-400">{session?.user?.name?.[0] || 'U'}</span>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Sync Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage your teams and meetings across timezones</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-500 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Create Team
          </button>
        </div>

        {/* Teams grid */}
        {teams.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
              <span className="text-3xl">📅</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No teams yet</h3>
            <p className="text-gray-400 mb-6">Create your first team to start scheduling meetings across timezones</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-500 transition-colors"
            >
              Create Your First Team
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <div key={team.id} className="glass-panel rounded-2xl p-6 hover:bg-white/[0.06] transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                      <span className="text-xl">{team.name[0]}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{team.name}</h3>
                      <p className="text-sm text-gray-400">{(team as any).member_count || 0} members</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-gray-500">more_vert</span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400 mb-6">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">event</span>
                    <span>{(team as any).meeting_count || 0} meetings</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/meeting-setter?team=${team.id}`}
                    className="flex-1 py-2 rounded-lg bg-purple-600/20 text-purple-400 text-center text-sm font-medium hover:bg-purple-600/30 transition-colors"
                  >
                    Schedule
                  </Link>
                  <button className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 text-sm font-medium hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Join Team section */}
        <div className="mt-8 glass-panel rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Join Existing Team</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const code = (form.elements.namedItem('code') as HTMLInputElement).value;
            
            const res = await fetch('/api/teams/join', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ inviteCode: code }),
            });
            
            if (res.ok) {
              fetchTeams();
              form.reset();
            }
          }} className="flex gap-3">
            <input
              type="text"
              name="code"
              placeholder="Enter invite code"
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
            >
              Join Team
            </button>
          </form>
        </div>
      </main>

      {/* Create team modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-6">Create New Team</h2>
            <form onSubmit={createTeam}>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Team Name</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  placeholder="Alpha Prime"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-gray-400 font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-500 transition-colors"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}