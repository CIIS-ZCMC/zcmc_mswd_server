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
