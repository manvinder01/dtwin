import { NextResponse } from 'next/server';
import { getCacheStats, clearCache } from '@/lib/cache';

export async function GET() {
  try {
    const stats = await getCacheStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('[API/cache] Error getting stats:', error);
    return NextResponse.json(
      { error: 'Failed to get cache stats', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await clearCache();
    return NextResponse.json({ success: true, message: 'Cache cleared' });
  } catch (error: any) {
    console.error('[API/cache] Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache', details: error.message },
      { status: 500 }
    );
  }
}
