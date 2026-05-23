import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createMeeting, getTeamMeetings, updateMeetingStatus } from '@/lib/api';
import { initDB } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB();
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const meetings = await getTeamMeetings(id);
  return NextResponse.json({ meetings });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB();
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { title, startTime, durationMinutes } = await request.json();
  
  const meeting = await createMeeting(
    id,
    title,
    startTime,
    durationMinutes || 60,
    (session.user as any).id
  );
  
  return NextResponse.json({ meeting });
}