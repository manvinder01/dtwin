import { NextRequest, NextResponse } from 'next/server';
import { getLogs, clearLogs, LogEntry } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
  const category = searchParams.get('category') as LogEntry['category'] | undefined;

  const logs = getLogs(limit, category);

  return NextResponse.json({ logs });
}

export async function DELETE() {
  clearLogs();
  return NextResponse.json({ success: true, message: 'Logs cleared' });
}
