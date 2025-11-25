/**
 * Single Contact API Route
 *
 * Handles operations on a specific contact by ID.
 *
 * GET    /api/contacts/[id] - Get contact by ID
 * PATCH  /api/contacts/[id] - Update contact
 * DELETE /api/contacts/[id] - Delete contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGHLClient } from '@/lib/ghl-client';
import { GHLError, GHLNotFoundError, GHLValidationError } from '@/types/ghl';

// =============================================================================
// GET /api/contacts/[id] - Get Contact by ID
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Contact ID is required',
            code: 'MISSING_ID',
          },
        },
        { status: 400 }
      );
    }

    // Get GHL client
    const client = getGHLClient();

    // Fetch contact
    const contact = await client.getContact(id);

    // Return successful response
    return NextResponse.json({
      success: true,
      data: contact,
      usingMockData: client.isUsingMockData(),
    });
  } catch (error) {
    console.error(`Error fetching contact ${params.id}:`, error);

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
// PATCH /api/contacts/[id] - Update Contact
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Contact ID is required',
            code: 'MISSING_ID',
          },
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Ensure at least one field is being updated
    const updateFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'tags',
      'customFields',
      'address1',
      'city',
      'state',
      'postalCode',
      'country',
      'companyName',
      'website',
    ];

    const hasUpdateFields = updateFields.some(field => body[field] !== undefined);

    if (!hasUpdateFields) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'At least one field must be provided for update',
            code: 'NO_UPDATE_FIELDS',
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

    // Update contact
    const contact = await client.updateContact(id, {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      tags: body.tags,
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
    return NextResponse.json({
      success: true,
      data: contact,
      usingMockData: client.isUsingMockData(),
    });
  } catch (error) {
    console.error(`Error updating contact ${params.id}:`, error);

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

// =============================================================================
// DELETE /api/contacts/[id] - Delete Contact
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Contact ID is required',
            code: 'MISSING_ID',
          },
        },
        { status: 400 }
      );
    }

    // Get GHL client
    const client = getGHLClient();

    // Delete contact
    await client.deleteContact(id);

    // Return successful response
    return NextResponse.json({
      success: true,
      message: `Contact ${id} deleted successfully`,
      usingMockData: client.isUsingMockData(),
    });
  } catch (error) {
    console.error(`Error deleting contact ${params.id}:`, error);

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
