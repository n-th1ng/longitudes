import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createTeam, getUserTeams } from '@/lib/api';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const teams = await getUserTeams((session.user as any).id);
  return NextResponse.json({ teams });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { name } = await request.json();
  if (!name) {
    return NextResponse.json({ error: 'Team name required' }, { status: 400 });
  }
  
  const team = await createTeam(name, (session.user as any).id);
  return NextResponse.json({ team });
}