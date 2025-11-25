/**
 * Contacts API Route
 *
 * Handles listing all contacts and creating new contacts.
 *
 * GET  /api/contacts - List contacts with optional search and pagination
 * POST /api/contacts - Create a new contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGHLClient } from '@/lib/ghl-client';
import { GHLError, GHLValidationError } from '@/types/ghl';

// =============================================================================
// GET /api/contacts - List Contacts
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');
    const query = searchParams.get('query') || '';
    const locationId = searchParams.get('locationId') || undefined;

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

    // Get GHL client (will use mock data if no API key configured)
    const client = getGHLClient();

    // Fetch contacts
    const result = await client.getContacts({
      limit,
      skip,
      query,
      locationId,
    });

    // Return successful response
    return NextResponse.json({
      success: true,
      data: result.contacts,
      meta: {
        total: result.total,
        count: result.count,
        limit,
        skip,
      },
      usingMockData: client.isUsingMockData(),
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);

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

// =============================================================================
// POST /api/contacts - Create Contact
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.firstName || typeof body.firstName !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'firstName is required and must be a string',
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (body.email && typeof body.email === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Invalid email format',
              code: 'VALIDATION_ERROR',
            },
          },
          { status: 400 }
        );
      }
    }

    // Validate phone format if provided
    if (body.phone && typeof body.phone === 'string') {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(body.phone.replace(/[\s\-\(\)]/g, ''))) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: 'Invalid phone format (use E.164 format: +1234567890)',
              code: 'VALIDATION_ERROR',
            },
          },
          { status: 400 }
        );
      }
    }

    // Get GHL client
    const client = getGHLClient();

    // Create contact
    const contact = await client.createContact({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      tags: body.tags,
      source: body.source,
      customFields: body.customFields,
      address1: body.address1,
      city: body.city,
      state: body.state,
      postalCode: body.postalCode,
      country: body.country,
      companyName: body.companyName,
      website: body.website,
    });

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: contact,
        usingMockData: client.isUsingMockData(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating contact:', error);

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
