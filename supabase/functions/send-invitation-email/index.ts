// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// @ts-nocheck
import { corsHeaders } from '../_shared/cors.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const APP_URL = Deno.env.get('APP_URL')

interface InvitationEmailParams {
  email: string
  teamName: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { email, teamName }: InvitationEmailParams = await req.json();

    if (!email || !teamName) {
      throw new Error('Missing email or team name');
    }

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set');
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PentestGPT <noreply@pentestgpt.ai>',
        to: email,
        subject: `Invitation to join ${teamName}`,
        html: `
          <h1>You've been invited to join ${teamName}</h1>
          <p>Click the link below to accept the invitation:</p>
          <a href="${APP_URL}/login">Accept Invitation</a>
        `,
      }),
    });

    const data = await res.json();

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-invitation-email:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});