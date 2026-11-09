<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    /*
    | Which sign-in staff use: `umis` (the ZCMC Portal hands users over) or
    | `iam` (ZCMC IAM). The other one's routes answer 404. The local super
    | admin's password sign-in works under either.
    */
    'auth_provider' => env('AUTH_PROVIDER', 'umis'),

    /*
    | UMIS — the hospital's user management system. Staff sign in on the ZCMC
    | Portal (the UMIS landing page) and pick MSWD there; UMIS sends them to
    | /signing-in/{session_id}, and this server swaps that id for the person
    | and their MSWD roles, server to server.
    */
    'umis' => [
        'base_url' => env('UMIS_API_URL', 'https://umis.zcmc.online'),
        // MSWD's key exactly as the UMIS "Manage Systems" screen shows it.
        'api_key' => env('UMIS_API_KEY'),
        // UMIS encrypts every API reply with its API_PAYLOAD_KEY.
        'payload_key' => env('UMIS_PAYLOAD_KEY'),
        // The code MSWD is registered under in UMIS; a reply for any other
        // system means the person has no MSWD access.
        'system_code' => env('UMIS_SYSTEM_CODE', 'MSWD'),
        // The landing page staff sign in on. Guests are sent here from /login,
        // and everyone is sent back here on logout.
        'portal_url' => env('UMIS_PORTAL_URL'),
        // How often a live session asks UMIS whether the person is still
        // signed in there (and picks up role changes).
        'recheck_minutes' => (int) env('UMIS_RECHECK_MINUTES', 5),
        'timeout' => (int) env('UMIS_TIMEOUT', 10),
        // UMIS role name => local role code or name. Names not listed are used
        // as they arrive; names that match no local role are dropped.
        'role_map' => [],
    ],

    /*
    | ZCMC IAM — the single sign-on every staff member uses to get in. The client
    | secret stays on the server; the browser only ever holds the PKCE verifier.
    */
    'iam' => [
        'base_url' => env('IAM_BASE_URL', 'https://iam.zcmc.online'),
        'client_id' => env('IAM_CLIENT_ID'),
        'client_secret' => env('IAM_CLIENT_SECRET'),
        'redirect_uri' => env('IAM_REDIRECT_URI'),
        // Oldest IAM sign-in (seconds) accepted without asking for the password
        // again. Null leaves it to IAM. Keep it short on shared ward terminals.
        'max_age' => env('IAM_MAX_AGE'),
        // Signing out here also ends the IAM session, so a shared terminal
        // cannot be walked up to and signed straight back in.
        'end_iam_session_on_logout' => env('IAM_END_SESSION_ON_LOGOUT', true),
        // IAM role name => local role name. Names not listed are used as they
        // arrive; names that match no local role are dropped, never created.
        'role_map' => [],
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
