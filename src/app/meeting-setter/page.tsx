'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, addHours, startOfDay } from 'date-fns';

interface Member {
  id: string;
  name: string;
  timezone: string;
  working_hours: string;
}

interface Meeting {
  id: string;
  title: string;
  start_time: string;
  duration_minutes: number;
  status: string;
}

function MeetingSetterContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get('team');
  
  const [members, setMembers] = useState<Member[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [selectedTime, setSelectedTime] = useState(9); // Start at 9 AM UTC
  const [loading, setLoading] = useState(true);
  
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    else if (status === 'authenticated' && teamId) loadData();
  }, [status, teamId]);

  const loadData = async () => {
    try {
      const [membersRes, meetingsRes] = await Promise.all([
        fetch(`/api/teams/${teamId}/members`),
        fetch(`/api/teams/${teamId}/meetings`),
      ]);
      const membersData = await membersRes.json();
      const meetingsData = await meetingsRes.json();
      setMembers(membersData.members || []);
      setMeetings(meetingsData.meetings || []);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart(e.clientX);
    const windowWidth = (duration / 60) * 80; // 80px per hour
    setDragOffset(selectedTime * 80);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart;
    const newOffset = Math.max(0, Math.min(24 * 80 - (duration / 60) * 80, dragOffset + dx));
    setSelectedTime(newOffset / 80);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const createMeeting = async () => {
    if (!title.trim()) return;
    
    const startTime = new Date();
    startTime.setUTCHours(Math.floor(selectedTime), (selectedTime % 1) * 60, 0, 0);
    
    try {
      const res = await fetch(`/api/teams/${teamId}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          startTime: startTime.toISOString(),
          durationMinutes: duration,
        }),
      });
      
      if (res.ok) {
        setTitle('');
        loadData();
      }
    } catch (err) {
      console.error('Failed to create meeting:', err);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="min-h-screen bg-[#131313]">
      {/* Top nav */}
      <nav className="h-16 border-b border-white/5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard')} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
              <span className="text-lg">🌐</span>
            </div>
            <span className="font-semibold text-white">Longitudes</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">UTC</span>
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <span className="text-sm text-purple-400">{session?.user?.name?.[0] || 'U'}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Schedule Meeting</h1>
          <p className="text-gray-400 mt-1">Drag the time window to find the perfect slot for your team</p>
        </div>

        {/* Timeline */}
        <div className="glass-panel rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">24h UTC Timeline</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">Duration: {duration}min</span>
              <div className="flex gap-1">
                {[30, 60, 90, 120].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      duration === d
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline header */}
          <div className="flex mb-2 ml-24">
            {hours.filter((_, i) => i % 2 === 0).map((hour) => (
              <div key={hour} className="flex-1 text-center text-xs text-gray-500">
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Timeline body */}
          <div 
            ref={timelineRef}
            className="relative h-48 bg-white/[0.02] rounded-xl overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Hour grid */}
            <div className="absolute inset-0 flex">
              {hours.map((hour) => (
                <div key={hour} className={`flex-1 border-l ${hour % 6 === 0 ? 'border-white/10' : 'border-white/5'}`} />
              ))}
            </div>

            {/* Current time indicator */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-purple-500 z-20"
              style={{ left: `${(new Date().getHours() + new Date().getMinutes() / 60) * 80}px` }}
            />

            {/* Draggable window */}
            <div
              className={`absolute top-4 bottom-4 bg-gradient-to-r from-purple-600/40 to-purple-500/40 border-2 border-purple-400 rounded-lg cursor-grab z-10 ${
                isDragging ? 'cursor-grabbing shadow-lg shadow-purple-500/30' : ''
              }`}
              style={{
                left: `${selectedTime * 80}px`,
                width: `${(duration / 60) * 80}px`,
              }}
              onMouseDown={handleMouseDown}
            >
              <div className="absolute inset-y-0 left-2 flex items-center">
                <span className="text-purple-300 text-sm font-medium">
                  {String(Math.floor(selectedTime)).padStart(2, '0')}:{String(Math.round((selectedTime % 1) * 60)).padStart(2, '0')}
                </span>
              </div>
              <div className="absolute inset-y-0 right-2 flex items-center">
                <span className="text-purple-300 text-sm">
                  +{duration}m
                </span>
              </div>
            </div>

            {/* Team members availability */}
            <div className="absolute top-16 left-0 right-0 space-y-2 px-4">
              {members.slice(0, 4).map((member, idx) => {
                const workingHours = JSON.parse(member.working_hours || '{}');
                return (
                  <div key={member.id} className="flex items-center gap-4">
                    <div className="w-20 text-xs text-gray-400 truncate">{member.name.split(' ')[0]}</div>
                    <div className="flex-1 relative h-6 bg-white/[0.03] rounded">
                      {Object.entries(workingHours).slice(0, 5).map(([day, hours]: [string, any]) => {
                        const startHour = parseInt(hours.start.split(':')[0]);
                        const endHour = parseInt(hours.end.split(':')[0]);
                        return (
                          <div
                            key={day}
                            className="absolute top-1 bottom-1 bg-green-500/20 border border-green-500/30 rounded"
                            style={{
                              left: `${(startHour / 24) * 100}%`,
                              width: `${((endHour - startHour) / 24) * 100}%`,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-500/40 border border-purple-400" />
              <span>Selected slot</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" />
              <span>Working hours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 bg-purple-500" />
              <span>Current time</span>
            </div>
          </div>
        </div>

        {/* Meeting details */}
        <div className="glass-panel rounded-2xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">Meeting Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Weekly standup, Q4 planning, etc."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Selected Time (UTC)</label>
              <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white">
                {String(Math.floor(selectedTime)).padStart(2, '0')}:{String(Math.round((selectedTime % 1) * 60)).padStart(2, '0')} - 
                {String(Math.floor(selectedTime + duration / 60)).padStart(2, '0')}:{String(Math.round(((selectedTime + duration / 60) % 1) * 60)).padStart(2, '0')}
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={createMeeting}
              disabled={!title.trim()}
              className="px-6 py-3 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-500 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <span className="material-symbols-outlined">event</span>
              Confirm Meeting
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 font-medium hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Upcoming meetings */}
        {meetings.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-white mb-4">Upcoming Meetings</h3>
            <div className="space-y-3">
              {meetings.filter(m => m.status !== 'declined').slice(0, 5).map((meeting) => (
                <div key={meeting.id} className="glass-panel rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-purple-400">event</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{meeting.title}</h4>
                      <p className="text-sm text-gray-400">
                        {format(new Date(meeting.start_time), 'MMM d, yyyy • HH:mm')} UTC • {meeting.duration_minutes}min
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    meeting.status === 'confirmed' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {meeting.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function MeetingSetterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <MeetingSetterContent />
    </Suspense>
  );
}