import { db } from './db';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

export async function createUser(email: string, password: string, name: string) {
  const id = nanoid();
  const hash = await bcrypt.hash(password, 10);
  
  await db.execute({
    sql: 'INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
    args: [id, email, hash, name],
  });
  
  return { id, email, name };
}

export async function getUserByEmail(email: string) {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email],
  });
  return result.rows[0] || null;
}

export async function createTeam(name: string, ownerId: string) {
  const id = nanoid();
  const inviteCode = nanoid(8);
  
  await db.execute({
    sql: 'INSERT INTO teams (id, name, owner_id, invite_code) VALUES (?, ?, ?, ?)',
    args: [id, name, ownerId, inviteCode],
  });
  
  // Add owner as team member
  await db.execute({
    sql: 'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
    args: [id, ownerId, 'owner'],
  });
  
  return { id, name, inviteCode };
}

export async function getTeamByInviteCode(code: string) {
  const result = await db.execute({
    sql: 'SELECT * FROM teams WHERE invite_code = ?',
    args: [code],
  });
  return result.rows[0] || null;
}

export async function getUserTeams(userId: string) {
  const result = await db.execute({
    sql: `
      SELECT t.*, tm.role,
        (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
        (SELECT COUNT(*) FROM meetings WHERE team_id = t.id AND status = 'confirmed') as meeting_count
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = ?
      ORDER BY t.created_at DESC
    `,
    args: [userId],
  });
  return result.rows;
}

export async function getTeamMembers(teamId: string) {
  const result = await db.execute({
    sql: `
      SELECT u.id, u.name, u.email, u.avatar_url, u.timezone, tm.role, tm.working_hours
      FROM users u
      JOIN team_members tm ON u.id = tm.user_id
      WHERE tm.team_id = ?
    `,
    args: [teamId],
  });
  return result.rows;
}

export async function createMeeting(teamId: string, title: string, startTime: string, durationMinutes: number, createdBy: string) {
  const id = nanoid();
  
  await db.execute({
    sql: 'INSERT INTO meetings (id, team_id, title, start_time, duration_minutes, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    args: [id, teamId, title, startTime, durationMinutes, createdBy],
  });
  
  // Add all team members as participants
  const members = await db.execute({
    sql: 'SELECT user_id FROM team_members WHERE team_id = ?',
    args: [teamId],
  });
  
  for (const member of members.rows) {
    await db.execute({
      sql: 'INSERT INTO meeting_participants (meeting_id, user_id) VALUES (?, ?)',
      args: [id, (member as any).user_id],
    });
  }
  
  return { id };
}

export async function getTeamMeetings(teamId: string) {
  const result = await db.execute({
    sql: `
      SELECT m.*, u.name as creator_name,
        (SELECT COUNT(*) FROM meeting_participants WHERE meeting_id = m.id) as participant_count,
        (SELECT COUNT(*) FROM meeting_participants WHERE meeting_id = m.id AND status = 'confirmed') as confirmed_count
      FROM meetings m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.team_id = ?
      ORDER BY m.start_time ASC
    `,
    args: [teamId],
  });
  return result.rows;
}

export async function updateWorkingHours(userId: string, teamId: string, workingHours: string) {
  await db.execute({
    sql: 'UPDATE team_members SET working_hours = ? WHERE user_id = ? AND team_id = ?',
    args: [workingHours, userId, teamId],
  });
}

export async function updateMeetingStatus(meetingId: string, userId: string, status: 'confirmed' | 'declined') {
  await db.execute({
    sql: 'UPDATE meeting_participants SET status = ?, responded_at = datetime("now") WHERE meeting_id = ? AND user_id = ?',
    args: [status, meetingId, userId],
  });
  
  // If all confirmed, update meeting status
  const participants = await db.execute({
    sql: 'SELECT COUNT(*) as total, SUM(CASE WHEN status = \'confirmed\' THEN 1 ELSE 0 END) as confirmed FROM meeting_participants WHERE meeting_id = ?',
    args: [meetingId],
  });
  
  const p = participants.rows[0] as any;
  if (p.total === p.confirmed) {
    await db.execute({
      sql: 'UPDATE meetings SET status = ? WHERE id = ?',
      args: ['confirmed', meetingId],
    });
  }
}