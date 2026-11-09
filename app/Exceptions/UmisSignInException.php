<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * A UMIS sign-in that cannot proceed. The message is safe to show the person on
 * the login page.
 */
class UmisSignInException extends RuntimeException {}
