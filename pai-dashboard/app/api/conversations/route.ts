/**
 * Conversations API Route
 *
 * Handles listing conversations from GoHighLevel.
 *
 * GET /api/conversations - List conversations with optional filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGHLClient } from '@/lib/ghl-client';
import { GHLError } from '@/types/ghl';

// =============================================================================
// GET /api/conversations - List Conversations
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const locationId = searchParams.get('locationId') || process.env.GHL_LOCATION_ID || 'loc_1';
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');
    const assignedTo = searchParams.get('assignedTo') || undefined;
    const status = searchParams.get('status') as 'active' | 'closed' | 'pending' | undefined;

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Limit must be between 1 and 100',
            code: 'INVALID_LIMIT',
          },
        },
        { status: 400 }
      );
    }

    if (skip < 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Skip must be non-negative',
            code: 'INVALID_SKIP',
          },
        },
        { status: 400 }
      );
    }

    // Validate status parameter if provided
    if (status && !['active', 'closed', 'pending'].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Status must be one of: active, closed, pending',
            code: 'INVALID_STATUS',
          },
        },
        { status: 400 }
      );
    }

    // Get GHL client (will use mock data if no API key configured)
    const client = getGHLClient();

    // Fetch conversations
    const result = await client.getConversations({
      locationId,
      limit,
      skip,
      assignedTo,
      status,
    });

    // Return successful response
    return NextResponse.json({
      success: true,
      data: result.conversations,
      meta: {
        total: result.total,
        count: result.count,
        limit,
        skip,
      },
      usingMockData: client.isUsingMockData(),
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);

    // Handle specific GHL errors
    if (error instanceof GHLError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: error.code,
            details: error.details,
          },
        },
        { status: error.statusCode || 500 }
      );
    }

    // Handle unexpected errors
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    );
  }
}
