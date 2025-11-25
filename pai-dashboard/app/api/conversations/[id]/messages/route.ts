/**
 * Messages API Route
 *
 * Handles listing and sending messages in a conversation.
 *
 * GET  /api/conversations/[id]/messages - Get messages for a conversation
 * POST /api/conversations/[id]/messages - Send a new message
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGHLClient } from '@/lib/ghl-client';
import { GHLError, GHLNotFoundError, GHLValidationError } from '@/types/ghl';

// =============================================================================
// GET /api/conversations/[id]/messages - Get Messages
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: conversationId } = params;

    if (!conversationId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Conversation ID is required',
            code: 'MISSING_ID',
          },
        },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '50');
    const lastMessageId = searchParams.get('lastMessageId') || undefined;

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

    // Get GHL client
    const client = getGHLClient();

    // Fetch messages
    const result = await client.getMessages({
      conversationId,
      limit,
      lastMessageId,
    });

    // Return successful response
    return NextResponse.json({
      success: true,
      data: result.messages,
      meta: {
        total: result.total,
        count: result.count,
        limit,
      },
      usingMockData: client.isUsingMockData(),
    });
  } catch (error) {
    console.error(`Error fetching messages for conversation ${params.id}:`, error);

    // Handle not found errors
    if (error instanceof GHLNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: 'NOT_FOUND',
          },
        },
        { status: 404 }
      );
    }

    // Handle other GHL errors
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

// =============================================================================
// POST /api/conversations/[id]/messages - Send Message
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: conversationId } = params;

    if (!conversationId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Conversation ID is required',
            code: 'MISSING_ID',
          },
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.message || typeof body.message !== 'string' || body.message.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'message is required and must be a non-empty string',
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 }
      );
    }

    if (!body.type || !['SMS', 'Email', 'WhatsApp'].includes(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'type is required and must be one of: SMS, Email, WhatsApp',
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 }
      );
    }

    // Validate email-specific fields
    if (body.type === 'Email') {
      if (!body.subject || typeof body.subject !== 'string') {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'subject is required for email messages',
              code: 'VALIDATION_ERROR',
            },
          },
          { status: 400 }
        );
      }
    }

    // Get GHL client
    const client = getGHLClient();

    // Send message
    const message = await client.sendMessage(conversationId, {
      type: body.type,
      message: body.message.trim(),
      contactId: body.contactId,
      subject: body.subject,
      html: body.html,
      attachments: body.attachments,
    });

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: message,
        usingMockData: client.isUsingMockData(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`Error sending message to conversation ${params.id}:`, error);

    // Handle not found errors
    if (error instanceof GHLNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: 'NOT_FOUND',
          },
        },
        { status: 404 }
      );
    }

    // Handle validation errors
    if (error instanceof GHLValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error.message,
            code: error.code,
            details: error.details,
          },
        },
        { status: 400 }
      );
    }

    // Handle other GHL errors
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
