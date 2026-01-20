import { NextRequest } from 'next/server';
import { getSettings, updateSettings, resetSettings } from '@/lib/settings';

export async function GET() {
  return Response.json(getSettings());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = updateSettings(body);
    return Response.json(updated);
  } catch (error) {
    return Response.json(
      { error: 'Failed to update settings' },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const reset = resetSettings();
  return Response.json(reset);
}
