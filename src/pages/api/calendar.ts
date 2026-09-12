import type { APIRoute } from 'astro';
import { fetchWeeklyEconomicEvents } from '../../lib/economicCalendar';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const events = await fetchWeeklyEconomicEvents();
    return new Response(
      JSON.stringify({ 
        events, 
        updatedAt: Date.now() 
      }), 
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=900, s-maxage=900',
        },
      }
    );
  } catch (error: any) {
    console.error('[API /api/calendar] Error:', error);
    return new Response(
      JSON.stringify({ 
        events: [], 
        error: error?.message || 'Failed to fetch economic calendar' 
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
