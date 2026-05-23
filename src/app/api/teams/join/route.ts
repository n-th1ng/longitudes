import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTeamByInviteCode } from '@/lib/api';
import { db, initDB } from '@/lib/db';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  await initDB();
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { inviteCode } = await request.json();
  
  const team = await getTeamByInviteCode(inviteCode);
  if (!team) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
  }
  
  // Check if already a member
  const existing = await db.execute({
    sql: 'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
    args: [(team as any).id, (session.user as any).id],
  });
  
  if (existing.rows.length) {
    return NextResponse.json({ error: 'Already a member' }, { status: 400 });
  }
  
  // Add to team
  await db.execute({
    sql: 'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
    args: [(team as any).id, (session.user as any).id, 'member'],
  });
  
  return NextResponse.json({ success: true, team });
}